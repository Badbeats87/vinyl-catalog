'use client';

import React, { useState, useEffect } from 'react';
import { useWishlist } from '@/lib/use-wishlist';

interface WishlistButtonProps {
  releaseId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  className?: string;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  releaseId,
  size = 'md',
  variant = 'icon',
  className = '',
}) => {
  const { wishlist, addItem, removeItem, isInWishlist } = useWishlist();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if item is in wishlist
    const checkWishlist = async () => {
      const result = await isInWishlist(releaseId);
      setInWishlist(result);
    };

    checkWishlist();
  }, [releaseId, isInWishlist]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    try {
      if (inWishlist) {
        // Find and remove the wishlist item
        const item = wishlist?.items.find(
          (i) => i.releaseId === releaseId
        );
        if (item) {
          await removeItem(item.id);
          setInWishlist(false);
        }
      } else {
        // Add to wishlist
        await addItem(releaseId);
        setInWishlist(true);
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-lg px-2 py-1',
    md: 'text-2xl px-3 py-2',
    lg: 'text-3xl px-4 py-3',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`${sizeClasses[size]} transition hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        {inWishlist ? '❤️' : '🤍'}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
        inWishlist
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <span>{inWishlist ? '❤️' : '🤍'}</span>
      <span>{inWishlist ? 'In Wishlist' : 'Add to Wishlist'}</span>
      {loading && <span className="animate-spin">⏳</span>}
    </button>
  );
};

export default WishlistButton;
