'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore, useCartStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/lib/currency-context';

export default function Cart() {
  const { user, logout } = useAuthStore();
  const { items, removeItem, clearCart } = useCartStore();
  const { symbol: currency } = useCurrency();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.userType !== 'buyer') {
      router.push('/');
    }
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">🎵 Shopping Cart</h1>
          <div className="flex gap-6 items-center">
            <span className="text-sm text-gray-300">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <Link
              href="/buyer/storefront"
              className="inline-block bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 transition"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700 border-b border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Album</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Quantity</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Total</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="px-6 py-4">{item.title}</td>
                        <td className="px-6 py-4">{currency}{item.price}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={item.quantity}
                            min="1"
                            className="w-12 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                          />
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          {currency}{(item.price * item.quantity).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Link
                href="/buyer/storefront"
                className="inline-block mt-4 text-green-400 hover:text-green-300"
              >
                ← Continue Shopping
              </Link>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-800 rounded-lg p-6 h-fit">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 border-b border-gray-700 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal:</span>
                  <span>{currency}{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Shipping:</span>
                  <span>{currency}10.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax:</span>
                  <span>{currency}{(total * 0.1).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Total:</span>
                <span className="text-green-500">
                  {currency}{(total + 10 + total * 0.1).toFixed(2)}
                </span>
              </div>

              <Link
                href="/buyer/checkout"
                className="block w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 transition text-center mb-2"
              >
                Proceed to Checkout
              </Link>

              <button
                onClick={() => clearCart()}
                className="w-full bg-gray-700 text-white py-2 rounded hover:bg-gray-600 transition"
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
