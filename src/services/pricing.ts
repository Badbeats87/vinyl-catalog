import { prisma } from '../db/client';
import type { PricingPolicy, PricingCalculationAudit } from '@prisma/client';

export interface PricingCalculationInput {
  releaseId: string;
  policy: PricingPolicy;
  conditionMedia: string;
  conditionSleeve: string;
  calculationType: 'buy_offer' | 'sell_price';
}

export interface PricingCalculationOutput {
  releaseId: string;
  policyId: string;
  policyVersion: number;
  offerPrice: number;
  listPrice: number;
  breakdown: CalculationBreakdown;
  requiresManualReview: boolean;
  marketSnapshotId?: string;
  auditLogId: string;
}

export interface CalculationBreakdown {
  marketSource: string;
  marketStat: string;
  baseMarketPrice: number | null;
  formulaPercentage: number;
  conditionAdjustment: number;
  mediaWeight: number;
  sleeveWeight: number;
  priceBeforeRounding: number;
  roundingIncrement: number;
  finalPrice: number;
  appliedCaps: {
    minCap: number | null;
    maxCap: number | null;
    cappedPrice: number;
  };
}

/**
 * Get the appropriate market price from snapshots based on policy config
 */
async function getMarketPrice(
  releaseId: string,
  policy: PricingPolicy,
  calculationType: 'buy_offer' | 'sell_price'
): Promise<{ price: number | null; snapshotId: string | null; source: string }> {
  const marketSource = calculationType === 'buy_offer' ? policy.buyMarketSource : policy.sellMarketSource;
  const marketStat = calculationType === 'buy_offer' ? policy.buyMarketStat : policy.sellMarketStat;

  // For hybrid, prefer discogs but fall back to ebay
  const sources = marketSource === 'hybrid' ? ['discogs', 'ebay'] : [marketSource];

  for (const source of sources) {
    const snapshot = await prisma.marketSnapshot.findUnique({
      where: {
        releaseId_source: {
          releaseId,
          source,
        },
      },
    });

    if (snapshot) {
      let price: number | null = null;

      if (marketStat === 'low' && snapshot.statLow) {
        price = snapshot.statLow;
      } else if (marketStat === 'median' && snapshot.statMedian) {
        price = snapshot.statMedian;
      } else if (marketStat === 'high' && snapshot.statHigh) {
        price = snapshot.statHigh;
      }

      if (price !== null && price > 0) {
        return { price, snapshotId: snapshot.id, source };
      }
    }
  }

  return { price: null, snapshotId: null, source: marketSource };
}

/**
 * Get condition tier adjustment
 */
async function getConditionAdjustment(
  conditionName: string
): Promise<{ mediaAdjustment: number; sleeveAdjustment: number } | null> {
  const tier = await prisma.conditionTier.findUnique({
    where: { name: conditionName },
  });

  if (!tier) {
    return null;
  }

  return {
    mediaAdjustment: tier.mediaAdjustment,
    sleeveAdjustment: tier.sleeveAdjustment,
  };
}

/**
 * Apply rounding increment to price
 */
function roundPrice(price: number, increment: number): number {
  if (increment <= 0) return price;
  return Math.round(price / increment) * increment;
}

/**
 * Apply min/max caps to price
 */
function applyCaps(price: number, minCap: number | null | undefined, maxCap: number | null | undefined): number {
  let cappedPrice = price;

  if (minCap !== null && minCap !== undefined && cappedPrice < minCap) {
    cappedPrice = minCap;
  }

  if (maxCap !== null && maxCap !== undefined && cappedPrice > maxCap) {
    cappedPrice = maxCap;
  }

  return cappedPrice;
}

/**
 * Calculate pricing (offer or list price) for a release
 * Returns both offer and list prices in a single calculation
 */
