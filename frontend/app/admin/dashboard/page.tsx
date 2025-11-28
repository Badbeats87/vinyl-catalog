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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-light tracking-tight text-gray-900">Admin</h1>
          <div className="flex gap-6 items-center">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 transition"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Tab Navigation */}
        <div className="flex gap-8 mb-12 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`pb-4 text-sm font-medium transition ${
              activeTab === 'submissions'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Submissions
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-4 text-sm font-medium transition ${
              activeTab === 'search'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`pb-4 text-sm font-medium transition ${
              activeTab === 'pricing'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pricing
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-4 text-sm font-medium transition ${
              activeTab === 'analytics'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* SUBMISSIONS TAB */}
        {activeTab === 'submissions' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Total</div>
                <div className="text-3xl font-light text-gray-900">{submissions.length}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Pending</div>
                <div className="text-3xl font-light text-gray-900">{pendingCount}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Approved</div>
                <div className="text-3xl font-light text-gray-900">{approvedCount}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Rejected</div>
                <div className="text-3xl font-light text-gray-900">{rejectedCount}</div>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Seller</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Album</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Artist</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900">{submission.seller}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{submission.album}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{submission.artist}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{submission.submittedAt}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            submission.status === 'pending'
                              ? 'bg-yellow-50 text-yellow-700'
                              : submission.status === 'approved'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {submission.status === 'pending' && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleApprove(submission.id)}
                              className="text-green-600 hover:text-green-700 font-medium transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(submission.id)}
                              className="text-red-600 hover:text-red-700 font-medium transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {submission.status !== 'pending' && (
                          <span className="text-gray-400">—</span>
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
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-light text-gray-900 mb-1">Search Vinyl Records</h2>
              <p className="text-sm text-gray-600">Find records from Discogs and eBay</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-8 bg-white">
              <div className="space-y-6">
                {/* Search Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Artist, album, or catalog number"
                    className="w-full px-4 py-3 border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-lg text-gray-900 placeholder-gray-500 transition-all"
                  />
                </div>

                {/* Source Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Source</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="discogs"
                        checked={searchSource === 'discogs'}
                        onChange={(e) => setSearchSource(e.target.value as 'discogs' | 'ebay')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Discogs</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="ebay"
                        checked={searchSource === 'ebay'}
                        onChange={(e) => setSearchSource(e.target.value as 'discogs' | 'ebay')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">eBay</span>
                    </label>
                  </div>
                </div>

                {/* Currency Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-lg text-gray-900 transition-all"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                    <option value="SEK">SEK - Swedish Krona</option>
                    <option value="NZD">NZD - New Zealand Dollar</option>
                  </select>
                </div>

                {/* Search Button */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
                    className="flex-1 px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    Filters
                  </button>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-6 border-t border-gray-200">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Min Year</label>
                      <input
                        type="number"
                        value={filters.minYear}
                        onChange={(e) => setFilters({...filters, minYear: e.target.value})}
                        placeholder="1970"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Max Year</label>
                      <input
                        type="number"
                        value={filters.maxYear}
                        onChange={(e) => setFilters({...filters, maxYear: e.target.value})}
                        placeholder="2024"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Condition</label>
                      <select
                        value={filters.condition}
                        onChange={(e) => setFilters({...filters, condition: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
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
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Genre</label>
                      <input
                        type="text"
                        value={filters.genre}
                        onChange={(e) => setFilters({...filters, genre: e.target.value})}
                        placeholder="e.g., Rock"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Label</label>
                      <input
                        type="text"
                        value={filters.label}
                        onChange={(e) => setFilters({...filters, label: e.target.value})}
                        placeholder="e.g., Atlantic"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {searchLoading && (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 mb-4"></div>
                  <p className="text-sm text-gray-600">Searching...</p>
                </div>
              </div>
            )}

            {searchError && !searchLoading && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50 text-red-700 text-sm">
                {searchError}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-light text-gray-900">Results ({searchResults.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {searchResults.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage).map((result) => (
                    <div key={result.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                      <div className="p-6 space-y-4">
                        <div className="flex gap-4">
                          {/* Album Art */}
                          <div className="flex-shrink-0">
                            {result.imageUrl ? (
                              <img
                                src={result.imageUrl}
                                alt={result.title}
                                className="h-24 w-24 object-cover rounded border border-gray-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                                  if (placeholder) placeholder.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div className={`h-24 w-24 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-xs text-center ${result.imageUrl ? 'hidden' : ''}`}>
                              No cover
                            </div>
                          </div>

                          {/* Title + Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-medium text-gray-900 line-clamp-2 mb-1">
                              {result.title}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {result.artist}
                              {result.year && <span className="text-gray-500"> • {result.year}</span>}
                            </p>
                            <p className="text-xs text-gray-500 mb-2">{result.label}</p>

                            <div className="flex gap-2 flex-wrap">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {result.genre}
                              </span>
                              {result.catalog && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded truncate">
                                  {result.catalog}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="border-t border-gray-200 pt-4">
                          {result.price !== null ? (
                            <div className="space-y-2">
                              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Market Price</p>
                              <p className="text-2xl font-light text-gray-900">{currencySymbols[currency]}{result.price.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">{result.notes}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No pricing data available</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="border-t border-gray-200 pt-4 flex gap-3">
                          <button
                            onClick={() => handleImport(result)}
                            className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded text-sm transition-colors">
                            Import
                          </button>
                          <button
                            onClick={() => handleGetPriceSuggestions(result)}
                            className="flex-1 px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-900 font-medium rounded text-sm transition-colors">
                            View Prices
                          </button>
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
                      className="px-4 py-2 border border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.ceil(searchResults.length / resultsPerPage) }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded text-sm transition-colors ${
                            currentPage === page
                              ? 'bg-gray-900 text-white'
                              : 'border border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(searchResults.length / resultsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(searchResults.length / resultsPerPage)}
                      className="px-4 py-2 border border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {!searchLoading && !searchError && !searchQuery && (
              <div className="text-center py-16">
                <p className="text-gray-600 text-base">Enter a search query to get started</p>
              </div>
            )}

            {/* Price Suggestions Modal */}
            {selectedForPricing && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full border border-gray-200 p-8">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-light text-gray-900">Price Data</h3>
                    <button
                      onClick={() => {
                        setSelectedForPricing(null);
                        setPriceSuggestions(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <p className="text-base font-medium text-gray-900">{selectedForPricing.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedForPricing.artist} • {selectedForPricing.year}</p>
                  </div>

                  {loadingPrices ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900"></div>
                      <p className="text-gray-600 mt-3 text-sm">Fetching data...</p>
                    </div>
                  ) : priceSuggestions ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Lowest</p>
                          <p className="text-xl font-light text-gray-900">{currencySymbols[currency]}{priceSuggestions.lowest?.toFixed(2) || 'N/A'}</p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Average</p>
                          <p className="text-xl font-light text-gray-900">{currencySymbols[currency]}{priceSuggestions.average?.toFixed(2) || 'N/A'}</p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Highest</p>
                          <p className="text-xl font-light text-gray-900">{currencySymbols[currency]}{priceSuggestions.highest?.toFixed(2) || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Recent Sales</p>
                        <p className="text-sm text-gray-700">{priceSuggestions.salesCount || 0} listings in last 30 days</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">No price data available</p>
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedForPricing(null);
                        setPriceSuggestions(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-900 rounded-lg transition-colors font-medium"
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
                        className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors font-medium"
                      >
                        Import
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
          <div className="space-y-8">
            {/* Condition Grading Guide */}
            <div className="border border-gray-200 rounded-lg p-8">
              <h2 className="text-lg font-light text-gray-900 mb-6">Condition Grading</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">Mint</p>
                  <p className="text-sm text-gray-600">Perfect condition, never played. Original shrink wrap intact.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">Near Mint</p>
                  <p className="text-sm text-gray-600">Appears unplayed. Minimal evidence of wear. Possible slight seam splits.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">Very Good</p>
                  <p className="text-sm text-gray-600">Shows signs of play. Minor scratches. Plays without issues.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">Good</p>
                  <p className="text-sm text-gray-600">Visible wear. Groove wear visible. May have surface noise.</p>
                </div>
              </div>
            </div>

            {/* Create Policy */}
            <div className="border border-gray-200 rounded-lg p-8">
              <h2 className="text-lg font-light text-gray-900 mb-6">Create Strategy</h2>

              <div className="space-y-6 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Name</label>
                  <input
                    type="text"
                    value={newPolicyName}
                    onChange={(e) => setNewPolicyName(e.target.value)}
                    placeholder="e.g., Conservative, Aggressive"
                    className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Buy</label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Base Price</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm">
                          <option>Lowest</option>
                          <option>Median</option>
                          <option>Highest</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Percentage</label>
                        <input
                          type="number"
                          value={newBuyPercentage}
                          onChange={(e) => setNewBuyPercentage(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                          placeholder="55"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Price = Market × {newBuyPercentage}%</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Sell</label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Base Price</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm">
                          <option>Lowest</option>
                          <option>Median</option>
                          <option>Highest</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Percentage</label>
                        <input
                          type="number"
                          value={newSellPercentage}
                          onChange={(e) => setNewSellPercentage(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                          placeholder="125"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Price = Market × {newSellPercentage}%</p>
                  </div>
                </div>

                <button
                  onClick={handleCreatePolicy}
                  disabled={policyLoading}
                  className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded transition">
                  {policyLoading ? 'Creating...' : 'Create Strategy'}
                </button>
              </div>
            </div>

            {/* Existing Policies */}
            {policies.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-8">
                <h3 className="text-lg font-light text-gray-900 mb-6">Saved Strategies</h3>
                <div className="space-y-4">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className={`p-4 rounded-lg border transition ${
                        policy.isActive
                          ? 'bg-gray-50 border-gray-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-medium text-gray-900">{policy.name}</h4>
                            {policy.isActive && (
                              <span className="px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 text-xs uppercase tracking-wide">Buy</p>
                              <p className="text-gray-900 font-medium">{Math.round(policy.buyPercentage * 100)}%</p>
                            </div>
                            <div>
                              <p className="text-gray-600 text-xs uppercase tracking-wide">Sell</p>
                              <p className="text-gray-900 font-medium">{Math.round(policy.sellPercentage * 100)}%</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!policy.isActive && (
                            <button
                              onClick={() => handleActivatePolicy(policy.id)}
                              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded text-xs font-medium transition">
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(policy)}
                            className="px-3 py-1.5 border border-gray-300 hover:border-gray-400 text-gray-900 rounded text-xs font-medium transition">
                            Edit
                          </button>
                          {!policy.isActive && (
                            <button
                              onClick={() => handleDeletePolicy(policy.id)}
                              className="px-3 py-1.5 border border-red-300 hover:border-red-400 text-red-600 rounded text-xs font-medium transition">
                              Delete
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
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-lg w-full border border-gray-200 p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-light text-gray-900">Edit Strategy</h3>
                    <button
                      onClick={() => setShowPolicyModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-6 mb-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Name</label>
                      <input
                        type="text"
                        value={editingPolicy.name}
                        onChange={(e) => setEditingPolicy({...editingPolicy, name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Buy %</label>
                        <input
                          type="number"
                          value={newBuyPercentage}
                          onChange={(e) => setNewBuyPercentage(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900"
                        />
                        <p className="text-xs text-gray-600 mt-2">Market × {newBuyPercentage}%</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sell %</label>
                        <input
                          type="number"
                          value={newSellPercentage}
                          onChange={(e) => setNewSellPercentage(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900"
                        />
                        <p className="text-xs text-gray-600 mt-2">Market × {newSellPercentage}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPolicyModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-900 rounded font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditPolicy}
                      disabled={policyLoading}
                      className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded font-medium transition"
                    >
                      {policyLoading ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Top Level Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-8">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">Inventory Value</p>
                <p className="text-3xl font-light text-gray-900 mb-1">${analytics.inventoryValue.toFixed(2)}</p>
                <p className="text-xs text-gray-600">Total stock</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-8">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">Sales (30d)</p>
                <p className="text-3xl font-light text-gray-900 mb-1">${analytics.salesRevenue.toFixed(2)}</p>
                <p className="text-xs text-gray-600">Revenue</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-8">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">Profit</p>
                <p className="text-3xl font-light text-gray-900 mb-1">${analytics.totalProfit.toFixed(2)}</p>
                <p className="text-xs text-gray-600">Net earnings</p>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-4">Added This Week</p>
                <p className="text-2xl font-light text-gray-900 mb-3">{analytics.addedThisWeek}</p>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900" style={{width: `${Math.min(analytics.addedThisWeek * 10, 100)}%`}}></div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-4">Sold (30d)</p>
                <p className="text-2xl font-light text-gray-900 mb-3">{analytics.recentSalesCount}</p>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900" style={{width: `${Math.min(analytics.recentSalesCount * 10, 100)}%`}}></div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-4">Avg Margin</p>
                <p className="text-2xl font-light text-gray-900 mb-3">{analytics.averageProfitMargin.toFixed(1)}%</p>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900" style={{width: `${Math.min(analytics.averageProfitMargin, 100)}%`}}></div>
                </div>
              </div>
            </div>

            {/* Summary Info */}
            <div className="border border-gray-200 rounded-lg p-8">
              <h3 className="text-lg font-light text-gray-900 mb-6">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Cost of goods sold:</span>
                    <span className="text-gray-900 font-medium">${(analytics.salesRevenue - analytics.totalProfit).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total revenue:</span>
                    <span className="text-gray-900 font-medium">${analytics.salesRevenue.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Profit generated:</span>
                    <span className="text-gray-900 font-medium">${analytics.totalProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average markup:</span>
                    <span className="text-gray-900 font-medium">{analytics.averageProfitMargin.toFixed(2)}%</span>
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
