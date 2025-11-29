'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore, useCartStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/lib/currency-context';

export default function Checkout() {
  const { user, logout } = useAuthStore();
  const { items, clearCart } = useCartStore();
  const { symbol: currency } = useCurrency();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    address: '',
    city: '',
    state: '',
    zip: '',
    cardNumber: '',
    cardExp: '',
    cardCvc: '',
  });

  useEffect(() => {
    if (!user || user.userType !== 'buyer') {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      router.push('/buyer/storefront');
    }
  }, [items, orderPlaced, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setOrderPlaced(true);
      setLoading(false);
    }, 1000);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 10;
  const tax = total * 0.1;
  const grandTotal = total + shipping + tax;

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-4xl font-bold mb-2">Order Placed!</h1>
          <p className="text-gray-300 mb-2">Thank you for your purchase</p>
          <p className="text-gray-400 mb-6">Order #VZ-2024-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          <Link
            href="/buyer/storefront"
            className="inline-block bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">🎵 Checkout</h1>
          <button
            onClick={handleLogout}
            className="text-gray-300 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
                  required
                />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 mt-4"
                required
              />
              <input
                type="text"
                name="address"
                placeholder="Street Address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 mt-4"
                required
              />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
                  required
                />
                <input
                  type="text"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
                  required
                />
              </div>
              <input
                type="text"
                name="zip"
                placeholder="ZIP Code"
                value={formData.zip}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 mt-4"
                required
              />
            </div>

            {/* Payment */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              <input
                type="text"
                name="cardNumber"
                placeholder="Card Number"
                value={formData.cardNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
                required
              />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <input
                  type="text"
                  name="cardExp"
                  placeholder="MM/YY"
                  value={formData.cardExp}
                  onChange={handleChange}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
                  required
                />
                <input
                  type="text"
                  name="cardCvc"
                  placeholder="CVC"
                  value={formData.cardCvc}
                  onChange={handleChange}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition"
            >
              {loading ? 'Processing...' : `Place Order - ${currency}${grandTotal.toFixed(2)}`}
            </button>
          </form>

          {/* Order Summary */}
          <div className="bg-gray-800 rounded-lg p-6 h-fit">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-300">{item.title}</span>
                  <span>{currency}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-700 pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal:</span>
                <span>{currency}{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Shipping:</span>
                <span>{currency}{shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tax:</span>
                <span>{currency}{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-green-500 pt-4 border-t border-gray-700">
                <span>Total:</span>
                <span>{currency}{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
