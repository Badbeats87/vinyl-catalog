import { PricingPolicy } from '@prisma/client';
import { prisma } from '../db/client.js';
import {
  ValidationError,
  validatePolicyName,
  validateScope,
  validatePercentage,
  validateWeight,
  validateWeightSum,
  validatePrice,
  validateDays,
} from '../validation/inputs.js';

export interface CreatePricingPolicyInput {
  name: string;
  description?: string;
  scope: 'global' | 'genre' | 'release';
  scopeValue?: string;
  buyMarketSource?: string;
  buyMarketStat?: string;
  buyPercentage?: number;
  buyMinCap?: number;
  buyMaxCap?: number;
  offerExpiryDays?: number;
  sellMarketSource?: string;
  sellMarketStat?: string;
  sellPercentage?: number;
  sellMinCap?: number;
  sellMaxCap?: number;
  applyConditionAdjustment?: boolean;
  mediaWeight?: number;
  sleeveWeight?: number;
  roundingIncrement?: number;
  requiresManualReview?: boolean;
  profitMarginTarget?: number;
  isActive?: boolean;
}

export interface UpdatePricingPolicyInput {
  name?: string;
  description?: string;
  buyMarketSource?: string;
  buyMarketStat?: string;
  buyPercentage?: number;
  buyMinCap?: number;
  buyMaxCap?: number;
  offerExpiryDays?: number;
  sellMarketSource?: string;
  sellMarketStat?: string;
  sellPercentage?: number;
  sellMinCap?: number;
  sellMaxCap?: number;
  applyConditionAdjustment?: boolean;
  mediaWeight?: number;
  sleeveWeight?: number;
  roundingIncrement?: number;
  requiresManualReview?: boolean;
  profitMarginTarget?: number;
  isActive?: boolean;
}

/**
 * Create a new pricing policy with validation
 */
export async function createPricingPolicy(
  input: CreatePricingPolicyInput
): Promise<PricingPolicy> {
  // Validate inputs
  const name = validatePolicyName(input.name);
  const scope = validateScope(input.scope);

  // Validate scope value is provided when scope is not global
  if (scope !== 'global' && !input.scopeValue) {
    throw new ValidationError(`scopeValue required for scope="${scope}"`);
  }

  // Validate media/sleeve weights
  const mediaWeight = validateWeight(input.mediaWeight, 'mediaWeight') ?? 0.5;
  const sleeveWeight = validateWeight(input.sleeveWeight, 'sleeveWeight') ?? 0.5;
  validateWeightSum(mediaWeight, sleeveWeight);

  // Validate percentages
  const buyPercentage = validatePercentage(input.buyPercentage, 0.01, 1.0, 'buyPercentage') ?? 0.55;
  const sellPercentage = validatePercentage(input.sellPercentage, 1.0, 3.0, 'sellPercentage') ?? 1.25;

  // Validate prices
  const buyMinCap = validatePrice(input.buyMinCap, 'buyMinCap');
  const buyMaxCap = validatePrice(input.buyMaxCap, 'buyMaxCap');
  const sellMinCap = validatePrice(input.sellMinCap, 'sellMinCap');
  const sellMaxCap = validatePrice(input.sellMaxCap, 'sellMaxCap');

  // Validate cap relationships
  if (buyMinCap && buyMaxCap && buyMinCap > buyMaxCap) {
    throw new ValidationError('buyMinCap must be less than or equal to buyMaxCap');
  }
  if (sellMinCap && sellMaxCap && sellMinCap > sellMaxCap) {
    throw new ValidationError('sellMinCap must be less than or equal to sellMaxCap');
  }

  // Validate days
  const offerExpiryDays = validateDays(input.offerExpiryDays, 'offerExpiryDays') ?? 7;

  return prisma.pricingPolicy.create({
    data: {
      name,
      description: input.description,
      scope,
      scopeValue: input.scopeValue,
      buyMarketSource: input.buyMarketSource || 'discogs',
      buyMarketStat: input.buyMarketStat || 'median',
      buyPercentage,
      buyMinCap,
      buyMaxCap,
      offerExpiryDays,
      sellMarketSource: input.sellMarketSource || 'discogs',
      sellMarketStat: input.sellMarketStat || 'median',
      sellPercentage,
      sellMinCap,
      sellMaxCap,
      applyConditionAdjustment: input.applyConditionAdjustment ?? true,
      mediaWeight,
      sleeveWeight,
      roundingIncrement: input.roundingIncrement ?? 0.25,
      requiresManualReview: input.requiresManualReview ?? false,
      profitMarginTarget: input.profitMarginTarget,
      isActive: input.isActive ?? true,
    },
  });
}

