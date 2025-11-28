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
  isActive?: boolean;
  buyMarketStat?: string;
  sellMarketStat?: string;
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSource, setSearchSource] = useState<'discogs' | 'ebay'>('discogs');
  const [currency, setCurrency] = useState<string>('USD');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minYear: '',
    maxYear: '',
    condition: '',
    genre: '',
    label: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(12);
  const [selectedForPricing, setSelectedForPricing] = useState<SearchResult | null>(null);
  const [priceSuggestions, setPriceSuggestions] = useState<any>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': '$',
    'AUD': '$',
    'CHF': 'CHF',
    'SEK': 'kr',
    'NZD': '$'
  };

  const [policies, setPolicies] = useState<PricingPolicy[]>([]);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newBuyPercentage, setNewBuyPercentage] = useState(55);
  const [newSellPercentage, setNewSellPercentage] = useState(125);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PricingPolicy | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

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

  // Load currency preference from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
  }, []);

  // Save currency preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('preferredCurrency', currency);
  }, [currency]);

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
    setSearchError(null);
    setCurrentPage(1);
    try {
      const endpoint = searchSource === 'discogs' ? '/api/search/discogs' : '/api/search/ebay';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, filters, currency }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setSearchResults(data.results);
        if (data.results.length === 0) {
          setSearchError('No results found. Try a different search query.');
        }
      } else {
        setSearchResults([]);
        setSearchError(data.error || 'Search failed. Please try again.');
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
      setSearchError('Network error. Please check your connection and try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleImport = async (result: SearchResult) => {
    try {
      const res = await fetch('/api/catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discogsId: result.discogsId,
          title: result.title,
          artist: result.artist,
          year: result.year,
          label: result.label,
          genre: result.genre,
          imageUrl: result.imageUrl,
          catalogNumber: result.catalog,
          format: result.format,
          rpm: result.rpm,
          notes: result.notes
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Record imported successfully!');
        setSearchResults(prev => prev.filter(r => r.id !== result.id));
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import record');
    }
  };

  const handleGetPriceSuggestions = async (result: SearchResult) => {
    setSelectedForPricing(result);
    setLoadingPrices(true);
    try {
      const res = await fetch('/api/marketplace/price_suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discogsId: result.discogsId }),
      });
      const data = await res.json();
      if (data.success) {
        setPriceSuggestions(data.suggestions);
      } else {
        setPriceSuggestions(null);
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err);
      setPriceSuggestions(null);
    } finally {
      setLoadingPrices(false);
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

  const handleCreatePolicy = async () => {
    if (!newPolicyName.trim()) {
      alert('Please enter a strategy name');
      return;
    }
    setPolicyLoading(true);
    try {
      const res = await fetch('/api/pricing/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPolicyName,
          buyPercentage: newBuyPercentage / 100,
          sellPercentage: newSellPercentage / 100,
          description: `Buy at ${newBuyPercentage}% of market price, Sell at ${newSellPercentage}% of market price`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPolicies([data.policy, ...policies]);
        setNewPolicyName('');
        setNewBuyPercentage(55);
        setNewSellPercentage(125);
        alert('Strategy created successfully!');
      } else {
        alert(data.error || 'Failed to create strategy');
      }
    } catch (err) {
      console.error('Error creating policy:', err);
      alert('Failed to create strategy');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleEditPolicy = async () => {
    if (!editingPolicy) return;
    setPolicyLoading(true);
    try {
      const res = await fetch(`/api/pricing/policies/${editingPolicy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingPolicy.name,
          buyPercentage: newBuyPercentage / 100,
          sellPercentage: newSellPercentage / 100,
          description: `Buy at ${newBuyPercentage}% of market price, Sell at ${newSellPercentage}% of market price`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPolicies(policies.map(p => p.id === editingPolicy.id ? data.policy : p));
        setEditingPolicy(null);
        setShowPolicyModal(false);
        alert('Strategy updated successfully!');
      } else {
        alert(data.error || 'Failed to update strategy');
      }
    } catch (err) {
      console.error('Error updating policy:', err);
      alert('Failed to update strategy');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this strategy?')) return;
    try {
      const res = await fetch(`/api/pricing/policies/${policyId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setPolicies(policies.filter(p => p.id !== policyId));
        alert('Strategy deleted successfully!');
      } else {
        alert(data.error || 'Failed to delete strategy');
      }
    } catch (err) {
      console.error('Error deleting policy:', err);
      alert('Failed to delete strategy');
    }
  };

  const handleOpenEditModal = (policy: PricingPolicy) => {
    setEditingPolicy(policy);
    setNewBuyPercentage(Math.round(policy.buyPercentage * 100));
    setNewSellPercentage(Math.round(policy.sellPercentage * 100));
    setShowPolicyModal(true);
  };

  const handleActivatePolicy = async (policyId: string) => {
    try {
      // First, deactivate all policies
      await Promise.all(
        policies
          .filter(p => p.isActive)
          .map(p =>
            fetch(`/api/pricing/policies/${p.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: false }),
            })
          )
      );

      // Then activate the selected one
      const res = await fetch(`/api/pricing/policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      const data = await res.json();
      if (data.success) {
        setPolicies(policies.map(p => ({
          ...p,
          isActive: p.id === policyId
        })));
        alert('Pricing strategy activated!');
      } else {
        alert(data.error || 'Failed to activate strategy');
      }
    } catch (err) {
      console.error('Error activating policy:', err);
      alert('Failed to activate strategy');
    }
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
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 p-8">
            <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">🔍 Search Vinyl Records</h2>
            <p className="text-gray-400 mb-8">Find records from Discogs and eBay to add to your catalog</p>

            <div className="space-y-5 mb-6">
              {/* Search Input */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300 uppercase tracking-wider">What are you looking for?</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g., Pink Floyd, The Beatles, Led Zeppelin..."
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 hover:border-green-500 focus:border-green-400 focus:ring-2 focus:ring-green-500/20 rounded-lg text-white placeholder-gray-500 transition-all"
                  />
                  <span className="absolute right-4 top-3 text-gray-500">🎵</span>
                </div>
              </div>

              {/* Source Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">Search From</label>
                <div className="flex gap-3">
                  <label className="flex-1 relative">
                    <input
                      type="radio"
                      value="discogs"
                      checked={searchSource === 'discogs'}
                      onChange={(e) => setSearchSource(e.target.value as 'discogs' | 'ebay')}
                      className="sr-only"
                    />
                    <div className={`px-4 py-3 rounded-lg border-2 transition-all cursor-pointer text-center font-semibold ${
                      searchSource === 'discogs'
                        ? 'bg-green-600 border-green-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}>
                      🎙️ Discogs
                    </div>
                  </label>
                  <label className="flex-1 relative">
                    <input
                      type="radio"
                      value="ebay"
                      checked={searchSource === 'ebay'}
                      onChange={(e) => setSearchSource(e.target.value as 'discogs' | 'ebay')}
                      className="sr-only"
                    />
                    <div className={`px-4 py-3 rounded-lg border-2 transition-all cursor-pointer text-center font-semibold ${
                      searchSource === 'ebay'
                        ? 'bg-green-600 border-green-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}>
                      🛒 eBay
                    </div>
                  </label>
                </div>
              </div>

              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 hover:border-green-500 focus:border-green-400 focus:ring-2 focus:ring-green-500/20 rounded-lg text-white font-semibold transition-all"
                >
                  <option value="USD">🇺🇸 USD - US Dollar</option>
                  <option value="EUR">🇪🇺 EUR - Euro</option>
                  <option value="GBP">🇬🇧 GBP - British Pound</option>
                  <option value="JPY">🇯🇵 JPY - Japanese Yen</option>
                  <option value="CAD">🇨🇦 CAD - Canadian Dollar</option>
                  <option value="AUD">🇦🇺 AUD - Australian Dollar</option>
                  <option value="CHF">🇨🇭 CHF - Swiss Franc</option>
                  <option value="SEK">🇸🇪 SEK - Swedish Krona</option>
                  <option value="NZD">🇳🇿 NZD - New Zealand Dollar</option>
                </select>
              </div>

              {/* Search Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-green-500/50 disabled:shadow-none"
                >
                  {searchLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Searching...
                    </span>
                  ) : (
                    '🔍 Search'
                  )}
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all duration-300"
                >
                  ⚙️ Filters
                </button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-300 uppercase">Min Year</label>
                    <input
                      type="number"
                      value={filters.minYear}
                      onChange={(e) => setFilters({...filters, minYear: e.target.value})}
                      placeholder="1970"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-300 uppercase">Max Year</label>
                    <input
                      type="number"
                      value={filters.maxYear}
                      onChange={(e) => setFilters({...filters, maxYear: e.target.value})}
                      placeholder="2024"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-300 uppercase">Condition</label>
                    <select
                      value={filters.condition}
                      onChange={(e) => setFilters({...filters, condition: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    >
                      <option value="">Any</option>
                      <option value="Mint">Mint</option>
                      <option value="Near Mint">Near Mint</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-300 uppercase">Genre</label>
                    <input
                      type="text"
                      value={filters.genre}
                      onChange={(e) => setFilters({...filters, genre: e.target.value})}
                      placeholder="e.g., Rock"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-300 uppercase">Label</label>
                    <input
                      type="text"
                      value={filters.label}
                      onChange={(e) => setFilters({...filters, label: e.target.value})}
                      placeholder="e.g., Atlantic"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {searchLoading && (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
                  <p className="text-gray-300">Searching {searchSource === 'discogs' ? 'Discogs' : 'eBay'}...</p>
                </div>
              </div>
            )}

            {searchError && !searchLoading && (
              <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100">
                ⚠️ {searchError}
              </div>
            )}

            {searchResults.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Search Results ({searchResults.length})</h3>
                  <div className="text-sm text-gray-400">
                    {Math.ceil(searchResults.length / resultsPerPage)} results found
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {searchResults.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage).map((result) => (
                    <div key={result.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-all duration-300">
                      {/* Top Bar */}
                      <div className="h-1 bg-gradient-to-r from-green-500 to-blue-500"></div>

                      {/* Main Content */}
                      <div className="p-6">
                        <div className="flex gap-4 mb-4">
                          {/* Album Art */}
                          <div className="flex-shrink-0">
                            {result.imageUrl ? (
                              <img
                                src={result.imageUrl}
                                alt={result.title}
                                className="h-28 w-28 object-cover rounded-lg border border-gray-600"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                                  if (placeholder) placeholder.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div className={`h-28 w-28 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center text-gray-400 text-xs text-center ${result.imageUrl ? 'hidden' : ''}`}>
                              No Cover
                            </div>
                          </div>

                          {/* Title + Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-green-400 mb-2 line-clamp-2">
                              {result.title}
                            </h4>
                            <p className="text-gray-300 text-sm mb-3">
                              <span className="font-semibold">{result.artist}</span>
                              {result.year && <span className="text-gray-500"> • {result.year}</span>}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2.5 py-1.5 bg-blue-900/50 text-blue-300 text-xs border border-blue-700/50 rounded font-mono">
                                ID: {result.discogsId}
                              </span>
                              {result.catalog && (
                                <span className="px-2.5 py-1.5 bg-gray-700/50 text-gray-300 text-xs border border-gray-600/50 rounded truncate">
                                  {result.catalog}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-gray-600 via-gray-700 to-gray-600 mb-4"></div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-gray-700/40 rounded-lg p-3 border border-gray-600/30">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Label</p>
                            <p className="text-white font-medium text-sm truncate">{result.label}</p>
                          </div>
                          <div className="bg-gray-700/40 rounded-lg p-3 border border-gray-600/30">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Genre</p>
                            <p className="text-white font-medium text-sm truncate">{result.genre}</p>
                          </div>
                          <div className="bg-gray-700/40 rounded-lg p-3 border border-gray-600/30">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">RPM</p>
                            <p className="text-white font-medium text-sm">{result.rpm}</p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="bg-gray-700/40 rounded-lg p-3 border border-gray-600/30 mb-4">
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Details</p>
                          <p className="text-gray-300 text-sm line-clamp-3">{result.notes}</p>
                        </div>

                        {/* Price + Action */}
                        <div className="flex gap-3 items-center">
                          <div className="flex-1 bg-gray-900/60 rounded-lg p-3 border border-gray-600/30">
                            {result.price !== null ? (
                              <>
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Market Price ({currency})</p>
                                <p className="text-3xl font-bold text-green-400">{currencySymbols[currency]}{result.price.toFixed(2)}</p>
                                {result.condition && (
                                  <p className="text-gray-500 text-xs mt-1">{result.condition}</p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Price</p>
                                <p className="text-gray-500 text-sm">No active listings</p>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleImport(result)}
                              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs whitespace-nowrap transition-colors duration-200">
                              📥 Import
                            </button>
                            <button
                              onClick={() => handleGetPriceSuggestions(result)}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs whitespace-nowrap transition-colors duration-200">
                              💰 Prices
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {Math.ceil(searchResults.length / resultsPerPage) > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                      ← Previous
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.ceil(searchResults.length / resultsPerPage) }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            currentPage === page
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(searchResults.length / resultsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(searchResults.length / resultsPerPage)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}

            {!searchLoading && !searchError && !searchQuery && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎵</div>
                <p className="text-gray-400 text-lg">Start by searching for an artist or album above</p>
                <p className="text-gray-500 text-sm mt-2">Try searching for Pink Floyd, The Beatles, or any artist you like</p>
              </div>
            )}

            {/* Price Suggestions Modal */}
            {selectedForPricing && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-700 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-green-400">💰 Market Price Suggestions</h3>
                    <button
                      onClick={() => {
                        setSelectedForPricing(null);
                        setPriceSuggestions(null);
                      }}
                      className="text-gray-400 hover:text-white text-2xl leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mb-4 pb-4 border-b border-gray-700">
                    <p className="text-gray-300 font-semibold">{selectedForPricing.title}</p>
                    <p className="text-gray-500">{selectedForPricing.artist} • {selectedForPricing.year}</p>
                  </div>

                  {loadingPrices ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                      <p className="text-gray-400 mt-2">Fetching price data...</p>
                    </div>
                  ) : priceSuggestions ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
                          <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Lowest Price</p>
                          <p className="text-2xl font-bold text-blue-400">{currencySymbols[currency]}{priceSuggestions.lowest?.toFixed(2) || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
                          <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Average Price</p>
                          <p className="text-2xl font-bold text-green-400">{currencySymbols[currency]}{priceSuggestions.average?.toFixed(2) || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
                          <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Highest Price</p>
                          <p className="text-2xl font-bold text-yellow-400">{currencySymbols[currency]}{priceSuggestions.highest?.toFixed(2) || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
                        <p className="text-gray-500 text-xs font-semibold uppercase mb-2">Recent Sales</p>
                        <p className="text-gray-400 text-sm">{priceSuggestions.salesCount || 0} listings found in last 30 days</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No price data available for this record</p>
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedForPricing(null);
                        setPriceSuggestions(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    {selectedForPricing && (
                      <button
                        onClick={() => {
                          handleImport(selectedForPricing);
                          setSelectedForPricing(null);
                          setPriceSuggestions(null);
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                      >
                        Import with Prices
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRICING STRATEGY TAB */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Condition Grading Guide */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-8 border border-blue-700">
              <h2 className="text-2xl font-bold mb-6">📋 Record Condition Grading</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-900/50 p-4 rounded border border-blue-600">
                  <p className="font-bold text-blue-300 mb-2">Mint (M)</p>
                  <p className="text-sm text-gray-300">Perfect condition, never played. Unplayed records still in original shrink wrap.</p>
                </div>
                <div className="bg-blue-900/50 p-4 rounded border border-blue-600">
                  <p className="font-bold text-green-400 mb-2">Near Mint (NM)</p>
                  <p className="text-sm text-gray-300">Appears unplayed. Little or no evidence of wear. May have slight seam splits.</p>
                </div>
                <div className="bg-blue-900/50 p-4 rounded border border-blue-600">
                  <p className="font-bold text-yellow-400 mb-2">Very Good (VG)</p>
                  <p className="text-sm text-gray-300">Shows some signs of play. Minor scratches visible under light. Plays without issues.</p>
                </div>
                <div className="bg-blue-900/50 p-4 rounded border border-blue-600">
                  <p className="font-bold text-orange-400 mb-2">Good (G)</p>
                  <p className="text-sm text-gray-300">Played condition with visible wear. Groove wear visible but plays through. May have surface noise.</p>
                </div>
              </div>
            </div>

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
                    <label className="block text-sm font-semibold mb-2">Buy Strategy</label>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-400">Base Price</label>
                        <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                          <option>Lowest</option>
                          <option>Median</option>
                          <option>Highest</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Buy Percentage (%)</label>
                        <input
                          type="number"
                          value={newBuyPercentage}
                          onChange={(e) => setNewBuyPercentage(parseInt(e.target.value))}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                          placeholder="55"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Offer price = Market price × {newBuyPercentage}%</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Sell Strategy</label>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-400">Base Price</label>
                        <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                          <option>Lowest</option>
                          <option>Median</option>
                          <option>Highest</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Sell Percentage (%)</label>
                        <input
                          type="number"
                          value={newSellPercentage}
                          onChange={(e) => setNewSellPercentage(parseInt(e.target.value))}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                          placeholder="125"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">List price = Market price × {newSellPercentage}%</p>
                  </div>
                </div>

                <button
                  onClick={handleCreatePolicy}
                  disabled={policyLoading}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-bold transition">
                  {policyLoading ? 'Creating...' : 'Create Strategy'}
                </button>
              </div>
            </div>

            {/* Existing Policies */}
            {policies.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-8">
                <h3 className="text-xl font-bold mb-6">Saved Strategies</h3>
                <div className="space-y-3">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className={`p-4 rounded border transition ${
                        policy.isActive
                          ? 'bg-green-900/40 border-green-600'
                          : 'bg-gray-700 hover:bg-gray-650 border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-lg">{policy.name}</h4>
                            {policy.isActive && (
                              <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                                ✓ ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                              <p className="text-gray-400 text-xs uppercase">Buy Strategy</p>
                              <p className="text-green-400 font-semibold">{Math.round(policy.buyPercentage * 100)}% {policy.buyMarketStat ? `(${policy.buyMarketStat})` : ''}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs uppercase">Sell Strategy</p>
                              <p className="text-blue-400 font-semibold">{Math.round(policy.sellPercentage * 100)}% {policy.sellMarketStat ? `(${policy.sellMarketStat})` : ''}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!policy.isActive && (
                            <button
                              onClick={() => handleActivatePolicy(policy.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold transition">
                              ✓ Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(policy)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold transition">
                            ✏️ Edit
                          </button>
                          {!policy.isActive && (
                            <button
                              onClick={() => handleDeletePolicy(policy.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold transition">
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Policy Modal */}
            {showPolicyModal && editingPolicy && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg max-w-lg w-full border border-gray-700 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-green-400">Edit Strategy</h3>
                    <button
                      onClick={() => setShowPolicyModal(false)}
                      className="text-gray-400 hover:text-white text-2xl leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Strategy Name</label>
                      <input
                        type="text"
                        value={editingPolicy.name}
                        onChange={(e) => setEditingPolicy({...editingPolicy, name: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Buy Percentage (%)</label>
                        <input
                          type="number"
                          value={newBuyPercentage}
                          onChange={(e) => setNewBuyPercentage(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">Offer price = Market price × {newBuyPercentage}%</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">Sell Percentage (%)</label>
                        <input
                          type="number"
                          value={newSellPercentage}
                          onChange={(e) => setNewSellPercentage(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">List price = Market price × {newSellPercentage}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPolicyModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditPolicy}
                      disabled={policyLoading}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold transition"
                    >
                      {policyLoading ? 'Updating...' : 'Update Strategy'}
                    </button>
                  </div>
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
                    <span className="text-gray-300 font-semibold">Cost of Goods Sold:</span>
                    <span className="text-white font-bold text-lg">${(analytics.salesRevenue - analytics.totalProfit).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                    <span className="text-gray-300 font-semibold">Total Revenue:</span>
                    <span className="text-green-400 font-bold text-lg">${analytics.salesRevenue.toFixed(2)}</span>
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
