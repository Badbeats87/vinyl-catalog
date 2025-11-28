'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore, useCartStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  title: string;
  artist: string;
  condition: string;
  price: number;
  seller: string;
}

export default function Storefront() {
  const { user, logout } = useAuthStore();
  const { items: cartItems } = useCartStore();
  const router = useRouter();

  const [products] = useState<Product[]>([
    {
      id: '1',
      title: 'Dark Side of the Moon',
      artist: 'Pink Floyd',
      condition: 'Mint',
      price: 150,
      seller: 'VinylCollector',
    },
    {
      id: '2',
      title: 'Abbey Road',
      artist: 'The Beatles',
      condition: 'Very Good',
      price: 120,
      seller: 'RecordStore',
    },
    {
      id: '3',
      title: 'Thriller',
      artist: 'Michael Jackson',
      condition: 'Good',
      price: 80,
      seller: 'MusicLover',
    },
    {
      id: '4',
      title: 'Led Zeppelin IV',
      artist: 'Led Zeppelin',
      condition: 'Very Good+',
      price: 200,
      seller: 'ClassicRocks',
    },
    {
      id: '5',
      title: 'The Wall',
      artist: 'Pink Floyd',
      condition: 'Good+',
      price: 95,
      seller: 'VinylCollector',
    },
    {
      id: '6',
      title: 'Hotel California',
      artist: 'Eagles',
      condition: 'Very Good',
      price: 110,
      seller: 'RecordStore',
    },
  ]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!user || user.userType !== 'buyer') {
      router.push('/');
    }
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

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition">
              <div className="bg-gray-700 h-40 flex items-center justify-center">
                <div className="text-5xl">💿</div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold mb-1">{product.title}</h3>
                <p className="text-gray-400 text-sm mb-3">{product.artist}</p>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                    {product.condition}
                  </span>
                  <span className="text-xs text-gray-400">By {product.seller}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-2xl font-bold text-green-500">${product.price}</div>
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
      </div>
    </div>
  );
}
