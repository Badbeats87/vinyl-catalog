'use client';

import React, { useState } from 'react';
import { useReviews } from '@/lib/use-reviews';

interface ReviewFormProps {
  orderId: string;
  releaseId: string;
  releaseTitle: string;
  releaseArtist: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  orderId,
  releaseId,
  releaseTitle,
  releaseArtist,
  onSuccess,
  onCancel,
}) => {
  const { createReview, loading, error: submitError } = useReviews();
  const [rating, setRating] = useState(5);
  const [conditionRating, setConditionRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    [key: string]: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!title.trim()) {
      errors.title = 'Review title is required';
    } else if (title.length < 5) {
      errors.title = 'Title must be at least 5 characters';
    }

    if (!content.trim()) {
      errors.content = 'Review content is required';
    } else if (content.length < 20) {
      errors.content = 'Content must be at least 20 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await createReview(orderId, releaseId, {
        rating,
        title,
        content,
        conditionRating,
      });

      // Reset form
      setRating(5);
      setConditionRating(5);
      setTitle('');
      setContent('');
      setFieldErrors({});

      onSuccess?.();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const renderStarInput = (
    label: string,
    value: number,
    onChange: (val: number) => void
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-3xl transition ${
              star <= value ? 'opacity-100' : 'opacity-40'
            } hover:opacity-100`}
          >
            ⭐
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600 mt-1">{value}/5 stars</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Write a Review
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {releaseArtist} - {releaseTitle}
        </p>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-700 text-sm">{submitError}</p>
        </div>
      )}

      {/* Rating Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderStarInput(
          'Product Rating',
          rating,
          setRating
        )}
        {renderStarInput(
          'Condition Accuracy',
          conditionRating,
          setConditionRating
        )}
      </div>

      {/* Title Input */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Review Title <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (fieldErrors.title && e.target.value.trim().length >= 5) {
              setFieldErrors((prev) => {
                const { title, ...rest } = prev;
                return rest;
              });
            }
          }}
          placeholder="Great album, amazing quality"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition ${
            fieldErrors.title
              ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
          }`}
          maxLength={255}
        />
        {fieldErrors.title && (
          <p className="text-red-600 text-sm mt-1">{fieldErrors.title}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {title.length}/255 characters
        </p>
      </div>

      {/* Content Input */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Your Review <span className="text-red-600">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (fieldErrors.content && e.target.value.trim().length >= 20) {
              setFieldErrors((prev) => {
                const { content, ...rest } = prev;
                return rest;
              });
            }
          }}
          placeholder="Share your experience with this album..."
          rows={5}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition resize-none ${
            fieldErrors.content
              ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
          }`}
        />
        {fieldErrors.content && (
          <p className="text-red-600 text-sm mt-1">{fieldErrors.content}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Minimum 20 characters required
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Submitting...
            </span>
          ) : (
            'Submit Review'
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ReviewForm;
