'use client';

import React from 'react';
import Link from 'next/link';
import LoyaltyDashboard from '@/components/LoyaltyDashboard';

export default function LoyaltyContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/buyer/storefront"
            className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
          >
            ← Back to Storefront
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Loyalty Program</h1>
          <p className="text-gray-600">
            Earn points on every purchase and redeem them for discounts and rewards
          </p>
        </div>

        {/* Dashboard */}
        <LoyaltyDashboard />

        {/* How It Works Section */}
        <div className="mt-12 bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Earn Points */}
            <div className="text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Earn Points</h3>
              <p className="text-gray-600 text-sm">
                Earn 1 point for every dollar you spend. Higher tiers earn more points!
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-gray-700">
                  <strong>Bronze:</strong> 1x points
                </p>
                <p className="text-gray-700">
                  <strong>Silver:</strong> 1.5x points
                </p>
                <p className="text-gray-700">
                  <strong>Gold:</strong> 2x points
                </p>
              </div>
            </div>

            {/* Unlock Tiers */}
            <div className="text-center">
              <div className="text-5xl mb-4">⬆️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unlock Tiers</h3>
              <p className="text-gray-600 text-sm">
                Spend more to unlock higher tiers with better benefits
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-gray-700">
                  Bronze: Start
                </p>
                <p className="text-gray-700">
                  Silver: $500 spent
                </p>
                <p className="text-gray-700">
                  Gold: $1,500 spent
                </p>
              </div>
            </div>

            {/* Redeem Rewards */}
            <div className="text-center">
              <div className="text-5xl mb-4">🎁</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Redeem Rewards</h3>
              <p className="text-gray-600 text-sm">
                Convert points to discounts on future purchases
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-gray-700">
                  100 points = $1 discount
                </p>
                <p className="text-gray-700">
                  Redeem anytime!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Benefits */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tier Benefits</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Tier</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Minimum Spend</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Points Multiplier</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Discount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Free Shipping</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border border-gray-200">
                  <td className="px-4 py-3 font-semibold text-amber-700">🥉 Bronze</td>
                  <td className="px-4 py-3 text-gray-600">$0</td>
                  <td className="px-4 py-3 text-gray-600">1x</td>
                  <td className="px-4 py-3 text-gray-600">0%</td>
                  <td className="px-4 py-3 text-gray-600">No</td>
                </tr>
                <tr className="border border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-600">🥈 Silver</td>
                  <td className="px-4 py-3 text-gray-600">$500</td>
                  <td className="px-4 py-3 text-gray-600">1.5x</td>
                  <td className="px-4 py-3 text-gray-600">5%</td>
                  <td className="px-4 py-3 text-gray-600">No</td>
                </tr>
                <tr className="border border-gray-200">
                  <td className="px-4 py-3 font-semibold text-yellow-600">👑 Gold</td>
                  <td className="px-4 py-3 text-gray-600">$1,500</td>
                  <td className="px-4 py-3 text-gray-600">2x</td>
                  <td className="px-4 py-3 text-gray-600">10%</td>
                  <td className="px-4 py-3 font-semibold text-green-600">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
