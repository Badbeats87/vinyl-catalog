'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface Listing {
  id: string;
  title: string;
  artist: string;
  condition: string;
  price: number;
  status: 'pending' | 'approved' | 'sold';
}

export default function SellerDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([
    {
      id: '1',
      title: 'Dark Side of the Moon',
      artist: 'Pink Floyd',
      condition: 'Mint',
      price: 150,
      status: 'approved',
    },
    {
      id: '2',
      title: 'Abbey Road',
      artist: 'The Beatles',
      condition: 'Very Good',
      price: 120,
      status: 'approved',
    },
    {
      id: '3',
      title: 'Thriller',
      artist: 'Michael Jackson',
      condition: 'Good',
      price: 80,
      status: 'pending',
    },
  ]);

  useEffect(() => {
    if (!user || user.userType !== 'seller') {
      router.push('/');
    }
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const totalEarnings = listings
    .filter((l) => l.status === 'sold')
    .reduce((sum, l) => sum + l.price, 0);
  const activeListings = listings.filter((l) => l.status !== 'sold').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">🎵 Vinyl Seller Portal</h1>
          <div className="flex gap-4 items-center">
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm font-semibold mb-2">Active Listings</div>
            <div className="text-3xl font-bold text-green-500">{activeListings}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm font-semibold mb-2">Total Earnings</div>
            <div className="text-3xl font-bold text-green-500">${totalEarnings}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm font-semibold mb-2">Pending Approval</div>
            <div className="text-3xl font-bold text-yellow-500">
              {listings.filter((l) => l.status === 'pending').length}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8">
          <Link
            href="/seller/create-listing"
            className="inline-block bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 transition"
          >
            + Create New Listing
          </Link>
        </div>

        {/* Listings Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700 border-b border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Album</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Artist</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Condition</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="border-b border-gray-700 hover:bg-gray-750 transition">
                  <td className="px-6 py-4">{listing.title}</td>
                  <td className="px-6 py-4">{listing.artist}</td>
                  <td className="px-6 py-4">{listing.condition}</td>
                  <td className="px-6 py-4 font-semibold">${listing.price}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        listing.status === 'approved'
                          ? 'bg-green-900 text-green-200'
                          : listing.status === 'pending'
                          ? 'bg-yellow-900 text-yellow-200'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-blue-400 hover:text-blue-300 mr-2">Edit</button>
                    <button className="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
