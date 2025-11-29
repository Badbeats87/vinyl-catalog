'use client';

import { useState, useEffect, useRef } from 'react';
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
  buyMarketSource?: string;
  buyMarketStat?: string;
  sellMarketSource?: string;
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
  const [activeTab, setActiveTab] = useState<'submissions' | 'search' | 'pricing' | 'analytics' | 'inventory'>('submissions');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

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
  const [newBuyMarketSource, setNewBuyMarketSource] = useState('discogs');
  const [newBuyMarketStat, setNewBuyMarketStat] = useState('median');
  const [newSellMarketSource, setNewSellMarketSource] = useState('discogs');
  const [newSellMarketStat, setNewSellMarketStat] = useState('median');
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policySuccess, setPolicySuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PricingPolicy | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Condition discount state and refs
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountSuccess, setDiscountSuccess] = useState(false);
  const [conditionTiers, setConditionTiers] = useState<any[]>([]);

  // Buy discounts
  const mintBuyDiscountRef = useRef<HTMLInputElement>(null);
  const nmBuyDiscountRef = useRef<HTMLInputElement>(null);
  const vgPlusBuyDiscountRef = useRef<HTMLInputElement>(null);
  const vgBuyDiscountRef = useRef<HTMLInputElement>(null);
  const vgMinusBuyDiscountRef = useRef<HTMLInputElement>(null);
  const goodBuyDiscountRef = useRef<HTMLInputElement>(null);

  // Sell discounts
  const mintSellDiscountRef = useRef<HTMLInputElement>(null);
  const nmSellDiscountRef = useRef<HTMLInputElement>(null);
  const vgPlusSellDiscountRef = useRef<HTMLInputElement>(null);
  const vgSellDiscountRef = useRef<HTMLInputElement>(null);
  const vgMinusSellDiscountRef = useRef<HTMLInputElement>(null);
  const goodSellDiscountRef = useRef<HTMLInputElement>(null);

  const [analytics, setAnalytics] = useState<AnalyticStats>({
    inventoryValue: 0,
    addedThisWeek: 0,
    recentSalesCount: 0,
    salesRevenue: 0,
    totalProfit: 0,
    averageProfitMargin: 0,
  });

  // Inventory state
  const [inventory, setInventory] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventoryMetrics, setInventoryMetrics] = useState<any>(null);
  const [inventoryFilters, setInventoryFilters] = useState({
    status: '',
    channel: '',
    minPrice: '',
    maxPrice: ''
  });
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set());
  const [editingLot, setEditingLot] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkUpdateOption, setBulkUpdateOption] = useState<'status' | 'price' | 'channel'>('status');
  const [bulkStatusValue, setBulkStatusValue] = useState('live');
  const [bulkChannelValue, setBulkChannelValue] = useState('web');
  const [bulkPriceType, setBulkPriceType] = useState<'set' | 'increase_amount' | 'increase_percent' | 'decrease_amount' | 'decrease_percent'>('set');
  const [bulkPriceValue, setBulkPriceValue] = useState(0);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [currentInventoryPage, setCurrentInventoryPage] = useState(1);
  const [inventoryPerPage] = useState(20);

  // Creation wizard state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<'release' | 'condition' | 'details' | 'review'>(
    'release'
  );
  const [createSearchQuery, setCreateSearchQuery] = useState('');
  const [createSearchResults, setCreateSearchResults] = useState<SearchResult[]>([]);
  const [createSearchLoading, setCreateSearchLoading] = useState(false);
  const [createManualEntry, setCreateManualEntry] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<SearchResult | null>(null);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    artist: '',
    label: '',
    year: 0,
    conditionMedia: 'Very Good',
    conditionSleeve: 'Very Good',
    costBasis: 0,
    listPrice: 0,
    quantity: 1,
    channel: 'web',
    status: 'draft',
    internalNotes: '',
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Lot detail view state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLot, setDetailLot] = useState<any>(null);

  useEffect(() => {
    if (!user || user.userType !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  // Fetch submissions from API
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setSubmissionsLoading(true);
        setSubmissionsError(null);
        const { token } = useAuthStore.getState();
        const res = await fetch('/api/admin/submissions', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success && data.data?.submissions) {
          // Transform the database records to match the UI format
          const transformed = data.data.submissions.map((submission: any) => ({
            id: submission.id,
            seller: submission.sellerEmail,
            album: submission.items?.[0]?.release?.title || 'Unknown Album',
            artist: submission.items?.[0]?.release?.artist || 'Unknown Artist',
            submittedAt: new Date(submission.createdAt).toISOString().split('T')[0],
            status: submission.status === 'pending_review' ? 'pending' : submission.status,
          }));
          setSubmissions(transformed);
        } else {
          setSubmissionsError(data.error?.message || 'Failed to load submissions');
        }
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setSubmissionsError('Failed to load submissions');
      } finally {
        setSubmissionsLoading(false);
      }
    };

    if (user?.userType === 'admin') {
      fetchSubmissions();
    }
  }, [user]);

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

    // Load condition tiers for discount configuration
    const loadConditionTiers = async () => {
      try {
        const res = await fetch('/api/pricing/conditions');
        const data = await res.json();
        if (data.success) {
          setConditionTiers(data.conditionTiers || []);
        }
      } catch (err) {
        console.error('Failed to load condition tiers:', err);
      }
    };
    loadConditionTiers();
  }, []);

  // Fetch inventory data
  useEffect(() => {
    const fetchInventory = async () => {
      if (activeTab !== 'inventory') return;
      try {
        setInventoryLoading(true);
        setInventoryError(null);
        const { token } = useAuthStore.getState();

        // Build query params from filters
        const params = new URLSearchParams();
        if (inventoryFilters.status) params.append('status', inventoryFilters.status);
        if (inventoryFilters.channel) params.append('channel', inventoryFilters.channel);
        if (inventoryFilters.minPrice) params.append('minPrice', inventoryFilters.minPrice);
        if (inventoryFilters.maxPrice) params.append('maxPrice', inventoryFilters.maxPrice);
        params.append('limit', inventoryPerPage.toString());
        params.append('offset', ((currentInventoryPage - 1) * inventoryPerPage).toString());

        const res = await fetch(`/api/admin/inventory?${params.toString()}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success) {
          setInventory(data.data?.lots || []);
        } else {
          setInventoryError(data.error?.message || 'Failed to load inventory');
        }
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setInventoryError('Failed to load inventory');
      } finally {
        setInventoryLoading(false);
      }
    };

    // Fetch metrics
    const fetchMetrics = async () => {
      if (activeTab !== 'inventory') return;
      try {
        const { token } = useAuthStore.getState();
        const res = await fetch('/api/admin/inventory/metrics', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success) {
          setInventoryMetrics(data.data);
        }
      } catch (err) {
        console.error('Error fetching inventory metrics:', err);
      }
    };

    if (user?.userType === 'admin') {
      fetchInventory();
      fetchMetrics();
    }
  }, [user, activeTab, inventoryFilters, currentInventoryPage, inventoryPerPage]);

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
        body: JSON.stringify({ query: searchQuery, filters, currency, deduplicateByMaster: false }),
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
    // Clear previous messages
    setPolicyError(null);
    setPolicySuccess(false);

    // Client-side validation
    const validationErrors: string[] = [];

    if (!newPolicyName.trim()) {
      validationErrors.push('Strategy name is required');
    } else if (newPolicyName.trim().length > 100) {
      validationErrors.push('Strategy name must not exceed 100 characters');
    }

    const buyPercentageNum = newBuyPercentage / 100;
    const sellPercentageNum = newSellPercentage / 100;

    if (buyPercentageNum <= 0 || buyPercentageNum > 5) {
      validationErrors.push('Buy percentage must be between 1% and 500%');
    }

    if (sellPercentageNum <= 0 || sellPercentageNum > 5) {
      validationErrors.push('Sell percentage must be between 1% and 500%');
    }

    if (validationErrors.length > 0) {
      setPolicyError(validationErrors.join('; '));
      return;
    }

    setPolicyLoading(true);
    try {
      const res = await fetch('/api/pricing/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPolicyName,
          buyPercentage: buyPercentageNum,
          sellPercentage: sellPercentageNum,
          buyMarketSource: newBuyMarketSource,
          buyMarketStat: newBuyMarketStat,
          sellMarketSource: newSellMarketSource,
          sellMarketStat: newSellMarketStat,
          description: `Buy at ${newBuyPercentage}% of ${newBuyMarketStat} ${newBuyMarketSource} price, Sell at ${newSellPercentage}% of ${newSellMarketStat} ${newSellMarketSource} price`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPolicies([data.policy, ...policies]);
        setNewPolicyName('');
        setNewBuyPercentage(55);
        setNewSellPercentage(125);
        setNewBuyMarketSource('discogs');
        setNewBuyMarketStat('median');
        setNewSellMarketSource('discogs');
        setNewSellMarketStat('median');
        setPolicySuccess(true);
        setTimeout(() => setPolicySuccess(false), 4000);
      } else {
        setPolicyError(data.error || 'Failed to create strategy');
      }
    } catch (err) {
      console.error('Error creating policy:', err);
      setPolicyError('Failed to create strategy. Please try again.');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleEditPolicy = async () => {
    if (!editingPolicy) return;

    // Clear previous messages
    setEditError(null);
    setEditSuccess(false);

    // Client-side validation
    const validationErrors: string[] = [];

    if (!editingPolicy.name || editingPolicy.name.trim().length === 0) {
      validationErrors.push('Strategy name is required');
    } else if (editingPolicy.name.trim().length > 100) {
      validationErrors.push('Strategy name must not exceed 100 characters');
    }

    const buyPercentageNum = newBuyPercentage / 100;
    const sellPercentageNum = newSellPercentage / 100;

    if (buyPercentageNum <= 0 || buyPercentageNum > 5) {
      validationErrors.push('Buy percentage must be between 1% and 500%');
    }

    if (sellPercentageNum <= 0 || sellPercentageNum > 5) {
      validationErrors.push('Sell percentage must be between 1% and 500%');
    }

    if (validationErrors.length > 0) {
      setEditError(validationErrors.join('; '));
      return;
    }

    setPolicyLoading(true);
    try {
      const res = await fetch(`/api/pricing/policies/${editingPolicy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingPolicy.name.trim(),
          buyPercentage: buyPercentageNum,
          sellPercentage: sellPercentageNum,
          description: `Buy at ${newBuyPercentage}% of market price, Sell at ${newSellPercentage}% of market price`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPolicies(policies.map(p => p.id === editingPolicy.id ? data.policy : p));
        setEditingPolicy(null);
        setShowPolicyModal(false);
        setEditSuccess(true);
        setTimeout(() => setEditSuccess(false), 4000);
      } else {
        setEditError(data.error || 'Failed to update strategy');
      }
    } catch (err) {
      console.error('Error updating policy:', err);
      setEditError('Failed to update strategy. Please try again.');
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
    setNewBuyMarketSource(policy.buyMarketSource || 'discogs');
    setNewBuyMarketStat(policy.buyMarketStat || 'median');
    setNewSellMarketSource(policy.sellMarketSource || 'discogs');
    setNewSellMarketStat(policy.sellMarketStat || 'median');
    setEditError(null);
    setEditSuccess(false);
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

  const handleSaveDiscounts = async () => {
    setDiscountError(null);
    setDiscountSuccess(false);
    setDiscountLoading(true);

    try {
      // Find the active policy
      const activePolicy = policies.find(p => p.isActive);
      if (!activePolicy) {
        setDiscountError('No active pricing strategy found');
        setDiscountLoading(false);
        return;
      }

      if (!conditionTiers || conditionTiers.length === 0) {
        setDiscountError('Condition tiers not loaded');
        setDiscountLoading(false);
        return;
      }

      // Map condition tier names to IDs
      const tierMap = Object.fromEntries(
        conditionTiers.map((t: any) => [t.name.toLowerCase().replace(/ /g, '-'), t.id])
      );

      // Collect all discount values (both buy and sell for each tier)
      const discounts = [
        {
          conditionTierId: tierMap['mint'],
          buyDiscountPercentage: parseInt(mintBuyDiscountRef.current?.value || '0'),
          sellDiscountPercentage: parseInt(mintSellDiscountRef.current?.value || '0'),
        },
        {
          conditionTierId: tierMap['near-mint'] || tierMap['nm'],
          buyDiscountPercentage: parseInt(nmBuyDiscountRef.current?.value || '0'),
          sellDiscountPercentage: parseInt(nmSellDiscountRef.current?.value || '5'),
        },
        {
          conditionTierId: tierMap['vg+'] || tierMap['vg-plus'],
          buyDiscountPercentage: parseInt(vgPlusBuyDiscountRef.current?.value || '0'),
          sellDiscountPercentage: parseInt(vgPlusSellDiscountRef.current?.value || '15'),
        },
        {
          conditionTierId: tierMap['very-good'] || tierMap['vg'],
          buyDiscountPercentage: parseInt(vgBuyDiscountRef.current?.value || '0'),
          sellDiscountPercentage: parseInt(vgSellDiscountRef.current?.value || '25'),
        },
        {
          conditionTierId: tierMap['vg-'] || tierMap['vg-minus'],
          buyDiscountPercentage: parseInt(vgMinusBuyDiscountRef.current?.value || '0'),
          sellDiscountPercentage: parseInt(vgMinusSellDiscountRef.current?.value || '35'),
        },
        {
          conditionTierId: tierMap['good'] || tierMap['g'],
          buyDiscountPercentage: parseInt(goodBuyDiscountRef.current?.value || '0'),
          sellDiscountPercentage: parseInt(goodSellDiscountRef.current?.value || '50'),
        },
      ].filter(d => d.conditionTierId); // Filter out any missing tier IDs

      if (discounts.length === 0) {
        setDiscountError('Could not map all condition tiers');
        setDiscountLoading(false);
        return;
      }

      // Call the API
      const res = await fetch(`/api/pricing/policies/${activePolicy.id}/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discounts }),
      });

      const data = await res.json();
      if (data.success) {
        setDiscountSuccess(true);
        setTimeout(() => setDiscountSuccess(false), 3000);
      } else {
        setDiscountError(data.error || 'Failed to save discounts');
      }
    } catch (err) {
      console.error('Error saving discounts:', err);
      setDiscountError('An error occurred while saving discounts');
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleCreateLot = async () => {
    try {
      setCreateLoading(true);
      const { token } = useAuthStore.getState();

      // Search for or create the release first
      let releaseId = '';
      if (selectedRelease?.id === 'manual') {
        // Create a release manually
        const prisma = new (await import('@prisma/client')).PrismaClient();
        // For now, we'll just use the title as ID - in production, create via API
        releaseId = createFormData.title.toLowerCase().replace(/\s+/g, '-');
      } else if (selectedRelease?.discogsId) {
        // Use the search result's Discogs ID to find or create release
        releaseId = `discogs-${selectedRelease.discogsId}`;
      }

      // Create the inventory lot
      const res = await fetch('/api/seller/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          discogsId: selectedRelease?.discogsId || 0,
          title: createFormData.title,
          artist: createFormData.artist,
          year: createFormData.year,
          label: createFormData.label,
          genre: '',
          format: 'Vinyl',
          imageUrl: selectedRelease?.imageUrl || '',
          condition: createFormData.conditionMedia,
          buyingPrice: createFormData.costBasis,
          sellingPrice: createFormData.listPrice,
          notes: createFormData.internalNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Lot created successfully!');
        setShowCreateModal(false);
        // Refresh inventory
        window.location.reload();
      } else {
        alert('Failed to create lot: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error creating lot:', err);
      alert('Failed to create lot');
    } finally {
      setCreateLoading(false);
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
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 text-sm font-medium transition ${
              activeTab === 'inventory'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Inventory
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
            {submissionsLoading && (
              <div className="border border-gray-200 rounded-lg p-8 text-center">
                <div className="text-gray-600">Loading submissions...</div>
              </div>
            )}

            {submissionsError && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50 text-red-700 text-sm">
                {submissionsError}
              </div>
            )}

            {!submissionsLoading && !submissionsError && submissions.length === 0 && (
              <div className="border border-gray-200 rounded-lg p-8 text-center">
                <div className="text-gray-600">No submissions yet</div>
              </div>
            )}

            {!submissionsLoading && !submissionsError && submissions.length > 0 && (
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
                    {submissions.map((submission) => {
                      return (
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
                                  onClick={async () => {
                                    try {
                                      const { token } = useAuthStore.getState();
                                      const res = await fetch('/api/admin/submissions/accept', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                        },
                                        body: JSON.stringify({ submissionId: submission.id }),
                                      });
                                      const responseData = await res.json();
                                      if (res.ok && responseData.success) {
                                        handleApprove(submission.id);
                                        // Update inventory with current lots
                                        const inventoryRes = await fetch(`/api/admin/inventory?limit=50&offset=0`, {
                                          headers: {
                                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                          },
                                        });
                                        const inventoryData = await inventoryRes.json();
                                        if (inventoryData.success) {
                                          setInventory(inventoryData.data?.lots || []);
                                          setCurrentInventoryPage(1);
                                        }
                                        // Refetch metrics
                                        const metricsRes = await fetch('/api/admin/inventory/metrics', {
                                          headers: {
                                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                          },
                                        });
                                        const metricsData = await metricsRes.json();
                                        if (metricsData.success) {
                                          setInventoryMetrics(metricsData.data);
                                        }
                                        const lotCount = responseData.data?.createdLots?.length || 0;
                                        alert(`Submission accepted! Created ${lotCount} inventory lot(s).`);
                                      } else {
                                        const errors = responseData.data?.errors || [responseData.error?.message || 'Unknown error'];
                                        alert(`Failed to accept submission:\n${errors.join('\n')}`);
                                      }
                                    } catch (err) {
                                      console.error('Error accepting submission:', err);
                                      alert('Failed to accept submission');
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-700 font-medium transition"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const { token } = useAuthStore.getState();
                                      const res = await fetch('/api/admin/submissions/reject', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                        },
                                        body: JSON.stringify({ submissionId: submission.id }),
                                      });
                                      if (res.ok) {
                                        handleReject(submission.id);
                                        alert('Submission rejected');
                                      } else {
                                        alert('Failed to reject submission');
                                      }
                                    } catch (err) {
                                      console.error('Error rejecting submission:', err);
                                      alert('Failed to reject submission');
                                    }
                                  }}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
                        <div className="border-t border-gray-200 pt-4 space-y-2">
                          <div className="flex gap-3">
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
                          <button
                            onClick={() => {
                              setShowCreateModal(true);
                              setCreateStep('condition');
                              setSelectedRelease(result);
                              setCreateFormData({
                                title: result.title,
                                artist: result.artist,
                                label: result.label,
                                year: result.year || 0,
                                conditionMedia: 'Very Good',
                                conditionSleeve: 'Very Good',
                                costBasis: 0,
                                listPrice: result.price || 0,
                                quantity: 1,
                                channel: 'web',
                                status: 'draft',
                                internalNotes: '',
                              });
                            }}
                            className="w-full px-4 py-2 border border-blue-300 hover:bg-blue-50 text-blue-700 font-medium rounded text-sm transition-colors">
                            + Add to Inventory
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

              {policyError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {policyError}
                </div>
              )}

              {policySuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  Strategy created successfully!
                </div>
              )}

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
                        <label className="block text-xs text-gray-600 mb-1">Market Source</label>
                        <select
                          value={newBuyMarketSource}
                          onChange={(e) => setNewBuyMarketSource(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                        >
                          <option value="discogs">Discogs</option>
                          <option value="ebay">eBay</option>
                          <option value="hybrid">Hybrid (Avg)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Price Statistic</label>
                        <select
                          value={newBuyMarketStat}
                          onChange={(e) => setNewBuyMarketStat(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                        >
                          <option value="low">Lowest</option>
                          <option value="median">Median</option>
                          <option value="high">Highest</option>
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
                    <p className="text-xs text-gray-600 mt-2">Buy at {newBuyPercentage}% of {newBuyMarketStat} {newBuyMarketSource} price</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Sell</label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Market Source</label>
                        <select
                          value={newSellMarketSource}
                          onChange={(e) => setNewSellMarketSource(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                        >
                          <option value="discogs">Discogs</option>
                          <option value="ebay">eBay</option>
                          <option value="hybrid">Hybrid (Avg)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Price Statistic</label>
                        <select
                          value={newSellMarketStat}
                          onChange={(e) => setNewSellMarketStat(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                        >
                          <option value="low">Lowest</option>
                          <option value="median">Median</option>
                          <option value="high">Highest</option>
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
                    <p className="text-xs text-gray-600 mt-2">Sell at {newSellPercentage}% of {newSellMarketStat} {newSellMarketSource} price</p>
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

            {/* Condition Discounts Configuration */}
            {policies.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-8">
                <h2 className="text-lg font-light text-gray-900 mb-6">Condition Discounts</h2>
                <p className="text-sm text-gray-600 mb-6">Set separate discounts for buying (what you pay sellers) and selling (what customers pay) for each condition tier</p>

                <div className="space-y-6">
                  {/* Mint */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Mint (Premium)</h3>
                    <p className="text-xs text-gray-600 mb-4">Premium condition - minimal or no wear</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Buy Discount %</label>
                        <input
                          ref={mintBuyDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sell Discount %</label>
                        <input
                          ref={mintSellDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Near Mint */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Near Mint (NM)</h3>
                    <p className="text-xs text-gray-600 mb-4">Nearly perfect with minimal wear</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Buy Discount %</label>
                        <input
                          ref={nmBuyDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sell Discount %</label>
                        <input
                          ref={nmSellDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="5"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* VG+ */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">VG+ (Very Good Plus)</h3>
                    <p className="text-xs text-gray-600 mb-4">Vinyl and sleeve show minor signs of wear</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Buy Discount %</label>
                        <input
                          ref={vgPlusBuyDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sell Discount %</label>
                        <input
                          ref={vgPlusSellDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="15"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="15"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Very Good */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Very Good (VG)</h3>
                    <p className="text-xs text-gray-600 mb-4">Vinyl and sleeve show visible signs of wear</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Buy Discount %</label>
                        <input
                          ref={vgBuyDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sell Discount %</label>
                        <input
                          ref={vgSellDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="25"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="25"
                        />
                      </div>
                    </div>
                  </div>

                  {/* VG- */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">VG- (Very Good Minus)</h3>
                    <p className="text-xs text-gray-600 mb-4">Vinyl and sleeve show significant wear</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Buy Discount %</label>
                        <input
                          ref={vgMinusBuyDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sell Discount %</label>
                        <input
                          ref={vgMinusSellDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="35"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="35"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Good */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Good (G)</h3>
                    <p className="text-xs text-gray-600 mb-4">Vinyl and sleeve show heavy wear - acceptable but playing/quality affected</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Buy Discount %</label>
                        <input
                          ref={goodBuyDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sell Discount %</label>
                        <input
                          ref={goodSellDiscountRef}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="50"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                          placeholder="50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {discountError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                    {discountError}
                  </div>
                )}

                {discountSuccess && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
                    Discounts saved successfully!
                  </div>
                )}

                <button
                  onClick={handleSaveDiscounts}
                  disabled={discountLoading}
                  className="w-full mt-4 px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded transition"
                >
                  {discountLoading ? 'Saving...' : 'Save Discounts'}
                </button>
              </div>
            )}

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

                  {editError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {editError}
                    </div>
                  )}

                  {editSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      Strategy updated successfully!
                    </div>
                  )}

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

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-8">
            {/* Create Lot Button */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setCreateStep('release');
                  setSelectedRelease(null);
                  setCreateManualEntry(false);
                  setCreateSearchQuery('');
                  setCreateSearchResults([]);
                  setCreateFormData({
                    title: '',
                    artist: '',
                    label: '',
                    year: 0,
                    conditionMedia: 'Very Good',
                    conditionSleeve: 'Very Good',
                    costBasis: 0,
                    listPrice: 0,
                    quantity: 1,
                    channel: 'web',
                    status: 'draft',
                    internalNotes: '',
                  });
                }}
                className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition"
              >
                + Create Lot
              </button>
            </div>

            {/* Metrics Dashboard */}
            {inventoryMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Total Lots</div>
                  <div className="text-3xl font-light text-gray-900">{inventoryMetrics.totalLots || 0}</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Inventory Value</div>
                  <div className="text-3xl font-light text-gray-900">${(inventoryMetrics.totalValue || 0).toFixed(2)}</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Cost Basis</div>
                  <div className="text-3xl font-light text-gray-900">${(inventoryMetrics.totalCost || 0).toFixed(2)}</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Potential Profit</div>
                  <div className="text-3xl font-light text-gray-900">${(inventoryMetrics.potentialProfit || 0).toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Status Breakdown */}
            {inventoryMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Draft</div>
                  <div className="text-2xl font-light text-gray-900">{inventoryMetrics.statusBreakdown?.draft || 0}</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Live</div>
                  <div className="text-2xl font-light text-gray-900">{inventoryMetrics.statusBreakdown?.live || 0}</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Reserved</div>
                  <div className="text-2xl font-light text-gray-900">{inventoryMetrics.statusBreakdown?.reserved || 0}</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Sold</div>
                  <div className="text-2xl font-light text-gray-900">{inventoryMetrics.statusBreakdown?.sold || 0}</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Returned</div>
                  <div className="text-2xl font-light text-gray-900">{inventoryMetrics.statusBreakdown?.returned || 0}</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Damaged</div>
                  <div className="text-2xl font-light text-gray-900">{inventoryMetrics.statusBreakdown?.damaged || 0}</div>
                </div>
              </div>
            )}

            {/* Filter Controls */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Status</label>
                  <select
                    value={inventoryFilters.status}
                    onChange={(e) => {
                      setInventoryFilters({...inventoryFilters, status: e.target.value});
                      setCurrentInventoryPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                  >
                    <option value="">All</option>
                    <option value="draft">Draft</option>
                    <option value="live">Live</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                    <option value="returned">Returned</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Channel</label>
                  <select
                    value={inventoryFilters.channel}
                    onChange={(e) => {
                      setInventoryFilters({...inventoryFilters, channel: e.target.value});
                      setCurrentInventoryPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                  >
                    <option value="">All</option>
                    <option value="web">Web</option>
                    <option value="store_walkIn">Store Walk-In</option>
                    <option value="discogs">Discogs</option>
                    <option value="ebay">eBay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Min Price</label>
                  <input
                    type="number"
                    value={inventoryFilters.minPrice}
                    onChange={(e) => {
                      setInventoryFilters({...inventoryFilters, minPrice: e.target.value});
                      setCurrentInventoryPage(1);
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Max Price</label>
                  <input
                    type="number"
                    value={inventoryFilters.maxPrice}
                    onChange={(e) => {
                      setInventoryFilters({...inventoryFilters, maxPrice: e.target.value});
                      setCurrentInventoryPage(1);
                    }}
                    placeholder="999999"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setInventoryFilters({status: '', channel: '', minPrice: '', maxPrice: ''});
                      setCurrentInventoryPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-900 rounded text-sm font-medium transition"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            {inventoryLoading && (
              <div className="border border-gray-200 rounded-lg p-8 text-center">
                <div className="text-gray-600">Loading inventory...</div>
              </div>
            )}

            {inventoryError && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50 text-red-700 text-sm">
                {inventoryError}
              </div>
            )}

            {!inventoryLoading && !inventoryError && inventory.length === 0 && (
              <div className="border border-gray-200 rounded-lg p-8 text-center">
                <div className="text-gray-600">No inventory items found</div>
              </div>
            )}

            {/* Bulk Selection Banner */}
            {selectedLots.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
                <span className="text-sm text-blue-700 font-medium">{selectedLots.size} lot{selectedLots.size !== 1 ? 's' : ''} selected</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedLots(new Set())}
                    className="px-3 py-2 text-sm border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={() => {
                      // Will open bulk actions modal
                      setShowBulkModal(true);
                    }}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Bulk Actions
                  </button>
                </div>
              </div>
            )}

            {!inventoryLoading && !inventoryError && inventory.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      // Generate CSV from inventory data
                      const headers = ['Lot #', 'Album', 'Artist', 'Cost', 'Price', 'Qty', 'Status', 'Channel', 'Condition', 'Notes'];
                      const rows = inventory.map(lot => [
                        lot.lotNumber,
                        lot.release?.title || 'Unknown',
                        lot.release?.artist || 'Unknown',
                        lot.costBasis?.toFixed(2) || '0.00',
                        lot.listPrice?.toFixed(2) || '0.00',
                        lot.quantity,
                        lot.status,
                        lot.channel,
                        `${lot.conditionMedia} / ${lot.conditionSleeve}`,
                        lot.internalNotes || '',
                      ]);

                      const csvContent = [
                        headers.join(','),
                        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
                      ].join('\n');

                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-900 rounded-lg text-sm font-medium transition"
                  >
                    ↓ Export to CSV
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <input
                          type="checkbox"
                          checked={selectedLots.size === inventory.length && inventory.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLots(new Set(inventory.map(lot => lot.id)));
                            } else {
                              setSelectedLots(new Set());
                            }
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Lot #</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Album</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Artist</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Cost</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Price</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Channel</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((lot) => {
                      return (
                        <tr key={lot.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedLots.has(lot.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedLots);
                                if (e.target.checked) {
                                  newSelected.add(lot.id);
                                } else {
                                  newSelected.delete(lot.id);
                                }
                                setSelectedLots(newSelected);
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => {
                                setDetailLot(lot);
                                setShowDetailModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium transition"
                            >
                              {lot.lotNumber}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{lot.release?.title || 'Unknown Album'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{lot.release?.artist || 'Unknown Artist'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">${lot.costBasis?.toFixed(2) || '0.00'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <input
                              type="number"
                              value={lot.listPrice || 0}
                              onChange={async (e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                try {
                                  const { token } = useAuthStore.getState();
                                  const res = await fetch(`/api/admin/inventory`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                    body: JSON.stringify({
                                      id: lot.id,
                                      listPrice: newPrice,
                                    }),
                                  });
                                  if (res.ok) {
                                    setInventory(prev => prev.map(l => l.id === lot.id ? {...l, listPrice: newPrice} : l));
                                  }
                                } catch (err) {
                                  console.error('Error updating price:', err);
                                }
                              }}
                              step="0.01"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{lot.quantity}</td>
                          <td className="px-6 py-4">
                            <select
                              value={lot.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                  const { token } = useAuthStore.getState();
                                  const res = await fetch(`/api/admin/inventory`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                    body: JSON.stringify({
                                      id: lot.id,
                                      status: newStatus,
                                    }),
                                  });
                                  if (res.ok) {
                                    setInventory(prev => prev.map(l => l.id === lot.id ? {...l, status: newStatus} : l));
                                  }
                                } catch (err) {
                                  console.error('Error updating status:', err);
                                }
                              }}
                              className={`px-2 py-1 rounded text-xs font-medium border ${
                                lot.status === 'draft'
                                  ? 'bg-gray-100 text-gray-700'
                                  : lot.status === 'live'
                                  ? 'bg-green-50 text-green-700'
                                  : lot.status === 'reserved'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : lot.status === 'sold'
                                  ? 'bg-blue-50 text-blue-700'
                                  : lot.status === 'returned'
                                  ? 'bg-orange-50 text-orange-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              <option value="draft">Draft</option>
                              <option value="live">Live</option>
                              <option value="reserved">Reserved</option>
                              <option value="sold">Sold</option>
                              <option value="returned">Returned</option>
                              <option value="damaged">Damaged</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {lot.channel === 'store_walkIn' ? 'Store Walk-In' : lot.channel?.charAt(0).toUpperCase() + lot.channel?.slice(1)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => {
                                setEditingLot(lot);
                                setShowEditModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium transition"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {!inventoryLoading && inventory.length > 0 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-600">
                  Showing {((currentInventoryPage - 1) * inventoryPerPage) + 1} - {Math.min(currentInventoryPage * inventoryPerPage, inventory.length)} of ~{inventoryMetrics?.totalLots || 0}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentInventoryPage(Math.max(1, currentInventoryPage - 1))}
                    disabled={currentInventoryPage === 1}
                    className="px-4 py-2 border border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 rounded text-sm font-medium transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentInventoryPage(currentInventoryPage + 1)}
                    disabled={inventory.length < inventoryPerPage}
                    className="px-4 py-2 border border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 rounded text-sm font-medium transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Lot Detail Modal */}
            {showDetailModal && detailLot && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-2xl font-light text-gray-900">Lot {detailLot.lotNumber}</h2>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-6">
                    {/* Release Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Release Information</h3>
                      <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Title:</span>
                          <span className="text-gray-900 font-medium">{detailLot.release?.title || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Artist:</span>
                          <span className="text-gray-900 font-medium">{detailLot.release?.artist || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Condition & Pricing */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Condition & Pricing</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-xs text-gray-600 uppercase mb-2">Media Condition</div>
                          <div className="text-gray-900 font-medium">{detailLot.conditionMedia}</div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-xs text-gray-600 uppercase mb-2">Sleeve Condition</div>
                          <div className="text-gray-900 font-medium">{detailLot.conditionSleeve}</div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-xs text-gray-600 uppercase mb-2">Cost Basis</div>
                          <div className="text-gray-900 font-medium">${detailLot.costBasis?.toFixed(2)}</div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-xs text-gray-600 uppercase mb-2">List Price</div>
                          <div className="text-gray-900 font-medium">${detailLot.listPrice?.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Inventory Details */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Inventory Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-xs text-gray-600 uppercase mb-2">Quantity</div>
                          <div className="text-gray-900 font-medium">{detailLot.quantity}</div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-xs text-gray-600 uppercase mb-2">Channel</div>
                          <div className="text-gray-900 font-medium">
                            {detailLot.channel === 'store_walkIn' ? 'Store Walk-In' : detailLot.channel}
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-xs text-gray-600 uppercase mb-2">Status</div>
                          <div className="text-gray-900 font-medium">{detailLot.status}</div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-xs text-gray-600 uppercase mb-2">Created</div>
                          <div className="text-gray-900 font-medium">
                            {new Date(detailLot.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Internal Notes */}
                    {detailLot.internalNotes && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Internal Notes</h3>
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-gray-900">
                          {detailLot.internalNotes}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t border-gray-200 p-6 flex gap-3 bg-gray-50">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="flex-1 px-4 py-3 border border-gray-300 hover:border-gray-400 text-gray-900 rounded-lg font-medium transition"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setEditingLot(detailLot);
                        setShowEditModal(true);
                        setShowDetailModal(false);
                      }}
                      className="flex-1 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition"
                    >
                      Edit Lot
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create Lot Wizard Modal */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-2xl font-light text-gray-900">
                      {createStep === 'release'
                        ? 'Select Release'
                        : createStep === 'condition'
                        ? 'Condition & Pricing'
                        : createStep === 'details'
                        ? 'Inventory Details'
                        : 'Review & Create'}
                    </h2>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-6">
                    {/* Step 1: Select Release */}
                    {createStep === 'release' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Search Method</label>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setCreateManualEntry(false)}
                              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                                !createManualEntry
                                  ? 'bg-gray-900 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              Search Discogs
                            </button>
                            <button
                              onClick={() => setCreateManualEntry(true)}
                              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                                createManualEntry
                                  ? 'bg-gray-900 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              Enter Manually
                            </button>
                          </div>
                        </div>

                        {!createManualEntry ? (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Search Query</label>
                              <input
                                type="text"
                                value={createSearchQuery}
                                onChange={(e) => setCreateSearchQuery(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCreateSearch();
                                  }
                                }}
                                placeholder="Artist, album, or catalog number"
                                className="w-full px-4 py-3 border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-lg text-gray-900 transition-all"
                              />
                            </div>
                            <button
                              onClick={async () => {
                                if (!createSearchQuery.trim()) return;
                                setCreateSearchLoading(true);
                                try {
                                  const res = await fetch('/api/search/discogs', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ query: createSearchQuery, currency, deduplicateByMaster: false }),
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    setCreateSearchResults(data.results || []);
                                  }
                                } catch (err) {
                                  console.error('Search failed:', err);
                                } finally {
                                  setCreateSearchLoading(false);
                                }
                              }}
                              disabled={createSearchLoading || !createSearchQuery.trim()}
                              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                            >
                              {createSearchLoading ? 'Searching...' : 'Search'}
                            </button>

                            {createSearchResults.length > 0 && (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {createSearchResults.map((result) => (
                                  <button
                                    key={result.id}
                                    onClick={() => {
                                      setSelectedRelease(result);
                                      setCreateFormData({
                                        ...createFormData,
                                        title: result.title,
                                        artist: result.artist,
                                        label: result.label,
                                        year: result.year || 0,
                                      });
                                    }}
                                    className="w-full text-left px-4 py-3 border border-gray-200 hover:border-gray-400 rounded-lg transition"
                                  >
                                    <div className="font-medium text-gray-900">{result.title}</div>
                                    <div className="text-sm text-gray-600">{result.artist} • {result.year}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Title</label>
                              <input
                                type="text"
                                value={createFormData.title}
                                onChange={(e) => setCreateFormData({...createFormData, title: e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Artist</label>
                              <input
                                type="text"
                                value={createFormData.artist}
                                onChange={(e) => setCreateFormData({...createFormData, artist: e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Label</label>
                                <input
                                  type="text"
                                  value={createFormData.label}
                                  onChange={(e) => setCreateFormData({...createFormData, label: e.target.value})}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Year</label>
                                <input
                                  type="number"
                                  value={createFormData.year}
                                  onChange={(e) => setCreateFormData({...createFormData, year: parseInt(e.target.value) || 0})}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedRelease({
                                  id: 'manual',
                                  discogsId: 0,
                                  title: createFormData.title,
                                  artist: createFormData.artist,
                                  year: createFormData.year,
                                  label: createFormData.label,
                                  price: null,
                                  condition: null,
                                  imageUrl: '',
                                  genre: '',
                                  format: '',
                                  rpm: 0,
                                  pressType: '',
                                  catalog: '',
                                  notes: '',
                                });
                              }}
                              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition"
                            >
                              Continue
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 2: Condition & Pricing */}
                    {createStep === 'condition' && selectedRelease && (
                      <div className="space-y-4">
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="font-medium text-gray-900">{selectedRelease.title}</div>
                          <div className="text-sm text-gray-600">{selectedRelease.artist}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Media Condition</label>
                            <select
                              value={createFormData.conditionMedia}
                              onChange={(e) => setCreateFormData({...createFormData, conditionMedia: e.target.value})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                            >
                              <option>Mint</option>
                              <option>Near Mint</option>
                              <option>Very Good Plus</option>
                              <option>Very Good</option>
                              <option>Good Plus</option>
                              <option>Good</option>
                              <option>Fair</option>
                              <option>Poor</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sleeve Condition</label>
                            <select
                              value={createFormData.conditionSleeve}
                              onChange={(e) => setCreateFormData({...createFormData, conditionSleeve: e.target.value})}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                            >
                              <option>Mint</option>
                              <option>Near Mint</option>
                              <option>Very Good Plus</option>
                              <option>Very Good</option>
                              <option>Good Plus</option>
                              <option>Good</option>
                              <option>Fair</option>
                              <option>Poor</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Cost Basis ($)</label>
                            <input
                              type="number"
                              value={createFormData.costBasis}
                              onChange={(e) => setCreateFormData({...createFormData, costBasis: parseFloat(e.target.value) || 0})}
                              step="0.01"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">List Price ($)</label>
                            <input
                              type="number"
                              value={createFormData.listPrice}
                              onChange={(e) => setCreateFormData({...createFormData, listPrice: parseFloat(e.target.value) || 0})}
                              step="0.01"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                            />
                          </div>
                        </div>
                        {createFormData.costBasis > 0 && createFormData.listPrice > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                            <span className="text-gray-600">Margin: </span>
                            <span className="font-medium text-blue-700">
                              {(((createFormData.listPrice - createFormData.costBasis) / createFormData.costBasis) * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 3: Inventory Details */}
                    {createStep === 'details' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Quantity</label>
                          <input
                            type="number"
                            value={createFormData.quantity}
                            onChange={(e) => setCreateFormData({...createFormData, quantity: parseInt(e.target.value) || 1})}
                            min="1"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Channel</label>
                          <select
                            value={createFormData.channel}
                            onChange={(e) => setCreateFormData({...createFormData, channel: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                          >
                            <option value="web">Web</option>
                            <option value="store_walkIn">Store Walk-In</option>
                            <option value="discogs">Discogs</option>
                            <option value="ebay">eBay</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Status</label>
                          <select
                            value={createFormData.status}
                            onChange={(e) => setCreateFormData({...createFormData, status: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                          >
                            <option value="draft">Draft</option>
                            <option value="live">Live</option>
                            <option value="reserved">Reserved</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Internal Notes</label>
                          <textarea
                            value={createFormData.internalNotes}
                            onChange={(e) => setCreateFormData({...createFormData, internalNotes: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 4: Review & Create */}
                    {createStep === 'review' && selectedRelease && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="border border-gray-200 rounded-lg p-4">
                            <div className="text-xs text-gray-600 uppercase mb-1">Title</div>
                            <div className="font-medium text-gray-900">{createFormData.title}</div>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <div className="text-xs text-gray-600 uppercase mb-1">Artist</div>
                            <div className="font-medium text-gray-900">{createFormData.artist}</div>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <div className="text-xs text-gray-600 uppercase mb-1">Cost</div>
                            <div className="font-medium text-gray-900">${createFormData.costBasis.toFixed(2)}</div>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <div className="text-xs text-gray-600 uppercase mb-1">Price</div>
                            <div className="font-medium text-gray-900">${createFormData.listPrice.toFixed(2)}</div>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <div className="text-xs text-gray-600 uppercase mb-1">Qty</div>
                            <div className="font-medium text-gray-900">{createFormData.quantity}</div>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <div className="text-xs text-gray-600 uppercase mb-1">Channel</div>
                            <div className="font-medium text-gray-900">{createFormData.channel === 'store_walkIn' ? 'Store Walk-In' : createFormData.channel}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t border-gray-200 p-6 flex gap-3 bg-gray-50">
                    <button
                      onClick={() => {
                        if (createStep === 'release') {
                          setShowCreateModal(false);
                        } else if (createStep === 'condition') {
                          setCreateStep('release');
                          setSelectedRelease(null);
                        } else if (createStep === 'details') {
                          setCreateStep('condition');
                        } else {
                          setCreateStep('details');
                        }
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 hover:border-gray-400 text-gray-900 rounded-lg font-medium transition"
                    >
                      {createStep === 'release' ? 'Cancel' : 'Back'}
                    </button>
                    <button
                      onClick={() => {
                        if (createStep === 'release' && !selectedRelease) {
                          alert('Please select a release');
                          return;
                        }
                        if (createStep === 'release') {
                          setCreateStep('condition');
                        } else if (createStep === 'condition') {
                          setCreateStep('details');
                        } else if (createStep === 'details') {
                          setCreateStep('review');
                        } else {
                          // Create the lot
                          handleCreateLot();
                        }
                      }}
                      disabled={createLoading}
                      className="flex-1 px-4 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                    >
                      {createLoading
                        ? 'Creating...'
                        : createStep === 'review'
                        ? 'Create Lot'
                        : 'Next'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Actions Modal */}
            {showBulkModal && selectedLots.size > 0 && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-2xl font-light text-gray-900">Bulk Update {selectedLots.size} Lot{selectedLots.size !== 1 ? 's' : ''}</h2>
                    <button
                      onClick={() => setShowBulkModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-6">
                    {/* Summary */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Selected Lots</h3>
                      <div className="text-sm text-gray-600">
                        {Array.from(selectedLots).slice(0, 5).join(', ')}{selectedLots.size > 5 ? ` +${selectedLots.size - 5} more` : ''}
                      </div>
                    </div>

                    {/* Update Options */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Update Type</label>
                        <div className="grid grid-cols-3 gap-3">
                          <label className="flex items-center gap-2 p-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50" onClick={() => setBulkUpdateOption('status')}>
                            <input type="radio" name="updateType" checked={bulkUpdateOption === 'status'} readOnly className="w-4 h-4" />
                            <span className="text-sm text-gray-700">Status</span>
                          </label>
                          <label className="flex items-center gap-2 p-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50" onClick={() => setBulkUpdateOption('price')}>
                            <input type="radio" name="updateType" checked={bulkUpdateOption === 'price'} readOnly className="w-4 h-4" />
                            <span className="text-sm text-gray-700">Price</span>
                          </label>
                          <label className="flex items-center gap-2 p-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50" onClick={() => setBulkUpdateOption('channel')}>
                            <input type="radio" name="updateType" checked={bulkUpdateOption === 'channel'} readOnly className="w-4 h-4" />
                            <span className="text-sm text-gray-700">Channel</span>
                          </label>
                        </div>
                      </div>

                      {/* Status Option */}
                      {bulkUpdateOption === 'status' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Change Status To</label>
                          <select
                            value={bulkStatusValue}
                            onChange={(e) => setBulkStatusValue(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-lg text-gray-900 transition-all"
                          >
                            <option value="draft">Draft</option>
                            <option value="live">Live</option>
                            <option value="reserved">Reserved</option>
                            <option value="sold">Sold</option>
                            <option value="returned">Returned</option>
                            <option value="damaged">Damaged</option>
                          </select>
                        </div>
                      )}

                      {/* Channel Option */}
                      {bulkUpdateOption === 'channel' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Change Channel To</label>
                          <select
                            value={bulkChannelValue}
                            onChange={(e) => setBulkChannelValue(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-lg text-gray-900 transition-all"
                          >
                            <option value="web">Web</option>
                            <option value="store_walkIn">Store Walk-In</option>
                            <option value="discogs">Discogs</option>
                            <option value="ebay">eBay</option>
                          </select>
                        </div>
                      )}

                      {/* Price Options */}
                      {bulkUpdateOption === 'price' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Price Update Type</label>
                            <select
                              value={bulkPriceType}
                              onChange={(e) => setBulkPriceType(e.target.value as any)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                            >
                              <option value="set">Set to specific value</option>
                              <option value="increase_amount">Increase by $ amount</option>
                              <option value="increase_percent">Increase by % percentage</option>
                              <option value="decrease_amount">Decrease by $ amount</option>
                              <option value="decrease_percent">Decrease by % percentage</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                              {bulkPriceType === 'set' ? 'New Price' : bulkPriceType.includes('percent') ? 'Percentage' : 'Amount'}
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-3 text-gray-600">
                                {bulkPriceType === 'set' ? '$' : bulkPriceType.includes('percent') ? '%' : '$'}
                              </span>
                              <input
                                type="number"
                                value={bulkPriceValue}
                                onChange={(e) => setBulkPriceValue(parseFloat(e.target.value) || 0)}
                                step="0.01"
                                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t border-gray-200 p-6 flex gap-3 bg-gray-50">
                    <button
                      onClick={() => setShowBulkModal(false)}
                      disabled={bulkLoading}
                      className="flex-1 px-4 py-3 border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-900 rounded-lg font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setBulkLoading(true);
                          const { token } = useAuthStore.getState();

                          const updates: any = {};
                          if (bulkUpdateOption === 'status') {
                            updates.status = bulkStatusValue;
                          } else if (bulkUpdateOption === 'channel') {
                            updates.channel = bulkChannelValue;
                          } else if (bulkUpdateOption === 'price') {
                            updates.priceUpdate = {
                              type: bulkPriceType,
                              value: bulkPriceValue,
                            };
                          }

                          const res = await fetch(`/api/admin/inventory/bulk-update`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                              lotIds: Array.from(selectedLots),
                              updates,
                            }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setShowBulkModal(false);
                            setSelectedLots(new Set());
                            // Refresh inventory list
                            window.location.reload();
                          } else {
                            alert('Failed to update lots: ' + (data.error?.message || 'Unknown error'));
                          }
                        } catch (err) {
                          console.error('Error updating lots:', err);
                          alert('Failed to update lots');
                        } finally {
                          setBulkLoading(false);
                        }
                      }}
                      disabled={bulkLoading}
                      className="flex-1 px-4 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                    >
                      {bulkLoading ? 'Updating...' : 'Apply Updates'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Lot Modal */}
            {showEditModal && editingLot && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-2xl font-light text-gray-900">Edit Lot {editingLot.lotNumber}</h2>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-6">
                    {/* Release Info (Read-only) */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Release Info</h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-600">Title:</span> <span className="text-gray-900 font-medium">{editingLot.release?.title || 'Unknown'}</span></div>
                        <div><span className="text-gray-600">Artist:</span> <span className="text-gray-900 font-medium">{editingLot.release?.artist || 'Unknown'}</span></div>
                        <div><span className="text-gray-600">Condition:</span> <span className="text-gray-900 font-medium">{editingLot.conditionMedia} / {editingLot.conditionSleeve}</span></div>
                      </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">List Price</label>
                        <div className="relative">
                          <span className="absolute left-4 top-3 text-gray-600">$</span>
                          <input
                            type="number"
                            value={editingLot.listPrice || 0}
                            onChange={(e) => setEditingLot({...editingLot, listPrice: parseFloat(e.target.value) || 0})}
                            step="0.01"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-lg text-gray-900 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Status</label>
                        <select
                          value={editingLot.status}
                          onChange={(e) => setEditingLot({...editingLot, status: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-lg text-gray-900 transition-all"
                        >
                          <option value="draft">Draft</option>
                          <option value="live">Live</option>
                          <option value="reserved">Reserved</option>
                          <option value="sold">Sold</option>
                          <option value="returned">Returned</option>
                          <option value="damaged">Damaged</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Channel</label>
                        <select
                          value={editingLot.channel}
                          onChange={(e) => setEditingLot({...editingLot, channel: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-lg text-gray-900 transition-all"
                        >
                          <option value="web">Web</option>
                          <option value="store_walkIn">Store Walk-In</option>
                          <option value="discogs">Discogs</option>
                          <option value="ebay">eBay</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Internal Notes</label>
                        <textarea
                          value={editingLot.internalNotes || ''}
                          onChange={(e) => setEditingLot({...editingLot, internalNotes: e.target.value})}
                          rows={3}
                          placeholder="Add any internal notes about this lot..."
                          className="w-full px-4 py-3 border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-lg text-gray-900 placeholder-gray-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t border-gray-200 p-6 flex gap-3 bg-gray-50">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 px-4 py-3 border border-gray-300 hover:border-gray-400 text-gray-900 rounded-lg font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const { token } = useAuthStore.getState();
                          const res = await fetch(`/api/admin/inventory`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                              id: editingLot.id,
                              listPrice: editingLot.listPrice,
                              status: editingLot.status,
                              channel: editingLot.channel,
                              internalNotes: editingLot.internalNotes,
                            }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setShowEditModal(false);
                            // Refresh inventory list
                            window.location.reload();
                          } else {
                            alert('Failed to update lot: ' + (data.error?.message || 'Unknown error'));
                          }
                        } catch (err) {
                          console.error('Error updating lot:', err);
                          alert('Failed to update lot');
                        }
                      }}
                      className="flex-1 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
