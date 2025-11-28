import { prisma } from '../db/client';
/**
 * Get the appropriate market price from snapshots based on policy config
 */
async function getMarketPrice(releaseId, policy, calculationType) {
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
            let price = null;
            if (marketStat === 'low' && snapshot.statLow) {
                price = snapshot.statLow;
            }
            else if (marketStat === 'median' && snapshot.statMedian) {
                price = snapshot.statMedian;
            }
            else if (marketStat === 'high' && snapshot.statHigh) {
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
async function getConditionAdjustment(conditionName) {
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
function roundPrice(price, increment) {
    if (increment <= 0)
        return price;
    return Math.round(price / increment) * increment;
}
/**
 * Apply min/max caps to price
 */
function applyCaps(price, minCap, maxCap) {
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
export async function calculatePricing(input) {
    const { releaseId, policy, conditionMedia, conditionSleeve } = input;
    // Get market price
    const { price: baseMarketPrice, snapshotId: marketSnapshotId, source: marketSource } = await getMarketPrice(releaseId, policy, input.calculationType);
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
    const conditionAdjustment = mediaAdjustment * policy.mediaWeight + sleeveAdjustment * policy.sleeveWeight;
    // Determine formula percentage and stat type based on calculation type
    let formulaPercentage;
    let marketStat;
    let minCap;
    let maxCap;
    if (input.calculationType === 'buy_offer') {
        formulaPercentage = policy.buyPercentage;
        marketStat = policy.buyMarketStat;
        minCap = policy.buyMinCap;
        maxCap = policy.buyMaxCap;
    }
    else {
        formulaPercentage = policy.sellPercentage;
        marketStat = policy.sellMarketStat;
        minCap = policy.sellMinCap;
        maxCap = policy.sellMaxCap;
    }
    // Calculate price with fallback
    let priceBeforeRounding;
    if (baseMarketPrice !== null && baseMarketPrice > 0) {
        // Apply formula: market price * percentage * condition adjustment
        priceBeforeRounding = baseMarketPrice * formulaPercentage * conditionAdjustment;
    }
    else {
        // Fallback: use minimum cap if available, otherwise use a default fallback
        priceBeforeRounding = minCap || 0.5;
    }
    // Round price
    const priceAfterRounding = roundPrice(priceBeforeRounding, policy.roundingIncrement);
    // Apply caps
    const finalPrice = applyCaps(priceAfterRounding, minCap, maxCap);
    // Build calculation breakdown
    const breakdown = {
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
export async function getFullPricingQuote(releaseId, policy, conditionMedia, conditionSleeve) {
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
export async function getPricingAuditLogs(releaseId, limit = 50, offset = 0) {
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
export async function getPricingAuditLogsByPolicy(policyId, limit = 50, offset = 0) {
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
//# sourceMappingURL=pricing.js.map