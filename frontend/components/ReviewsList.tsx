'use client';

import React, { useEffect } from 'react';
import { useReviews } from '@/lib/use-reviews';
import ReviewCard from '@/components/ReviewCard';

interface ReviewsListProps {
  releaseId: string;
  releaseTitle: string;
  releaseArtist: string;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  releaseId,
  releaseTitle,
  releaseArtist,
}) => {
  const { reviews, stats, loading, error, fetchReviewsForRelease } =
    useReviews();

  useEffect(() => {
    fetchReviewsForRelease(releaseId);
  }, [releaseId, fetchReviewsForRelease]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading reviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!stats || reviews.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No reviews yet for this album</p>
        <p className="text-sm text-gray-500 mt-2">
          Be the first to share your thoughts!
        </p>
      </div>
    );
  }

  const ratingCounts = stats.ratingDistribution;
  const totalReviews = stats.totalReviews;

  return (
    <div className="space-y-8">
      {/* Summary Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Average Rating */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {stats.averageRating}
              </div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star}>
                    {star <= Math.round(stats.averageRating) ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600">
                Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-12">
                  {rating}⭐
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{
                      width: `${
                        totalReviews > 0
                          ? ((ratingCounts[rating] || 0) / totalReviews) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">
                  {ratingCounts[rating] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Customer Reviews
        </h3>
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            title={review.title}
            author={review.buyerName}
            rating={review.rating}
            conditionRating={review.conditionRating}
            content={review.content}
            photos={review.photos}
            createdAt={review.createdAt}
            adminResponse={review.adminResponse}
            respondedAt={review.respondedAt}
          />
        ))}
      </div>
    </div>
  );
};

export default ReviewsList;
