/**
 * Condition Discount Service
 * Manages per-condition pricing adjustments for policies
 */

import { prisma } from '../db/client.js';
import { ValidationError } from '../validation/inputs.js';

export interface ConditionDiscount {
  conditionTierId: string;
  conditionName: string;
  buyDiscountPercentage: number;
  sellDiscountPercentage: number;
}

/**
 * Get all condition discounts for a policy
 */
export async function getPolicyConditionDiscounts(policyId: string): Promise<ConditionDiscount[]> {
  const policy = await prisma.pricingPolicy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    throw new ValidationError('Pricing policy not found');
  }

  const discounts = await prisma.policyConditionDiscount.findMany({
    where: { policyId },
    include: {
      conditionTier: true,
    },
    orderBy: {
      conditionTier: {
        order: 'asc',
      },
    },
  });

  return discounts.map((d: any) => ({
    conditionTierId: d.conditionTierId,
    conditionName: d.conditionTier.name,
    buyDiscountPercentage: d.buyDiscountPercentage,
    sellDiscountPercentage: d.sellDiscountPercentage,
  }));
}

/**
 * Set condition discount for a policy
 */
export async function setConditionDiscount(
  policyId: string,
  conditionTierId: string,
  buyDiscountPercentage: number,
  sellDiscountPercentage: number
): Promise<void> {
  if (buyDiscountPercentage < 0 || buyDiscountPercentage > 100) {
    throw new ValidationError('Buy discount percentage must be between 0 and 100');
  }
  if (sellDiscountPercentage < 0 || sellDiscountPercentage > 100) {
    throw new ValidationError('Sell discount percentage must be between 0 and 100');
  }

  // Verify policy exists
  const policy = await prisma.pricingPolicy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    throw new ValidationError('Pricing policy not found');
  }

  // Verify condition tier exists
  const conditionTier = await prisma.conditionTier.findUnique({
    where: { id: conditionTierId },
  });

  if (!conditionTier) {
    throw new ValidationError('Condition tier not found');
  }

  // Upsert the discount
  await prisma.policyConditionDiscount.upsert({
    where: {
      policyId_conditionTierId: {
        policyId,
        conditionTierId,
      },
    },
    update: {
      buyDiscountPercentage,
      sellDiscountPercentage,
    },
    create: {
      policyId,
      conditionTierId,
      buyDiscountPercentage,
      sellDiscountPercentage,
    },
  });
}

/**
 * Bulk set condition discounts for a policy
 */
export async function setBulkConditionDiscounts(
  policyId: string,
  discounts: Array<{ conditionTierId: string; buyDiscountPercentage: number; sellDiscountPercentage: number }>
): Promise<void> {
  // Validate policy exists
  const policy = await prisma.pricingPolicy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    throw new ValidationError('Pricing policy not found');
  }

  // Validate and set each discount
  for (const discount of discounts) {
    if (discount.buyDiscountPercentage < 0 || discount.buyDiscountPercentage > 100) {
      throw new ValidationError(
        `Buy discount percentage for condition ${discount.conditionTierId} must be between 0 and 100`
      );
    }
    if (discount.sellDiscountPercentage < 0 || discount.sellDiscountPercentage > 100) {
      throw new ValidationError(
        `Sell discount percentage for condition ${discount.conditionTierId} must be between 0 and 100`
      );
    }

    const conditionTier = await prisma.conditionTier.findUnique({
      where: { id: discount.conditionTierId },
    });

    if (!conditionTier) {
      throw new ValidationError(`Condition tier ${discount.conditionTierId} not found`);
    }

    await prisma.policyConditionDiscount.upsert({
      where: {
        policyId_conditionTierId: {
          policyId,
          conditionTierId: discount.conditionTierId,
        },
      },
      update: {
        buyDiscountPercentage: discount.buyDiscountPercentage,
        sellDiscountPercentage: discount.sellDiscountPercentage,
      },
      create: {
        policyId,
        conditionTierId: discount.conditionTierId,
        buyDiscountPercentage: discount.buyDiscountPercentage,
        sellDiscountPercentage: discount.sellDiscountPercentage,
      },
    });
  }
}

/**
 * Get all condition tiers for UI selection
 */
export async function getAllConditionTiers() {
  return prisma.conditionTier.findMany({
    orderBy: { order: 'asc' },
  });
}
