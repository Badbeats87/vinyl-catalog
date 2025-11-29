import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';

export interface WishlistItem {
  id: string;
  releaseId: string;
  title: string;
  artist: string;
  coverArtUrl: string | null;
  addedAt: string;
}

export interface Wishlist {
  id: string;
  buyerId: string;
  items: WishlistItem[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UseWishlistReturn {
  wishlist: Wishlist | null;
  loading: boolean;
  error: string | null;
  addItem: (releaseId: string) => Promise<void>;
  removeItem: (wishlistItemId: string) => Promise<void>;
  isInWishlist: (releaseId: string) => Promise<boolean>;
  clearWishlist: () => Promise<void>;
  fetchWishlist: () => Promise<void>;
}

export function useWishlist(): UseWishlistReturn {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/buyer/wishlist');
      setWishlist(response.data.data);
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Failed to fetch wishlist';
      setError(message);
      console.error('Wishlist fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = useCallback(
    async (releaseId: string) => {
      try {
        const response = await api.post('/buyer/wishlist/items', {
          releaseId,
        });

        // Update wishlist optimistically
        if (wishlist) {
          setWishlist({
            ...wishlist,
            items: [response.data.data, ...wishlist.items],
            itemCount: wishlist.itemCount + 1,
          });
        } else {
          // Fetch full wishlist if not loaded
          await fetchWishlist();
        }

        toast({
          type: 'success',
          message: 'Added to wishlist',
        });
      } catch (err: any) {
        const message =
          err.response?.data?.error?.message || 'Failed to add to wishlist';
        setError(message);
        toast({
          type: 'error',
          message,
        });
        throw err;
      }
    },
    [wishlist, fetchWishlist, toast]
  );

  const removeItem = useCallback(
    async (wishlistItemId: string) => {
      try {
        await api.delete(`/buyer/wishlist/items/${wishlistItemId}`);

        // Update wishlist optimistically
        if (wishlist) {
          setWishlist({
            ...wishlist,
            items: wishlist.items.filter((item) => item.id !== wishlistItemId),
            itemCount: wishlist.itemCount - 1,
          });
        }

        toast({
          type: 'success',
          message: 'Removed from wishlist',
        });
      } catch (err: any) {
        const message =
          err.response?.data?.error?.message ||
          'Failed to remove from wishlist';
        setError(message);
        toast({
          type: 'error',
          message,
        });
        throw err;
      }
    },
    [wishlist, toast]
  );

  const isInWishlist = useCallback(
    async (releaseId: string): Promise<boolean> => {
      try {
        const response = await api.get(`/buyer/wishlist/check/${releaseId}`);
        return response.data.data.inWishlist;
      } catch (err) {
        console.error('Failed to check wishlist status:', err);
        return false;
      }
    },
    []
  );

  const clearWishlist = useCallback(async () => {
    try {
      await api.delete('/buyer/wishlist');
      setWishlist(null);
      toast({
        type: 'success',
        message: 'Wishlist cleared',
      });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Failed to clear wishlist';
      setError(message);
      toast({
        type: 'error',
        message,
      });
      throw err;
    }
  }, [toast]);

  return {
    wishlist,
    loading,
    error,
    addItem,
    removeItem,
    isInWishlist,
    clearWishlist,
    fetchWishlist,
  };
}
