'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore, useCartStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/lib/currency-context';

interface Product {
  id: string;
  title: string;
  artist: string;
  condition: string;
  price: number;
  seller?: string;
}

export default function Storefront() {
  const { user, logout } = useAuthStore();
  const { items: cartItems } = useCartStore();
  const { symbol: currency } = useCurrency();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!user || user.userType !== 'buyer') {
      router.push('/');
      return;
    }

    // Fetch live inventory from the API
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/buyer/browse?limit=50&offset=0');
        const data = await res.json();

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
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setError('Failed to load inventory');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
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
        <div className="mb-8 flex gap-4">
          <input
            type="text"
            placeholder="Search albums, artists..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <button className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 transition">
            Search
          </button>
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
                <div className="bg-gray-700 h-40 flex items-center justify-center">
                  <div className="text-5xl">💿</div>
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
      </div>
    </div>
  );
}
