import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tier configuration
const TIER_CONFIG = {
  bronze: {
    minSpent: 0,
    pointsMultiplier: 1.0,
    discountPercentage: 0,
    freeShipping: false,
  },
  silver: {
    minSpent: 500,
    pointsMultiplier: 1.5,
    discountPercentage: 5,
    freeShipping: false,
  },
  gold: {
    minSpent: 1500,
    pointsMultiplier: 2.0,
    discountPercentage: 10,
    freeShipping: true,
  },
};

const POINTS_PER_DOLLAR = 1; // 1 point per $1 spent
const POINT_REDEMPTION_VALUE = 100; // 100 points = $1

export interface LoyaltyAccountResponse {
  id: string;
  buyerId: string;
  points: number;
  tier: string;
  tierBenefits: {
    discountPercentage: number;
    pointsMultiplier: number;
    freeShipping: boolean;
  };
  lifetimeSpent: number;
  nextTierInfo?: {
    tier: string;
    amountNeeded: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransactionResponse {
  id: string;
  points: number;
  type: string;
  description: string;
  orderId?: string;
  createdAt: string;
}

/**
 * Get or create loyalty account for buyer
 */
export async function getOrCreateLoyaltyAccount(
  buyerId: string
): Promise<LoyaltyAccountResponse> {
  let account = await prisma.loyaltyAccount.findUnique({
    where: { buyerId },
  });

  if (!account) {
    account = await prisma.loyaltyAccount.create({
      data: { buyerId },
    });
  }

  return formatLoyaltyAccount(account);
}

/**
 * Get loyalty account with transaction history
 */
export async function getLoyaltyAccountWithHistory(
  buyerId: string,
  limit = 50
): Promise<{
  account: LoyaltyAccountResponse;
  transactions: LoyaltyTransactionResponse[];
}> {
  const account = await getOrCreateLoyaltyAccount(buyerId);

  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { account: { buyerId } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return {
    account,
    transactions: transactions.map(formatTransaction),
  };
}

/**
 * Add points for purchase
 */
export async function addPointsForPurchase(
  buyerId: string,
  orderTotal: number,
  orderId: string
): Promise<LoyaltyTransactionResponse> {
  const account = await getOrCreateLoyaltyAccount(buyerId);

  // Calculate points based on tier multiplier
  const tierMultiplier =
    TIER_CONFIG[account.tier as keyof typeof TIER_CONFIG]
      ?.pointsMultiplier || 1.0;
  const pointsEarned = Math.floor(orderTotal * POINTS_PER_DOLLAR * tierMultiplier);

  // Create transaction
  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      points: pointsEarned,
      type: 'purchase',
      description: `Earned ${pointsEarned} points from purchase ($${orderTotal.toFixed(2)})`,
      orderId,
    },
  });

  // Update account
  const newLifetimeSpent = account.lifetimeSpent + orderTotal;
  const newTier = calculateTier(newLifetimeSpent);

  await prisma.loyaltyAccount.update({
    where: { buyerId },
    data: {
      points: account.points + pointsEarned,
      lifetimeSpent: newLifetimeSpent,
      tier: newTier,
    },
  });

  return formatTransaction(transaction);
}

/**
 * Add points for review
 */
export async function addPointsForReview(
  buyerId: string,
  bonusPoints = 10
): Promise<LoyaltyTransactionResponse> {
  let loyaltyAccount = await prisma.loyaltyAccount.findUnique({
    where: { buyerId },
  });

  if (!loyaltyAccount) {
    // Create if doesn't exist
    await getOrCreateLoyaltyAccount(buyerId);
    loyaltyAccount = await prisma.loyaltyAccount.findUnique({
      where: { buyerId },
    });
  }

  if (!loyaltyAccount) {
    throw new Error('Loyalty account not found');
  }

  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      accountId: loyaltyAccount.id,
      points: bonusPoints,
      type: 'review',
      description: `Earned ${bonusPoints} bonus points for writing a review`,
    },
  });

  await prisma.loyaltyAccount.update({
    where: { buyerId },
    data: { points: loyaltyAccount.points + bonusPoints },
  });

  return formatTransaction(transaction);
}

/**
 * Redeem points for discount
 */
export async function redeemPoints(
  buyerId: string,
  pointsToRedeem: number
): Promise<{
  dollarValue: number;
  transaction: LoyaltyTransactionResponse;
  account: LoyaltyAccountResponse;
}> {
  const loyaltyAccount = await prisma.loyaltyAccount.findUnique({
    where: { buyerId },
  });

  if (!loyaltyAccount) {
    throw new Error('Loyalty account not found');
  }

  if (loyaltyAccount.points < pointsToRedeem) {
    throw new Error('Insufficient points for redemption');
  }

  const dollarValue = pointsToRedeem / POINT_REDEMPTION_VALUE;

  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      accountId: loyaltyAccount.id,
      points: -pointsToRedeem,
      type: 'redemption',
      description: `Redeemed ${pointsToRedeem} points for $${dollarValue.toFixed(2)} discount`,
    },
  });

  const updatedAccount = await prisma.loyaltyAccount.update({
    where: { buyerId },
    data: { points: loyaltyAccount.points - pointsToRedeem },
  });

  return {
    dollarValue,
    transaction: formatTransaction(transaction),
    account: formatLoyaltyAccount(updatedAccount),
  };
}

/**
 * Get tier benefits
 */
export function getTierBenefits(tier: string): typeof TIER_CONFIG.bronze {
  return TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;
}

/**
 * Calculate tier based on lifetime spending
 */
function calculateTier(lifetimeSpent: number): string {
  if (lifetimeSpent >= 1500) return 'gold';
  if (lifetimeSpent >= 500) return 'silver';
  return 'bronze';
}

/**
 * Format loyalty account for response
 */
function formatLoyaltyAccount(account: any): LoyaltyAccountResponse {
  const tierBenefits = getTierBenefits(account.tier);

  // Calculate next tier info
  let nextTierInfo;
  if (account.tier === 'bronze') {
    nextTierInfo = {
      tier: 'silver',
      amountNeeded: Math.max(0, 500 - account.lifetimeSpent),
    };
  } else if (account.tier === 'silver') {
    nextTierInfo = {
      tier: 'gold',
      amountNeeded: Math.max(0, 1500 - account.lifetimeSpent),
    };
  }

  return {
    id: account.id,
    buyerId: account.buyerId,
    points: account.points,
    tier: account.tier,
    tierBenefits: {
      discountPercentage: tierBenefits.discountPercentage,
      pointsMultiplier: tierBenefits.pointsMultiplier,
      freeShipping: tierBenefits.freeShipping,
    },
    lifetimeSpent: account.lifetimeSpent,
    nextTierInfo,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

/**
 * Format transaction for response
 */
function formatTransaction(transaction: any): LoyaltyTransactionResponse {
  return {
    id: transaction.id,
    points: transaction.points,
    type: transaction.type,
    description: transaction.description,
    orderId: transaction.orderId || undefined,
    createdAt: transaction.createdAt.toISOString(),
  };
}

/**
 * Get points to dollar conversion
 */
export function getPointsValue(points: number): number {
  return points / POINT_REDEMPTION_VALUE;
}

/**
 * Get points needed for specific amount
 */
export function getPointsNeeded(dollarAmount: number): number {
  return Math.ceil(dollarAmount * POINT_REDEMPTION_VALUE);
}
