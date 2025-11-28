'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';

interface DiscogsRecord {
  id: string;
  discogsId: number;
  title: string;
  artist: string;
  year: number;
  label: string;
  price: number | null;
  imageUrl: string;
  genre: string;
  format: string;
  rpm: number;
  catalog: string;
  notes: string;
}

export default function CreateListing() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'search' | 'details'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscogsRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DiscogsRecord | null>(null);

  // Pricing state
  const [buyPrice, setBuyPrice] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState<number | null>(null);

  // Condition
  const [condition, setCondition] = useState('Very Good');

  useEffect(() => {
    if (!user || user.userType !== 'seller') {
      router.push('/');
    }
  }, [user, router]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const res = await fetch('/api/search/discogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setSearchResults(data.results);
        if (data.results.length === 0) {
          setError('No records found on Discogs. You can add it manually below.');
        }
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search Discogs');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectRecord = (record: DiscogsRecord) => {
    setSelectedRecord(record);
    // Calculate prices based on pricing policy
    // For now, use default percentages
    if (record.price) {
      setBuyPrice(Math.round(record.price * 0.55 * 100) / 100); // 55% buy
      setSellPrice(Math.round(record.price * 1.25 * 100) / 100); // 125% sell
    }
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) {
      setError('Please select a record');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/seller/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discogsId: selectedRecord.discogsId,
          title: selectedRecord.title,
          artist: selectedRecord.artist,
          year: selectedRecord.year,
          label: selectedRecord.label,
          genre: selectedRecord.genre,
          format: selectedRecord.format,
          catalog: selectedRecord.catalog,
          imageUrl: selectedRecord.imageUrl,
          condition,
          buyingPrice: buyPrice,
          sellingPrice: sellPrice,
          notes: selectedRecord.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/seller/dashboard');
      } else {
        setError(data.error || 'Failed to create listing');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow mb-8">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/seller/dashboard" className="text-green-500 hover:text-green-400">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Create New Listing</h1>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        {step === 'search' ? (
          // SEARCH STEP
          <div className="space-y-6">
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
              <h2 className="text-2xl font-bold mb-2">🔍 Search Discogs</h2>
              <p className="text-gray-400 mb-6">Find the record you want to sell on Discogs. If not found, you can add it manually.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Search by Artist or Album Title</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="e.g., Pink Floyd Dark Side of the Moon"
                      className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-semibold transition"
                    >
                      {searching ? '🔄 Searching...' : '🔍 Search'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Found {searchResults.length} Record{searchResults.length !== 1 ? 's' : ''}</h3>
                    <div className="space-y-3">
                      {searchResults.map((record) => (
                        <div
                          key={record.id}
                          className="bg-gray-700 hover:bg-gray-650 p-4 rounded border border-gray-600 cursor-pointer transition"
                          onClick={() => handleSelectRecord(record)}
                        >
                          <div className="flex gap-4 items-start">
                            {record.imageUrl && (
                              <img
                                src={record.imageUrl}
                                alt={record.title}
                                className="h-24 w-24 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-green-400 mb-1">{record.title}</h4>
                              <p className="text-gray-300 mb-2">{record.artist} • {record.year}</p>
                              <p className="text-gray-400 text-sm mb-3">{record.label} • {record.genre}</p>
                              <div className="flex gap-3">
                                {record.price && (
                                  <>
                                    <div>
                                      <p className="text-xs text-gray-500">Market Price</p>
                                      <p className="font-semibold text-green-400">${record.price.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">We Pay</p>
                                      <p className="font-semibold text-blue-400">${(Math.round(record.price * 0.55 * 100) / 100).toFixed(2)}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold whitespace-nowrap transition">
                              ✓ Select
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.length === 0 && !searching && searchQuery && (
                  <div className="bg-gray-700 border border-gray-600 rounded p-6 text-center">
                    <p className="text-gray-300 mb-4">No records found on Discogs</p>
                    <button
                      onClick={() => {
                        setStep('details');
                        setSelectedRecord(null);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
                    >
                      Add Manually
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // DETAILS STEP
          <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg space-y-6">
            {selectedRecord ? (
              <>
                <div className="bg-gray-700 p-6 rounded border border-gray-600">
                  <h3 className="text-lg font-bold mb-3">Record Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedRecord.imageUrl && (
                      <img
                        src={selectedRecord.imageUrl}
                        alt={selectedRecord.title}
                        className="h-32 w-32 object-cover rounded"
                      />
                    )}
                    <div className="col-span-2">
                      <h4 className="text-lg font-bold text-green-400 mb-2">{selectedRecord.title}</h4>
                      <p className="text-gray-300 mb-1">{selectedRecord.artist}</p>
                      <p className="text-gray-400 text-sm mb-3">{selectedRecord.label} • {selectedRecord.year}</p>
                      <p className="text-gray-400 text-sm">{selectedRecord.format} • {selectedRecord.genre}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Display */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-900 border border-blue-700 p-6 rounded">
                    <p className="text-blue-300 text-sm font-bold uppercase mb-2">Discogs Market Price</p>
                    <p className="text-3xl font-bold text-blue-400">${selectedRecord.price?.toFixed(2) || 'N/A'}</p>
                    <p className="text-xs text-blue-300 mt-2">Based on lowest active listing</p>
                  </div>
                  <div className="bg-green-900 border border-green-700 p-6 rounded">
                    <p className="text-green-300 text-sm font-bold uppercase mb-2">💰 We Will Buy For</p>
                    <p className="text-3xl font-bold text-green-400">${buyPrice?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-green-300 mt-2">Fixed buying price (55% of market)</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-yellow-900 border border-yellow-700 p-6 rounded">
                <p className="text-yellow-300 text-sm font-bold mb-2">Manual Entry</p>
                <p className="text-yellow-200">Record not found on Discogs - please enter details manually</p>
              </div>
            )}

            {/* Condition */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Record Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
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
                disabled={loading || !selectedRecord}
                className="flex-1 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Creating...' : '✓ Create Listing'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('search');
                  setSelectedRecord(null);
                  setSearchResults([]);
                }}
                className="flex-1 bg-gray-700 text-white py-2 rounded font-semibold hover:bg-gray-600 transition"
              >
                ← Back to Search
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
