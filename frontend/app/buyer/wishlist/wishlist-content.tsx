'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/lib/use-wishlist';

export default function WishlistContent() {
  const { wishlist, loading, error, removeItem, clearWishlist, fetchWishlist } =
    useWishlist();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading your wishlist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
          <div className="text-center mt-6">
            <Link
              href="/buyer/storefront"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = wishlist?.items || [];
  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Wishlist</h1>
          <p className="text-gray-600">
            {isEmpty
              ? 'Your wishlist is empty'
              : `You have ${items.length} item${items.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>

        {/* Empty State */}
        {isEmpty ? (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">🤍</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No items yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start adding items to your wishlist to save them for later
            </p>
            <Link
              href="/buyer/storefront"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition"
            >
              Browse Storefront
            </Link>
          </div>
        ) : (
          <>
            {/* Clear Wishlist Button */}
            <div className="mb-6 flex justify-end">
              <button
                onClick={clearWishlist}
                className="text-red-600 hover:text-red-700 font-semibold py-2 px-4 rounded hover:bg-red-50 transition"
              >
                Clear Wishlist
              </button>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden border border-gray-200"
                >
                  {/* Cover Art */}
                  <div className="relative bg-gray-100 h-64 overflow-hidden">
                    {item.coverArtUrl ? (
                      <img
                        src={item.coverArtUrl}
                        alt={item.title}
                        className="w-full h-full object-cover hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <div className="text-4xl mb-2">🎵</div>
                          <p className="text-sm">No image</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-1">
                      {item.artist}
                    </p>

                    {/* Added Date */}
                    <p className="text-xs text-gray-500 mb-4">
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Link
                        href={`/buyer/storefront?search=${encodeURIComponent(item.title)}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded text-center transition text-sm"
                      >
                        Find Similar
                      </Link>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex-shrink-0 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 px-4 rounded transition text-sm"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/buyer/storefront"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
