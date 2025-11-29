'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export default function Home() {
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="bg-gray-900 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-green-500">🎵 Vinyl</div>
          <div className="flex gap-4">
            {isAuthenticated && user ? (
              <>
                <span className="text-sm text-gray-300">
                  Welcome, {user.email}
                </span>
                {user.userType === 'seller' && (
                  <Link href="/seller/dashboard" className="btn btn-primary">
                    Seller Dashboard
                  </Link>
                )}
                {user.userType === 'buyer' && (
                  <Link href="/buyer/storefront" className="btn btn-primary">
                    Browse Records
                  </Link>
                )}
                {user.userType === 'admin' && (
                  <Link href="/admin/dashboard" className="btn btn-primary">
                    Admin Panel
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-green-400 transition">
                  Login
                </Link>
                <Link href="/signup" className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 transition">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4">
            Buy & Sell Vinyl Records
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            The digital marketplace for collectors and sellers
          </p>

          {!isAuthenticated ? (
            <div className="flex gap-4 justify-center">
              <Link
                href="/signup?type=seller"
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition text-lg"
              >
                Start Selling
              </Link>
              <Link
                href="/signup?type=buyer"
                className="bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-600 transition text-lg"
              >
                Browse Records
              </Link>
            </div>
          ) : null}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-gray-800 p-8 rounded-lg">
            <div className="text-4xl mb-4">🎸</div>
            <h3 className="text-xl font-bold mb-2">Sell Records</h3>
            <p className="text-gray-400">
              List your vinyl collection and reach collectors worldwide
            </p>
          </div>
          <div className="bg-gray-800 p-8 rounded-lg">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">Browse Collections</h3>
            <p className="text-gray-400">
              Discover rare and classic vinyl from sellers around the world
            </p>
          </div>
          <div className="bg-gray-800 p-8 rounded-lg">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-2">Secure Checkout</h3>
            <p className="text-gray-400">
              Safe, verified transactions with buyer and seller protection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
