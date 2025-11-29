import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';

export interface Review {
  id: string;
  buyerId: string;
  buyerName?: string;
  orderId: string;
  releaseId: string;
  releaseTitle: string;
  releaseArtist: string;
  rating: number;
  title: string;
  content: string;
  conditionRating: number;
  photos: string[];
  status: string;
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

export interface ReleaseReviewStats {
  releaseId: string;
  releaseTitle: string;
  releaseArtist: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number;
  };
  approvedReviews: Review[];
}

interface UseReviewsReturn {
  reviews: Review[];
  stats: ReleaseReviewStats | null;
  loading: boolean;
  error: string | null;
  createReview: (
    orderId: string,
    releaseId: string,
    data: {
      rating: number;
      title: string;
      content: string;
      conditionRating: number;
      photos?: string[];
    }
  ) => Promise<void>;
  fetchReviewsForRelease: (releaseId: string) => Promise<void>;
  fetchBuyerReviews: () => Promise<void>;
}

export function useReviews(): UseReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReleaseReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const createReview = useCallback(
    async (
      orderId: string,
      releaseId: string,
      data: {
        rating: number;
        title: string;
        content: string;
        conditionRating: number;
        photos?: string[];
      }
    ) => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.post('/buyer/reviews', {
          orderId,
          releaseId,
          rating: data.rating,
          title: data.title,
          content: data.content,
          conditionRating: data.conditionRating,
          photos: data.photos,
        });

        toast({
          type: 'success',
          message: 'Review submitted successfully! Awaiting moderation.',
        });
      } catch (err: any) {
        const message =
          err.response?.data?.error?.message || 'Failed to submit review';
        setError(message);
        toast({
          type: 'error',
          message,
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const fetchReviewsForRelease = useCallback(async (releaseId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/reviews/release/${releaseId}`);
      setStats(response.data.data);
      setReviews(response.data.data.approvedReviews);
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        'Failed to fetch reviews';
      setError(message);
      console.error('Reviews fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBuyerReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/buyer/reviews');
      setReviews(response.data.data);
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Failed to fetch reviews';
      setError(message);
      console.error('Buyer reviews fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reviews,
    stats,
    loading,
    error,
    createReview,
    fetchReviewsForRelease,
    fetchBuyerReviews,
  };
}
