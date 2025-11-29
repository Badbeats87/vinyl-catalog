'use client';

import { useState, useCallback } from 'react';

export interface StructuredError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  suggestion?: string;
  docsUrl?: string;
}

export interface UseApiErrorReturn {
  error: string | StructuredError | null;
  setError: (error: string | StructuredError | null) => void;
  clearError: () => void;
  handleApiError: (err: unknown) => void;
}

/**
 * Parse API error response into structured error object
 */
export function parseApiError(err: unknown): string | StructuredError {
  // Handle network errors
  if (err instanceof TypeError) {
    return 'Network error - unable to reach server';
  }

  // Handle structured error responses from our API
  if (typeof err === 'object' && err !== null) {
    const errObj = err as any;

    // Check for structured error format
    if (errObj.error && typeof errObj.error === 'object') {
      return {
        code: errObj.error.code || 'UNKNOWN_ERROR',
        message: errObj.error.message || 'An error occurred',
        details: errObj.error.details,
        suggestion: errObj.error.suggestion,
        docsUrl: errObj.error.docsUrl,
      };
    }

    // Check for response object from fetch
    if (errObj.message) {
      return {
        code: 'API_ERROR',
        message: errObj.message,
        details: errObj.details,
      };
    }
  }

  // Fallback to string conversion
  return typeof err === 'string' ? err : 'An unexpected error occurred';
}

/**
 * Hook for consistent API error handling
 */
export function useApiError(): UseApiErrorReturn {
  const [error, setError] = useState<string | StructuredError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiError = useCallback((err: unknown) => {
    const parsedError = parseApiError(err);
    setError(parsedError);

    // Log structured errors for debugging
    if (typeof parsedError === 'object') {
      console.error(`[${parsedError.code}] ${parsedError.message}`, parsedError.details);
    } else {
      console.error(parsedError);
    }
  }, []);

  return {
    error,
    setError,
    clearError,
    handleApiError,
  };
}

export default useApiError;
