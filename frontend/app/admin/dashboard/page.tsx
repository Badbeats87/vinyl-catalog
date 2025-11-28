'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface Submission {
  id: string;
  seller: string;
  album: string;
  artist: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface SearchResult {
  id: string;
  discogsId: number;
  title: string;
  artist: string;
  year: number;
  label: string;
  price: number | null;
  condition: string | null;
  imageUrl: string;
  genre: string;
  format: string;
  rpm: number;
  pressType: string;
  catalog: string;
  notes: string;
  masterId?: number;
  resourceUrl?: string;
}

interface PricingPolicy {
  id: string;
  name: string;
  buyPercentage: number;
  sellPercentage: number;
}

interface AnalyticStats {
  inventoryValue: number;
  addedThisWeek: number;
  recentSalesCount: number;
  salesRevenue: number;
  totalProfit: number;
  averageProfitMargin: number;
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'submissions' | 'search' | 'pricing' | 'analytics'>('submissions');

  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: '1',
      seller: 'seller@demo.com',
      album: 'Thriller',
      artist: 'Michael Jackson',
      submittedAt: '2024-11-28',
      status: 'pending',
    },
    {
      id: '2',
      seller: 'seller2@demo.com',
      album: 'The Wall',
      artist: 'Pink Floyd',
      submittedAt: '2024-11-27',
      status: 'pending',
    },
    {
      id: '3',
      seller: 'seller@demo.com',
      album: 'Dark Side of the Moon',
      artist: 'Pink Floyd',
      submittedAt: '2024-11-26',
      status: 'approved',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchSource, setSearchSource] = useState<'discogs' | 'ebay'>('discogs');

  const [policies, setPolicies] = useState<PricingPolicy[]>([]);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newBuyPercentage, setNewBuyPercentage] = useState(55);
  const [newSellPercentage, setNewSellPercentage] = useState(125);

  const [analytics, setAnalytics] = useState<AnalyticStats>({
    inventoryValue: 0,
    addedThisWeek: 0,
    recentSalesCount: 0,
    salesRevenue: 0,
    totalProfit: 0,
    averageProfitMargin: 0,
  });

  useEffect(() => {
    if (!user || user.userType !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    // Load analytics data when component mounts
    const loadAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics/dashboard');
        const data = await res.json();
        if (data.success) {
          setAnalytics(data.stats);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    };
    loadAnalytics();

    // Load pricing policies
    const loadPolicies = async () => {
      try {
        const res = await fetch('/api/pricing/policies');
        const data = await res.json();
        if (data.success) {
          setPolicies(data.policies.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
      }
    };
    loadPolicies();
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const endpoint = searchSource === 'discogs' ? '/api/search/discogs' : '/api/search/ebay';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleApprove = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'approved' as const } : s))
    );
  };

  const handleReject = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'rejected' as const } : s))
    );
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const approvedCount = submissions.filter((s) => s.status === 'approved').length;
  const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">🔐 Admin Dashboard</h1>
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
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-3 font-semibold transition whitespace-nowrap ${
              activeTab === 'submissions'
                ? 'text-green-500 border-b-2 border-green-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Submissions
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-3 font-semibold transition whitespace-nowrap ${
              activeTab === 'search'
                ? 'text-green-500 border-b-2 border-green-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔍 Search Records
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-3 font-semibold transition whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'text-green-500 border-b-2 border-green-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💰 Pricing Strategy
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 font-semibold transition whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'text-green-500 border-b-2 border-green-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📊 Analytics
          </button>
        </div>

        {/* SUBMISSIONS TAB */}
        {activeTab === 'submissions' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="text-gray-400 text-sm font-semibold mb-2">Total Submissions</div>
                <div className="text-3xl font-bold text-green-500">{submissions.length}</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg border-l-4 border-yellow-500">
                <div className="text-gray-400 text-sm font-semibold mb-2">Pending Review</div>
                <div className="text-3xl font-bold text-yellow-500">{pendingCount}</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg border-l-4 border-green-500">
                <div className="text-gray-400 text-sm font-semibold mb-2">Approved</div>
                <div className="text-3xl font-bold text-green-500">{approvedCount}</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg border-l-4 border-red-500">
                <div className="text-gray-400 text-sm font-semibold mb-2">Rejected</div>
                <div className="text-3xl font-bold text-red-500">{rejectedCount}</div>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold">Seller Submissions</h2>
              </div>
              <table className="w-full">
                <thead className="bg-gray-700 border-b border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Seller</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Album</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Artist</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Submitted</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-6 py-4 text-sm">{submission.seller}</td>
                      <td className="px-6 py-4">{submission.album}</td>
                      <td className="px-6 py-4 text-gray-400">{submission.artist}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{submission.submittedAt}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            submission.status === 'pending'
                              ? 'bg-yellow-900 text-yellow-200'
                              : submission.status === 'approved'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-red-900 text-red-200'
                          }`}
                        >
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {submission.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(submission.id)}
                              className="text-green-400 hover:text-green-300 font-semibold"
                            >
                              Approve
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                              onClick={() => handleReject(submission.id)}
                              className="text-red-400 hover:text-red-300 font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {submission.status !== 'pending' && (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Search Discogs & eBay for Vinyl Records</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Search Query</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter artist or album name..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Search Source</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="discogs"
                      checked={searchSource === 'discogs'}
                      onChange={(e) => setSearchSource(e.target.value as 'discogs' | 'ebay')}
                      className="mr-2"
                    />
                    Discogs
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="ebay"
                      checked={searchSource === 'ebay'}
                      onChange={(e) => setSearchSource(e.target.value as 'discogs' | 'ebay')}
                      className="mr-2"
                    />
                    eBay
                  </label>
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-bold transition"
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-6">Search Results ({searchResults.length})</h3>
                <div className="space-y-6">
                  {searchResults.map((result) => (
                    <div key={result.id} className="bg-gradient-to-r from-gray-750 to-gray-700 p-6 rounded-lg border-2 border-gray-600 hover:border-green-500 hover:shadow-lg transition-all">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        {/* Album Art - Column 1 */}
                        <div className="flex justify-center items-center">
                          <img
                            src={result.imageUrl}
                            alt={result.title}
                            className="h-40 w-40 object-cover rounded-lg shadow-md border-2 border-gray-500 hover:border-green-400 transition"
                            onError={(e) => {e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image'}}
                          />
                        </div>

                        {/* Primary Info - Column 2 */}
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-bold text-lg text-green-400 mb-1">{result.title}</h4>
                            <p className="text-gray-300 font-semibold text-base">by {result.artist}</p>
                          </div>
                          <div className="border-t border-gray-600 pt-3 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Label:</span>
                              <span className="text-white font-medium">{result.label}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Year:</span>
                              <span className="text-white font-medium">{result.year || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Catalog:</span>
                              <span className="text-white font-medium">{result.catalog}</span>
                            </div>
                          </div>
                          <div className="pt-2">
                            <span className="text-xs font-semibold bg-blue-900 text-blue-200 px-3 py-1 rounded-full">Discogs ID: {result.discogsId}</span>
                          </div>
                        </div>

                        {/* Format & Technical - Column 3 */}
                        <div className="space-y-3">
                          <div className="bg-gray-800 p-3 rounded-lg">
                            <p className="text-xs font-bold text-yellow-400 mb-2">📀 FORMAT DETAILS</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Genre:</span>
                                <span className="text-white">{result.genre}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Type:</span>
                                <span className="text-white">{result.format}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">RPM:</span>
                                <span className="text-white font-bold">{result.rpm}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Pressing:</span>
                                <span className="text-white">{result.pressType}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Market Info - Column 4 */}
                        <div className="space-y-3">
                          <div className="bg-gray-800 p-3 rounded-lg">
                            <p className="text-xs font-bold text-green-400 mb-2">💰 MARKET DATA</p>
                            <div className="space-y-2">
                              {result.price !== null ? (
                                <>
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">Market Price:</p>
                                    <p className="text-2xl font-bold text-green-400">${result.price.toFixed(2)}</p>
                                  </div>
                                  {result.condition && (
                                    <div className="border-t border-gray-600 pt-2">
                                      <p className="text-xs text-gray-400 mb-1">Condition Range:</p>
                                      <p className="text-sm text-white font-semibold">{result.condition}</p>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-xs text-gray-500">No marketplace</p>
                                  <p className="text-xs text-gray-500">data available</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action & Notes - Column 5 */}
                        <div className="flex flex-col justify-between space-y-3">
                          <div className="bg-gray-800 p-3 rounded-lg flex-grow">
                            <p className="text-xs font-bold text-purple-400 mb-2">📝 NOTES</p>
                            <p className="text-xs text-gray-300 line-clamp-6">{result.notes || 'No additional notes'}</p>
                          </div>
                          <button className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-lg text-white font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                            <span>📥</span> Import Record
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No results found. Try a different search query.
              </div>
            )}
          </div>
        )}

        {/* PRICING STRATEGY TAB */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Create Policy */}
            <div className="bg-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-6">Create Pricing Strategy</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Strategy Name</label>
                  <input
                    type="text"
                    value={newPolicyName}
                    onChange={(e) => setNewPolicyName(e.target.value)}
                    placeholder="e.g., Aggressive Markups, Conservative Markups"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Buy Percentage (%)</label>
                    <input
                      type="number"
                      value={newBuyPercentage}
                      onChange={(e) => setNewBuyPercentage(parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="55"
                    />
                    <p className="text-xs text-gray-400 mt-1">Offer price = Market price × {newBuyPercentage}%</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Sell Percentage (%)</label>
                    <input
                      type="number"
                      value={newSellPercentage}
                      onChange={(e) => setNewSellPercentage(parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="125"
                    />
                    <p className="text-xs text-gray-400 mt-1">List price = Market price × {newSellPercentage}%</p>
                  </div>
                </div>

                <button className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-bold transition">
                  Create Strategy
                </button>
              </div>
            </div>

            {/* Existing Policies */}
            {policies.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-8">
                <h3 className="text-xl font-bold mb-4">Active Strategies</h3>
                <div className="space-y-3">
                  {policies.map((policy) => (
                    <div key={policy.id} className="bg-gray-700 p-4 rounded border border-gray-600">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold">{policy.name}</h4>
                          <p className="text-sm text-gray-400">
                            Buy: {policy.buyPercentage}% | Sell: {policy.sellPercentage}%
                          </p>
                        </div>
                        <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">Edit</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top Level Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-gradient-to-br from-green-900 to-green-800 p-8 rounded-lg border-l-4 border-green-400 shadow-lg">
                <p className="text-green-300 text-sm font-bold mb-2">💼 INVENTORY VALUE</p>
                <p className="text-4xl font-bold text-white">${analytics.inventoryValue.toFixed(2)}</p>
                <p className="text-xs text-green-200 mt-2">Total stock on hand</p>
              </div>
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-8 rounded-lg border-l-4 border-blue-400 shadow-lg">
                <p className="text-blue-300 text-sm font-bold mb-2">📊 TOTAL SALES (30d)</p>
                <p className="text-4xl font-bold text-white">${analytics.salesRevenue.toFixed(2)}</p>
                <p className="text-xs text-blue-200 mt-2">Revenue from sales</p>
              </div>
              <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-8 rounded-lg border-l-4 border-purple-400 shadow-lg">
                <p className="text-purple-300 text-sm font-bold mb-2">💰 GROSS PROFIT</p>
                <p className="text-4xl font-bold text-white">${analytics.totalProfit.toFixed(2)}</p>
                <p className="text-xs text-purple-200 mt-2">Net earnings</p>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-yellow-500 transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-yellow-400 font-bold text-sm">🆕 ADDED THIS WEEK</p>
                  <p className="text-2xl font-bold text-yellow-400">{analytics.addedThisWeek}</p>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{width: `${Math.min(analytics.addedThisWeek * 10, 100)}%`}}></div>
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-orange-400 font-bold text-sm">🎵 SOLD (30d)</p>
                  <p className="text-2xl font-bold text-orange-400">{analytics.recentSalesCount}</p>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{width: `${Math.min(analytics.recentSalesCount * 10, 100)}%`}}></div>
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-green-500 transition">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-green-400 font-bold text-sm">📈 AVG MARGIN</p>
                  <p className="text-2xl font-bold text-green-400">{analytics.averageProfitMargin.toFixed(1)}%</p>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{width: `${Math.min(analytics.averageProfitMargin, 100)}%`}}></div>
                </div>
              </div>
            </div>

            {/* Summary Info */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-8 border border-gray-600">
              <h3 className="text-2xl font-bold mb-6 text-white">📈 Business Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                    <span className="text-gray-300 font-semibold">Cost of Inventory Sold:</span>
                    <span className="text-white font-bold text-lg">${analytics.salesRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                    <span className="text-gray-300 font-semibold">Revenue Earned:</span>
                    <span className="text-green-400 font-bold text-lg">${(analytics.salesRevenue + analytics.totalProfit).toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                    <span className="text-gray-300 font-semibold">Profit Generated:</span>
                    <span className="text-blue-400 font-bold text-lg">${analytics.totalProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                    <span className="text-gray-300 font-semibold">Average Markup:</span>
                    <span className="text-purple-400 font-bold text-lg">{analytics.averageProfitMargin.toFixed(2)}% above cost</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
