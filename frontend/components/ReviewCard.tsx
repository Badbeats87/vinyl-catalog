'use client';

import React from 'react';

interface ReviewCardProps {
  title: string;
  author?: string;
  rating: number;
  conditionRating: number;
  content: string;
  photos: string[];
  createdAt: string;
  adminResponse?: string;
  respondedAt?: string;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  title,
  author,
  rating,
  conditionRating,
  content,
  photos,
  createdAt,
  adminResponse,
  respondedAt,
}) => {
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? '⭐' : '☆'}>
            {star <= rating ? '⭐' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {author && (
              <p className="text-sm text-gray-600">by {author}</p>
            )}
          </div>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
            ✓ Verified Purchase
          </span>
        </div>

        {/* Rating */}
        <div className="mb-2">
          {renderStars(rating)}
          <p className="text-sm text-gray-600 mt-1">
            Product rating: {rating}/5
          </p>
        </div>

        {/* Condition Rating */}
        <p className="text-sm text-gray-500">
          Condition accuracy: {conditionRating}/5
        </p>
      </div>

      {/* Content */}
      <p className="text-gray-700 mb-4 leading-relaxed">{content}</p>

      {/* Photos */}
      {photos && photos.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            Photos ({photos.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {photos.map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt={`Review photo ${idx + 1}`}
                className="w-full h-24 object-cover rounded border border-gray-200"
              />
            ))}
          </div>
        </div>
      )}

      {/* Admin Response */}
      {adminResponse && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">
            Response from Admin
          </p>
          <p className="text-sm text-blue-800">{adminResponse}</p>
          {respondedAt && (
            <p className="text-xs text-blue-600 mt-2">
              {formatDate(respondedAt)}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        Posted on {formatDate(createdAt)}
      </div>
    </div>
  );
};

export default ReviewCard;
