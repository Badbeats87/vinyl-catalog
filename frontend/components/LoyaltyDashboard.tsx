'use client';

import React, { useEffect, useState } from 'react';
import { useLoyalty } from '@/lib/use-loyalty';

export const LoyaltyDashboard: React.FC = () => {
  const { account, transactions, loading, error, fetchLoyalty, redeemPoints, getPointsValue } =
    useLoyalty();
  const [showRedeemForm, setShowRedeemForm] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    fetchLoyalty();
  }, [fetchLoyalty]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(redeemAmount);

    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setIsRedeeming(true);
      await redeemPoints(amount);
      setRedeemAmount('');
      setShowRedeemForm(false);
      fetchLoyalty();
    } catch (err) {
      console.error('Redemption failed:', err);
    } finally {
      setIsRedeeming(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold':
        return 'from-yellow-400 to-yellow-600';
      case 'silver':
        return 'from-gray-300 to-gray-500';
      case 'bronze':
        return 'from-amber-600 to-amber-800';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'gold':
        return '👑';
      case 'silver':
        return '🥈';
      case 'bronze':
        return '🥉';
      default:
        return '⭐';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading loyalty account...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>No loyalty account found</p>
      </div>
    );
  }

  const dollarValue = getPointsValue(account.points);

  return (
    <div className="space-y-6">
      {/* Tier Card */}
      <div className={`bg-gradient-to-r ${getTierColor(account.tier)} rounded-lg p-8 text-white shadow-lg`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-sm opacity-90 mb-1">YOUR TIER</p>
            <h2 className="text-4xl font-bold capitalize">{account.tier}</h2>
          </div>
          <div className="text-6xl">{getTierIcon(account.tier)}</div>
        </div>

        {/* Points Display */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-20 rounded p-4">
            <p className="text-xs opacity-75">TOTAL POINTS</p>
            <p className="text-3xl font-bold">{account.points}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-4">
            <p className="text-xs opacity-75">DOLLAR VALUE</p>
            <p className="text-3xl font-bold">${dollarValue.toFixed(2)}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-4">
            <p className="text-xs opacity-75">LIFETIME SPENT</p>
            <p className="text-3xl font-bold">${account.lifetimeSpent.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Benefits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Points Multiplier</p>
              <p className="text-lg font-bold text-blue-600">{account.tierBenefits.pointsMultiplier}x</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏷️</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Discount</p>
              <p className="text-lg font-bold text-green-600">{account.tierBenefits.discountPercentage}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚚</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Free Shipping</p>
              <p className="text-lg font-bold text-purple-600">
                {account.tierBenefits.freeShipping ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Tier */}
      {account.nextTierInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Next Tier: {account.nextTierInfo.tier.toUpperCase()}</h3>
          <p className="text-gray-600 mb-4">
            Spend ${account.nextTierInfo.amountNeeded.toFixed(2)} more to reach the next tier
          </p>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (account.lifetimeSpent / (account.lifetimeSpent + account.nextTierInfo.amountNeeded)) * 100)}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Redeem Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Redeem Points</h3>

        {!showRedeemForm ? (
          <button
            onClick={() => setShowRedeemForm(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Redeem {account.points} Points (${dollarValue.toFixed(2)})
          </button>
        ) : (
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Points to Redeem
              </label>
              <input
                type="number"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder="Enter points amount"
                max={account.points}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                You have {account.points} points available
              </p>
            </div>

            {redeemAmount && (
              <div className="bg-gray-50 rounded p-3">
                <p className="text-sm text-gray-700">
                  Redeeming {redeemAmount} points will give you ${getPointsValue(parseInt(redeemAmount)).toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isRedeeming}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg transition disabled:cursor-not-allowed"
              >
                {isRedeeming ? 'Redeeming...' : 'Redeem Points'}
              </button>
              <button
                type="button"
                onClick={() => setShowRedeemForm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex justify-between items-start pb-3 border-b border-gray-200 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{transaction.description}</p>
                  <p className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</p>
                </div>
                <span
                  className={`font-bold text-lg ${
                    transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {transaction.points > 0 ? '+' : ''}{transaction.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyDashboard;