/**
 * Get a pricing policy by ID
 */
export async function getPricingPolicyById(id: string): Promise<PricingPolicy | null> {
  return prisma.pricingPolicy.findUnique({
    where: { id },
  });
}

/**
 * Get the default global policy
 */
export async function getDefaultPolicy(): Promise<PricingPolicy | null> {
  return prisma.pricingPolicy.findFirst({
    where: {
      scope: 'global',
      scopeValue: null,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get active policies with pagination
 */
export async function getActivePolicies(skip = 0, take = 50): Promise<PricingPolicy[]> {
  return prisma.pricingPolicy.findMany({
    where: { isActive: true },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all policies (including inactive) with pagination
 */
export async function getAllPolicies(skip = 0, take = 50): Promise<PricingPolicy[]> {
  return prisma.pricingPolicy.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get policies by scope
 */
export async function getPoliciesByScope(
  scope: 'global' | 'genre' | 'release',
  limit = 50
): Promise<PricingPolicy[]> {
  return prisma.pricingPolicy.findMany({
    where: {
      scope,
      isActive: true,
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get policy for a specific genre
 */
export async function getPolicyForGenre(genre: string): Promise<PricingPolicy | null> {
  // First try genre-specific policy
  const genrePolicy = await prisma.pricingPolicy.findFirst({
    where: {
      scope: 'genre',
      scopeValue: genre,
      isActive: true,
    },
  });

  if (genrePolicy) {
    return genrePolicy;
  }

  // Fall back to default global policy
  return getDefaultPolicy();
}

/**
 * Get policy for a specific release
 */
export async function getPolicyForRelease(releaseId: string): Promise<PricingPolicy | null> {
  // First try release-specific policy
  const releasePolicy = await prisma.pricingPolicy.findFirst({
    where: {
      scope: 'release',
      scopeValue: releaseId,
      isActive: true,
    },
  });

  if (releasePolicy) {
    return releasePolicy;
  }

  // Fall back to default global policy
  return getDefaultPolicy();
}

/**
 * Update a pricing policy with validation
 */
export async function updatePricingPolicy(
  id: string,
  input: UpdatePricingPolicyInput
): Promise<PricingPolicy | null> {
  // Validate weights if provided
  const mediaWeight = validateWeight(input.mediaWeight, 'mediaWeight');
  const sleeveWeight = validateWeight(input.sleeveWeight, 'sleeveWeight');

  if (mediaWeight !== undefined && sleeveWeight !== undefined) {
    validateWeightSum(mediaWeight, sleeveWeight);
  }

  // Validate percentages
  const buyPercentage = validatePercentage(input.buyPercentage, 0.01, 1.0, 'buyPercentage');
  const sellPercentage = validatePercentage(input.sellPercentage, 1.0, 3.0, 'sellPercentage');

  // Validate prices
  const buyMinCap = validatePrice(input.buyMinCap, 'buyMinCap');
  const buyMaxCap = validatePrice(input.buyMaxCap, 'buyMaxCap');
  const sellMinCap = validatePrice(input.sellMinCap, 'sellMinCap');
  const sellMaxCap = validatePrice(input.sellMaxCap, 'sellMaxCap');

  // Validate cap relationships
  if (buyMinCap && buyMaxCap && buyMinCap > buyMaxCap) {
    throw new ValidationError('buyMinCap must be less than or equal to buyMaxCap');
  }
  if (sellMinCap && sellMaxCap && sellMinCap > sellMaxCap) {
    throw new ValidationError('sellMinCap must be less than or equal to sellMaxCap');
  }

  try {
    // Increment version when updating
    const current = await prisma.pricingPolicy.findUnique({
      where: { id },
    });

    if (!current) {
      return null;
    }

    return await prisma.pricingPolicy.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        buyMarketSource: input.buyMarketSource,
        buyMarketStat: input.buyMarketStat,
        buyPercentage,
        buyMinCap,
        buyMaxCap,
        offerExpiryDays: input.offerExpiryDays,
        sellMarketSource: input.sellMarketSource,
        sellMarketStat: input.sellMarketStat,
        sellPercentage,
        sellMinCap,
        sellMaxCap,
        applyConditionAdjustment: input.applyConditionAdjustment,
        mediaWeight,
        sleeveWeight,
        roundingIncrement: input.roundingIncrement,
        requiresManualReview: input.requiresManualReview,
        profitMarginTarget: input.profitMarginTarget,
        isActive: input.isActive,
        version: current.version + 1,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Record not found
      return null;
    }
    throw error;
  }
}

/**
 * Deactivate a pricing policy
 */
export async function deactivatePricingPolicy(id: string): Promise<PricingPolicy | null> {
  try {
    return await prisma.pricingPolicy.update({
      where: { id },
      data: { isActive: false },
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

/**
 * Delete a pricing policy (only if no references exist)
 */
export async function deletePricingPolicy(id: string): Promise<boolean> {
  try {
    await prisma.pricingPolicy.delete({
      where: { id },
    });
    return true;
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Record not found
      return false;
    }
    if (error.code === 'P2014') {
      // Foreign key constraint failed
      throw new Error('Cannot delete policy: it is referenced by other records');
    }
    throw error;
  }
}

/**
 * Get policy history (all versions)
 */
export async function getPolicyHistory(baseName: string): Promise<PricingPolicy[]> {
  return prisma.pricingPolicy.findMany({
    where: { name: baseName },
    orderBy: { version: 'asc' },
  });
}

/**
 * Count active policies
 */
export async function countActivePolicies(): Promise<number> {
  return prisma.pricingPolicy.count({
    where: { isActive: true },
  });
}

/**
 * Get policies requiring manual review
 */
export async function getPoliciesRequiringManualReview(): Promise<PricingPolicy[]> {
  return prisma.pricingPolicy.findMany({
    where: {
      requiresManualReview: true,
      isActive: true,
    },
  });
}

/**
 * Main function to run standalone tasks
 */
async function main() {
  const action = process.argv[2];
  const value = process.argv[3];

  console.log(`[Policies] Action: ${action}, Value: ${value}\n`);

  switch (action) {
    case 'list-active':
      const policies = await getActivePolicies(0, 100);
      console.log('Active Policies:', policies);
      break;
    case 'get-by-id':
      if (!value) {
        console.error('Error: Policy ID is required for get-by-id');
        return;
      }
      const policy = await getPricingPolicyById(value);
      console.log('Found Policy:', policy);
      break;
    case 'get-default':
      const defaultPolicy = await getDefaultPolicy();
      console.log('Default Policy:', defaultPolicy);
      break;
    case 'get-for-genre':
      if (!value) {
        console.error('Error: Genre is required for get-for-genre');
        return;
      }
      const genrePolicy = await getPolicyForGenre(value);
      console.log(`Policy for Genre "${value}":`, genrePolicy);
      break;
    default:
      console.log('Usage:');
      console.log('  - yarn exec:ts src/services/pricing-policies.ts list-active');
      console.log('  - yarn exec:ts src/services/pricing-policies.ts get-by-id <policy_id>');
      console.log('  - yarn exec:ts src/services/pricing-policies.ts get-default');
      console.log('  - yarn exec:ts src/services/pricing-policies.ts get-for-genre <genre_name>');
      break;
  }
}

main().catch((e) => {
  console.error('An unhandled error occurred:', e);
  process.exit(1);
});
