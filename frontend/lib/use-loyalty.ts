import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';

export interface LoyaltyAccount {
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

export interface LoyaltyTransaction {
  id: string;
  points: number;
  type: string;
  description: string;
  orderId?: string;
  createdAt: string;
}

interface UseLoyaltyReturn {
  account: LoyaltyAccount | null;
  transactions: LoyaltyTransaction[];
  loading: boolean;
  error: string | null;
  fetchLoyalty: () => Promise<void>;
  redeemPoints: (pointsToRedeem: number) => Promise<{ dollarValue: number }>;
  getPointsValue: (points: number) => number;
}

export function useLoyalty(): UseLoyaltyReturn {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const fetchLoyalty = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/buyer/loyalty');
      setAccount(response.data.data.account);
      setTransactions(response.data.data.recentTransactions);
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Failed to load loyalty account';
      setError(message);
      console.error('Loyalty fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const redeemPoints = useCallback(
    async (pointsToRedeem: number): Promise<{ dollarValue: number }> => {
      try {
        const response = await api.post('/buyer/loyalty/redeem', {
          pointsToRedeem,
        });

        const result = response.data.data;
        setAccount(result.account);

        toast({
          type: 'success',
          message: `Redeemed ${pointsToRedeem} points for $${result.dollarValue.toFixed(2)}`,
        });

        return { dollarValue: result.dollarValue };
      } catch (err: any) {
        const message =
          err.response?.data?.error?.message ||
          'Failed to redeem points';
        setError(message);
        toast({
          type: 'error',
          message,
        });
        throw err;
      }
    },
    [toast]
  );

  const getPointsValue = useCallback((points: number): number => {
    return Math.floor((points / 100) * 100) / 100; // 100 points = $1
  }, []);

  return {
    account,
    transactions,
    loading,
    error,
    fetchLoyalty,
    redeemPoints,
    getPointsValue,
  };
}
