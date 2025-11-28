import { PrismaClient, PricingPolicy } from '@prisma/client';

const prisma = new PrismaClient();

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
 * Create a new pricing policy
 */
export async function createPricingPolicy(
  input: CreatePricingPolicyInput
): Promise<PricingPolicy> {
  // Validate media/sleeve weights sum to 1.0
  const mediaWeight = input.mediaWeight ?? 0.5;
  const sleeveWeight = input.sleeveWeight ?? 0.5;

  if (Math.abs((mediaWeight + sleeveWeight) - 1.0) > 0.001) {
    throw new Error('mediaWeight + sleeveWeight must equal 1.0');
  }

  // Validate scope value is provided when scope is not global
  if (input.scope !== 'global' && !input.scopeValue) {
    throw new Error(`scopeValue required for scope="${input.scope}"`);
  }

  // Validate percentages are within reasonable bounds
  if (input.buyPercentage && (input.buyPercentage < 0.01 || input.buyPercentage > 1.0)) {
    throw new Error('buyPercentage must be between 0.01 and 1.0');
  }
  if (input.sellPercentage && (input.sellPercentage < 1.0 || input.sellPercentage > 3.0)) {
    throw new Error('sellPercentage must be between 1.0 and 3.0');
  }

  return prisma.pricingPolicy.create({
    data: {
      ...input,
      mediaWeight,
      sleeveWeight,
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
 * Update a pricing policy
 */
export async function updatePricingPolicy(
  id: string,
  input: UpdatePricingPolicyInput
): Promise<PricingPolicy | null> {
  // Validate weights if provided
  const mediaWeight = input.mediaWeight;
  const sleeveWeight = input.sleeveWeight;

  if (mediaWeight !== undefined && sleeveWeight !== undefined) {
    if (Math.abs((mediaWeight + sleeveWeight) - 1.0) > 0.001) {
      throw new Error('mediaWeight + sleeveWeight must equal 1.0');
    }
  }

  // Validate percentages
  if (input.buyPercentage && (input.buyPercentage < 0.01 || input.buyPercentage > 1.0)) {
    throw new Error('buyPercentage must be between 0.01 and 1.0');
  }
  if (input.sellPercentage && (input.sellPercentage < 1.0 || input.sellPercentage > 3.0)) {
    throw new Error('sellPercentage must be between 1.0 and 3.0');
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
        ...input,
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