export async function calculatePricing(input: PricingCalculationInput): Promise<PricingCalculationOutput> {
  const { releaseId, policy, conditionMedia, conditionSleeve } = input;

  // Get market price
  const { price: baseMarketPrice, snapshotId: marketSnapshotId, source: marketSource } = await getMarketPrice(
    releaseId,
    policy,
    input.calculationType
  );

  // Check if we need manual review (missing data)
  const requiresManualReview = baseMarketPrice === null && policy.requiresManualReview;

  // Get condition adjustments
  let mediaAdjustment = 1.0;
  let sleeveAdjustment = 1.0;

  if (policy.applyConditionAdjustment) {
    const mediaCondition = await getConditionAdjustment(conditionMedia);
    const sleeveCondition = await getConditionAdjustment(conditionSleeve);

    if (mediaCondition) {
      mediaAdjustment = mediaCondition.mediaAdjustment;
    }
    if (sleeveCondition) {
      sleeveAdjustment = sleeveCondition.sleeveAdjustment;
    }
  }

  // Calculate condition-weighted adjustment
  const conditionAdjustment =
    mediaAdjustment * policy.mediaWeight + sleeveAdjustment * policy.sleeveWeight;

  // Determine formula percentage and stat type based on calculation type
  let formulaPercentage: number;
  let marketStat: string;
  let minCap: number | null | undefined;
  let maxCap: number | null | undefined;

  if (input.calculationType === 'buy_offer') {
    formulaPercentage = policy.buyPercentage;
    marketStat = policy.buyMarketStat;
    minCap = policy.buyMinCap;
    maxCap = policy.buyMaxCap;
  } else {
    formulaPercentage = policy.sellPercentage;
    marketStat = policy.sellMarketStat;
    minCap = policy.sellMinCap;
    maxCap = policy.sellMaxCap;
  }

  // Calculate price with fallback
  let priceBeforeRounding: number;

  if (baseMarketPrice !== null && baseMarketPrice > 0) {
    // Apply formula: market price * percentage * condition adjustment
    priceBeforeRounding = baseMarketPrice * formulaPercentage * conditionAdjustment;
  } else {
    // Fallback: use minimum cap if available, otherwise use a default fallback
    priceBeforeRounding = minCap || 0.5;
  }

  // Round price
  const priceAfterRounding = roundPrice(priceBeforeRounding, policy.roundingIncrement);

  // Apply caps
  const finalPrice = applyCaps(priceAfterRounding, minCap, maxCap);

  // Build calculation breakdown
  const breakdown: CalculationBreakdown = {
    marketSource: marketSource,
    marketStat,
    baseMarketPrice,
    formulaPercentage,
    conditionAdjustment,
    mediaWeight: policy.mediaWeight,
    sleeveWeight: policy.sleeveWeight,
    priceBeforeRounding,
    roundingIncrement: policy.roundingIncrement,
    finalPrice,
    appliedCaps: {
      minCap: minCap || null,
      maxCap: maxCap || null,
      cappedPrice: finalPrice,
    },
  };

  // Create audit log
  const auditLog = await prisma.pricingCalculationAudit.create({
    data: {
      releaseId,
      policyId: policy.id,
      marketSnapshotId: marketSnapshotId || null,
      calculationType: input.calculationType,
      conditionMedia,
      conditionSleeve,
      marketPrice: baseMarketPrice,
      calculatedPrice: finalPrice,
      calculationDetails: JSON.stringify(breakdown),
    },
  });

  return {
    releaseId,
    policyId: policy.id,
    policyVersion: policy.version,
    offerPrice: input.calculationType === 'buy_offer' ? finalPrice : 0, // Will be populated for buy offers
    listPrice: input.calculationType === 'sell_price' ? finalPrice : 0, // Will be populated for sell prices
    breakdown,
    requiresManualReview,
    marketSnapshotId: marketSnapshotId || undefined,
    auditLogId: auditLog.id,
  };
}

/**
 * Get full pricing quote (both offer and list price)
 * Returns a complete quote with all pricing information
 */
export async function getFullPricingQuote(
  releaseId: string,
  policy: PricingPolicy,
  conditionMedia: string,
  conditionSleeve: string
): Promise<{
  releaseId: string;
  policyId: string;
  policyVersion: number;
  buyOffer: number;
  sellListPrice: number;
  breakdown: {
    buy: CalculationBreakdown;
    sell: CalculationBreakdown;
  };
  requiresManualReview: boolean;
  auditLogs: { buy: string; sell: string };
}> {
  // Calculate buy offer
  const buyResult = await calculatePricing({
    releaseId,
    policy,
    conditionMedia,
    conditionSleeve,
    calculationType: 'buy_offer',
  });

  // Calculate sell price
  const sellResult = await calculatePricing({
    releaseId,
    policy,
    conditionMedia,
    conditionSleeve,
    calculationType: 'sell_price',
  });

  return {
    releaseId,
    policyId: policy.id,
    policyVersion: policy.version,
    buyOffer: buyResult.breakdown.finalPrice,
    sellListPrice: sellResult.breakdown.finalPrice,
    breakdown: {
      buy: buyResult.breakdown,
      sell: sellResult.breakdown,
    },
    requiresManualReview: buyResult.requiresManualReview || sellResult.requiresManualReview,
    auditLogs: {
      buy: buyResult.auditLogId,
      sell: sellResult.auditLogId,
    },
  };
}

/**
 * Get pricing audit logs for a release
 */
export async function getPricingAuditLogs(
  releaseId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  logs: Array<
    PricingCalculationAudit & {
      policy: PricingPolicy | null;
      marketSnapshot: any;
    }
  >;
  total: number;
}> {
  const logs = await prisma.pricingCalculationAudit.findMany({
    where: { releaseId },
    include: {
      policy: true,
      marketSnapshot: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.pricingCalculationAudit.count({
    where: { releaseId },
  });

  return { logs, total };
}

/**
 * Get pricing audit logs by policy
 */
export async function getPricingAuditLogsByPolicy(
  policyId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  logs: Array<
    PricingCalculationAudit & {
      release: any;
      marketSnapshot: any;
    }
  >;
  total: number;
}> {
  const logs = await prisma.pricingCalculationAudit.findMany({
    where: { policyId },
    include: {
      release: true,
      marketSnapshot: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.pricingCalculationAudit.count({
    where: { policyId },
  });

  return { logs, total };
}
