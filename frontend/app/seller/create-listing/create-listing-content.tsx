'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useCurrency } from '@/lib/currency-context';
import SearchAutocomplete, { SearchSuggestion } from '@/components/SearchAutocomplete';

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

export default function CreateListingContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { symbol: currency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'search' | 'details'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscogsRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DiscogsRecord | null>(null);
  const [searchError, setSearchError] = useState('');

  // Pricing state
  const [buyPrice, setBuyPrice] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState<number | null>(null);
  const [buyPriceInput, setBuyPriceInput] = useState('');
  const [sellPriceInput, setSellPriceInput] = useState('');

  // Conditions (separate for media and sleeve)
  const [conditionMedia, setConditionMedia] = useState('Very Good');
  const [conditionSleeve, setConditionSleeve] = useState('Very Good');

  // Field errors
  const [fieldErrors, setFieldErrors] = useState<{
    searchQuery?: string;
    buyPrice?: string;
    sellPrice?: string;
  }>({});

  // Validate search query
  const validateSearchQuery = (value: string): string | undefined => {
    if (!value || !value.trim()) return 'Please enter a search query';
    return undefined;
  };

  // Validate price
  const validatePrice = (value: string, fieldName: string): string | undefined => {
    if (!value) return `${fieldName} is required`;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return `${fieldName} must be a valid number`;
    if (numValue <= 0) return `${fieldName} must be greater than 0`;
    return undefined;
  };

  // Handle search query change
  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    const error = validateSearchQuery(value);
    setSearchError(error || '');
  };

  // Discogs autocomplete search function
  const handleDiscogsAutocomplete = useCallback(async (query: string): Promise<SearchSuggestion[]> => {
    try {
      const res = await fetch('/api/search/discogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      if (data.success && data.results) {
        return data.results.slice(0, 8).map((result: any) => ({
          id: result.id,
          title: result.title,
          artist: result.artist,
          year: result.year,
          genre: result.genre,
          label: result.label,
          imageUrl: result.imageUrl,
        }));
      }
      return [];
    } catch (err) {
      console.error('Discogs search error:', err);
      return [];
    }
  }, []);

  // Handle Discogs result selection
  const handleDiscogsSelect = (suggestion: SearchSuggestion) => {
    // Find the full record object from search results
    const fullRecord = searchResults.find(r => r.id === suggestion.id);
    if (fullRecord) {
      handleSelectRecord(fullRecord);
    } else {
      // If not found in current results, reconstruct from suggestion
      const record: DiscogsRecord = {
        id: suggestion.id,
        discogsId: parseInt(suggestion.id) || 0,
        title: suggestion.title,
        artist: suggestion.artist,
        year: suggestion.year || new Date().getFullYear(),
        label: suggestion.label || '',
        price: null,
        imageUrl: suggestion.imageUrl || '',
        genre: suggestion.genre || '',
        format: 'Vinyl',
        rpm: 33,
        catalog: '',
        notes: '',
      };
      handleSelectRecord(record);
    }
  };

  useEffect(() => {
    if (!user || user.userType !== 'seller') {
      router.push('/');
    }
  }, [user, router]);

  const handleSearch = async () => {
    const error = validateSearchQuery(searchQuery);
    if (error) {
      setSearchError(error);
      return;
    }
    setSearching(true);
    setError('');
    setSearchError('');
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
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || 'Search failed';
        setError(errorMsg);
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

    // Validate prices
    const finalBuyPrice = buyPriceInput ? parseFloat(buyPriceInput) : buyPrice;
    const finalSellPrice = sellPriceInput ? parseFloat(sellPriceInput) : sellPrice;

    const buyError = validatePrice(finalBuyPrice?.toString() || '', 'Buy Price');
    const sellError = validatePrice(finalSellPrice?.toString() || '', 'Sell Price');

    if (buyError || sellError) {
      setFieldErrors({
        buyPrice: buyError,
        sellPrice: sellError,
      });
      setError('Please fix the pricing errors');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { token } = useAuthStore.getState();
      const res = await fetch('/api/seller/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
          conditionMedia,
          conditionSleeve,
          buyingPrice: finalBuyPrice,
          sellingPrice: finalSellPrice,
          notes: selectedRecord.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/seller/dashboard');
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || 'Failed to create listing';
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : err?.message || 'Failed to create listing';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <Link href="/seller/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
            ← Back
          </Link>
          <h1 className="text-2xl font-light">Create Listing</h1>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {step === 'search' ? (
          // SEARCH STEP
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-light text-gray-900 mb-1">Search Discogs</h2>
              <p className="text-sm text-gray-600">Find the record you want to sell. Manual entry available if not found.</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Search Discogs <span className="text-red-600">*</span>
                  </label>
                  <div className="mb-3">
                    <SearchAutocomplete
                      placeholder="Artist, album, or catalog number"
                      onSearch={handleDiscogsAutocomplete}
                      onSelect={handleDiscogsSelect}
                      onSearchChange={handleSearchQueryChange}
                      debounceMs={500}
                      minChars={2}
                      isLoading={searching}
                    />
                  </div>
                  {searchError && (
                    <p className="text-red-600 text-sm mb-3">{searchError}</p>
                  )}
                  <p className="text-sm text-gray-600 mb-4">Or use the manual search below for advanced options</p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchQueryChange}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Artist, album, or catalog number"
                      className={`flex-1 px-4 py-3 border rounded text-gray-900 placeholder-gray-500 transition-all focus:ring-1 focus:ring-gray-900 ${
                        searchError
                          ? 'border-red-400 focus:border-red-600'
                          : 'border-gray-300 hover:border-gray-400 focus:border-gray-900'
                      }`}
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching || !searchQuery.trim()}
                      className="px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded transition"
                    >
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Results ({searchResults.length})</h3>
                    <div className="space-y-2">
                      {searchResults.map((record) => (
                        <div
                          key={record.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition"
                          onClick={() => handleSelectRecord(record)}
                        >
                          <div className="flex gap-4 items-start">
                            {record.imageUrl && (
                              <img
                                src={record.imageUrl}
                                alt={record.title}
                                className="h-20 w-20 object-cover rounded border border-gray-200"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">{record.title}</h4>
                              <p className="text-sm text-gray-600 mb-2">{record.artist} • {record.year}</p>
                              <p className="text-xs text-gray-600 mb-3">{record.label} • {record.genre}</p>
                              {record.price && (
                                <div className="text-sm font-medium text-gray-900">
                                  We pay: {currency}{(Math.round(record.price * 0.55 * 100) / 100).toFixed(2)}
                                </div>
                              )}
                            </div>
                            <button className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded font-medium text-sm whitespace-nowrap transition">
                              Select
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.length === 0 && !searching && searchQuery && (
                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-600 mb-4">No records found on Discogs</p>
                    <button
                      onClick={() => {
                        setStep('details');
                        setSelectedRecord(null);
                      }}
                      className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-900 rounded font-medium transition"
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
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-light text-gray-900 mb-1">Confirm Listing</h2>
              <p className="text-sm text-gray-600">Review the details before submitting</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {selectedRecord ? (
                <>
                  <div className="border border-gray-200 rounded-lg p-8">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Record Details</h3>
                    <div className="grid grid-cols-3 gap-6">
                      {selectedRecord.imageUrl && (
                        <img
                          src={selectedRecord.imageUrl}
                          alt={selectedRecord.title}
                          className="h-32 w-32 object-cover rounded border border-gray-200"
                        />
                      )}
                      <div className="col-span-2 space-y-2">
                        <h4 className="text-lg font-medium text-gray-900">{selectedRecord.title}</h4>
                        <p className="text-gray-600">{selectedRecord.artist}</p>
                        <p className="text-sm text-gray-600">{selectedRecord.label} • {selectedRecord.year}</p>
                        <p className="text-sm text-gray-600">{selectedRecord.format} • {selectedRecord.genre}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Fields */}
                  <div className="border border-gray-200 rounded-lg p-8 space-y-6">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Pricing <span className="text-red-600">*</span>
                    </label>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Buy Price */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Buy Price ({currency})</label>
                        <input
                          type="text"
                          value={buyPriceInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            setBuyPriceInput(value);
                            const error = validatePrice(value, 'Buy Price');
                            setFieldErrors((prev) => ({
                              ...prev,
                              buyPrice: error,
                            }));
                            if (!error && value) {
                              setBuyPrice(parseFloat(value));
                            }
                          }}
                          placeholder={buyPrice?.toFixed(2) || 'Enter price'}
                          className={`w-full px-4 py-2 border rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 transition ${
                            fieldErrors.buyPrice
                              ? 'border-red-400 focus:border-red-600'
                              : 'border-gray-300 hover:border-gray-400 focus:border-gray-900'
                          }`}
                        />
                        {fieldErrors.buyPrice && (
                          <p className="text-red-600 text-sm mt-1">{fieldErrors.buyPrice}</p>
                        )}
                        {buyPrice && !buyPriceInput && (
                          <p className="text-gray-600 text-xs mt-1">Default: {currency}{buyPrice.toFixed(2)}</p>
                        )}
                      </div>

                      {/* Sell Price */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Sell Price ({currency})</label>
                        <input
                          type="text"
                          value={sellPriceInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSellPriceInput(value);
                            const error = validatePrice(value, 'Sell Price');
                            setFieldErrors((prev) => ({
                              ...prev,
                              sellPrice: error,
                            }));
                            if (!error && value) {
                              setSellPrice(parseFloat(value));
                            }
                          }}
                          placeholder={sellPrice?.toFixed(2) || 'Enter price'}
                          className={`w-full px-4 py-2 border rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 transition ${
                            fieldErrors.sellPrice
                              ? 'border-red-400 focus:border-red-600'
                              : 'border-gray-300 hover:border-gray-400 focus:border-gray-900'
                          }`}
                        />
                        {fieldErrors.sellPrice && (
                          <p className="text-red-600 text-sm mt-1">{fieldErrors.sellPrice}</p>
                        )}
                        {sellPrice && !sellPriceInput && (
                          <p className="text-gray-600 text-xs mt-1">Default: {currency}{sellPrice.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="border border-yellow-200 rounded-lg p-6 bg-yellow-50">
                  <p className="text-sm text-yellow-800">Manual entry mode - please fill in record details</p>
                </div>
              )}

              {/* Condition */}
              <div className="border border-gray-200 rounded-lg p-8 space-y-6">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Record Condition
                </label>

                <div className="grid grid-cols-2 gap-6">
                  {/* Media Condition */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Vinyl (Media)</label>
                    <select
                      value={conditionMedia}
                      onChange={(e) => setConditionMedia(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
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

                  {/* Sleeve Condition */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Sleeve (Cover)</label>
                    <select
                      value={conditionSleeve}
                      onChange={(e) => setConditionSleeve(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
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
              </div>

              {/* Error */}
              {error && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || !selectedRecord || !!(fieldErrors.buyPrice || fieldErrors.sellPrice)}
                  className="flex-1 bg-gray-900 text-white py-3 rounded font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Creating...' : 'Create Listing'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('search');
                    setSelectedRecord(null);
                    setSearchResults([]);
                  }}
                  className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-900 py-3 rounded font-medium transition"
                >
                  Back to Search
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
