'use client';

import React from 'react';
import Link from 'next/link';

export interface ErrorInfo {
  code?: string;
  message: string;
  suggestion?: string;
  docsUrl?: string;
  details?: Record<string, unknown>;
}

interface ErrorDisplayProps {
  error: ErrorInfo | string;
  variant?: 'inline' | 'alert' | 'card';
  onDismiss?: () => void;
  showDetails?: boolean;
}

/**
 * Structured error display component
 * Shows error message, suggestion, and links to documentation
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  variant = 'inline',
  onDismiss,
  showDetails = false,
}) => {
  // Normalize error to ErrorInfo format
  const errorInfo: ErrorInfo = typeof error === 'string'
    ? { message: error }
    : error;

  if (variant === 'inline') {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50 text-red-700 text-sm space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-medium">{errorInfo.message}</p>
            {errorInfo.suggestion && (
              <p className="text-red-600 text-xs mt-2">{errorInfo.suggestion}</p>
            )}
            {errorInfo.docsUrl && (
              <div className="mt-3">
                <Link
                  href={errorInfo.docsUrl}
                  className="text-red-700 hover:text-red-900 underline text-xs font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more →
                </Link>
              </div>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-600 hover:text-red-900 flex-shrink-0"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'alert') {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-red-700 text-xl flex-shrink-0">⚠️</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-800 text-sm">{errorInfo.message}</h3>
            {errorInfo.suggestion && (
              <p className="text-red-700 text-sm mt-2">{errorInfo.suggestion}</p>
            )}
            {errorInfo.docsUrl && (
              <div className="mt-3">
                <Link
                  href={errorInfo.docsUrl}
                  className="text-red-700 hover:text-red-900 underline font-medium text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View documentation →
                </Link>
              </div>
            )}
            {showDetails && errorInfo.details && (
              <details className="mt-3 text-xs text-red-600">
                <summary className="cursor-pointer font-medium hover:text-red-800">Details</summary>
                <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(errorInfo.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-700 hover:text-red-900 flex-shrink-0 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  // card variant
  return (
    <div className="bg-white border border-red-200 rounded-lg p-6 space-y-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-red-600 text-2xl flex-shrink-0">⚠️</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-900 text-base">{errorInfo.message}</h3>
          {errorInfo.code && (
            <p className="text-red-600 text-xs mt-1 font-mono">{errorInfo.code}</p>
          )}
        </div>
      </div>

      {errorInfo.suggestion && (
        <div className="bg-red-50 rounded p-3 text-sm text-red-800">
          <p className="font-medium mb-1">What to do:</p>
          <p>{errorInfo.suggestion}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        {errorInfo.docsUrl && (
          <Link
            href={errorInfo.docsUrl}
            className="text-red-700 hover:text-red-900 underline font-medium text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Help & Documentation
          </Link>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800 font-medium text-sm ml-auto"
          >
            Dismiss
          </button>
        )}
      </div>

      {showDetails && errorInfo.details && (
        <details className="text-xs text-red-600 border-t border-red-200 pt-3">
          <summary className="cursor-pointer font-medium hover:text-red-800">Technical Details</summary>
          <pre className="mt-3 p-2 bg-red-50 rounded overflow-auto whitespace-pre-wrap break-words">
            {JSON.stringify(errorInfo.details, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ErrorDisplay;
