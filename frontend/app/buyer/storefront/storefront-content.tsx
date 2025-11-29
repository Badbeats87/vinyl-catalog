'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore, useCartStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/lib/currency-context';
import { useToast } from '@/components/Toast';
import Pagination from '@/components/Pagination';
import SearchAutocomplete, { SearchSuggestion } from '@/components/SearchAutocomplete';
import WishlistButton from '@/components/WishlistButton';

interface Product {
  id: string;
  title: string;
  artist: string;
  condition: string;
  price: number;
  seller?: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function StorefrontContent() {
  const { user, logout } = useAuthStore();
  const { items: cartItems } = useCartStore();
  const { symbol: currency } = useCurrency();
  const { addToast } = useToast();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchInventory = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      const res = await fetch(`/api/buyer/browse?limit=${pageSize}&offset=${offset}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        setError(data.error.message || 'Failed to load inventory');
        addToast(data.error.message || 'Failed to load inventory', 'error');
        setProducts([]);
        return;
      }

      if (data.groups && Array.isArray(data.groups)) {
        // Flatten the grouped inventory into a flat product list
        const allProducts: Product[] = [];
        for (const group of data.groups) {
          for (const lot of group.lots) {
            allProducts.push({
              id: lot.id,
              title: group.release.title,
              artist: group.release.artist,
              condition: `${lot.conditionMedia}/${lot.conditionSleeve}`,
              price: lot.listPrice,
            });
          }
        }
        setProducts(allProducts);

        // Update pagination
        const total = data.pagination?.total || allProducts.length;
        setPagination({
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          hasNextPage: page < Math.ceil(total / pageSize),
          hasPrevPage: page > 1,
        });
      } else {
        setProducts([]);
        setPagination({
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory';
      console.error('Error fetching inventory:', err);
      setError(message);
      addToast(message, 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Search function for autocomplete
  const handleSearchAutocomplete = useCallback(async (query: string): Promise<SearchSuggestion[]> => {
    try {
      const res = await fetch(`/api/buyer/search?q=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();

      if (data.groups && Array.isArray(data.groups)) {
        // Convert grouped inventory to suggestions
        return data.groups.map((group: any) => ({
          id: group.release.id,
          title: group.release.title,
          artist: group.release.artist,
          year: group.release.year,
          genre: group.release.genre,
          label: group.release.label,
          imageUrl: group.release.imageUrl,
        }));
      }
      return [];
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  }, []);

  // Handle search suggestion selection
  const handleSearchSelect = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.title);
    addToast(`Searching for "${suggestion.artist} - ${suggestion.title}"`, 'info');
    // Fetch inventory for this search
    fetchInventory(1);
  };

  useEffect(() => {
    if (!user || user.userType !== 'buyer') {
      router.push('/');
      return;
    }

    fetchInventory(1);
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleAddToCart = (product: Product) => {
    useCartStore.setState((state) => ({
      items: [
        ...state.items,
        {
          id: product.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          title: product.title,
        },
      ],
    }));
    addToast(`Added "${product.title}" to cart`, 'success');
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">🎵 Vinyl Marketplace</h1>
          <div className="flex gap-6 items-center">
            <Link
              href="/buyer/wishlist"
              className="flex items-center gap-2 hover:text-red-400 transition"
            >
              ❤️ Wishlist
            </Link>
            <Link
              href="/buyer/cart"
              className="flex items-center gap-2 hover:text-green-400 transition"
            >
              🛒 Cart
              {cartItems.length > 0 && (
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                  {cartItems.length}
                </span>
              )}
            </Link>
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
        {/* Search & Filter */}
        <div className="mb-8 flex-1">
          <SearchAutocomplete
            placeholder="Search albums, artists..."
            onSearch={handleSearchAutocomplete}
            onSelect={handleSearchSelect}
            onSearchChange={setSearchQuery}
            debounceMs={400}
            minChars={2}
            isLoading={isSearching}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading inventory...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900 text-red-200 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-400">No items available for sale</p>
          </div>
        )}

        {/* Product Grid */}
        {!loading && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition">
                <div className="relative bg-gray-700 h-40 flex items-center justify-center">
                  <div className="text-5xl">💿</div>
                  <div className="absolute top-2 right-2">
                    <WishlistButton
                      releaseId={product.id}
                      size="sm"
                      variant="icon"
                    />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold mb-1">{product.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{product.artist}</p>
                  <div className="mb-3">
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {product.condition}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-2xl font-bold text-green-500">{currency}{product.price.toFixed(2)}</div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && products.length > 0 && (
          <Pagination
            pagination={pagination}
            onPageChange={(page) => fetchInventory(page)}
            isLoading={loading}
          />
        )}
      </div>
    </div>
  );
}
