'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';

export default function CreateListing() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    releaseYear: new Date().getFullYear().toString(),
    condition: 'Very Good',
    description: '',
    price: '',
  });

  useEffect(() => {
    if (!user || user.userType !== 'seller') {
      router.push('/');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Call API to create listing
      // For demo, just show success
      setTimeout(() => {
        setLoading(false);
        router.push('/seller/dashboard');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow mb-8">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/seller/dashboard" className="text-green-500 hover:text-green-400">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Create New Listing</h1>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pb-8">
        <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Album Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Dark Side of the Moon"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              required
            />
          </div>

          {/* Artist */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Artist
            </label>
            <input
              type="text"
              name="artist"
              value={formData.artist}
              onChange={handleChange}
              placeholder="e.g., Pink Floyd"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              required
            />
          </div>

          {/* Release Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Release Year
              </label>
              <input
                type="number"
                name="releaseYear"
                value={formData.releaseYear}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Condition
              </label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-green-500"
              >
                <option>Mint</option>
                <option>Near Mint</option>
                <option>Very Good+</option>
                <option>Very Good</option>
                <option>Good+</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Poor</option>
              </select>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Price (USD)
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="99.99"
              step="0.01"
              min="0"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the album condition, any defects, etc."
              rows={5}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition"
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </button>
            <Link
              href="/seller/dashboard"
              className="flex-1 bg-gray-700 text-white py-2 rounded font-semibold hover:bg-gray-600 transition text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
