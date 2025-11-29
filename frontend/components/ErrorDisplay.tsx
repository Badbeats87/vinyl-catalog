'use client';

import React from 'react';

export interface StructuredError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  suggestion?: string;
  docsUrl?: string;
}

interface ErrorDisplayProps {
  error: string | StructuredError | null;
  onDismiss?: () => void;
  severity?: 'error' | 'warning' | 'info';
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  severity = 'error',
}) => {
  if (!error) return null;

  const isStructured = typeof error === 'object';
  const code = isStructured ? error.code : undefined;
  const message = isStructured ? error.message : error;
  const suggestion = isStructured ? error.suggestion : undefined;
  const docsUrl = isStructured ? error.docsUrl : undefined;
  const details = isStructured ? error.details : undefined;

  // Color scheme based on severity
  const severityStyles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-600',
      text: 'text-red-800',
      button: 'text-red-600 hover:text-red-700',
      badge: 'bg-red-100 text-red-800',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-800',
      button: 'text-yellow-600 hover:text-yellow-700',
      badge: 'bg-yellow-100 text-yellow-800',
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-800',
      button: 'text-blue-600 hover:text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
    },
  };

  const styles = severityStyles[severity];

  const severityIcon = {
    error: '⚠️',
    warning: '⚡',
    info: 'ℹ️',
  };

  return (
    <div className={`border rounded-lg p-4 ${styles.container}`}>
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-xl">
          {severityIcon[severity]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Main Message */}
          <div className="flex items-start justify-between gap-2">
            <p className={`font-semibold ${styles.text}`}>{message}</p>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`flex-shrink-0 ${styles.button} transition`}
                aria-label="Dismiss error"
              >
                ✕
              </button>
            )}
          </div>

          {/* Error Code Badge */}
          {code && (
            <p className={`text-xs mt-2 inline-block px-2 py-1 rounded ${styles.badge}`}>
              {code}
            </p>
          )}

          {/* Suggestion */}
          {suggestion && (
            <p className={`text-sm mt-3 ${styles.text}`}>
              <strong>💡 Suggestion:</strong> {suggestion}
            </p>
          )}

          {/* Details */}
          {details && Object.keys(details).length > 0 && (
            <details className="mt-3">
              <summary className={`cursor-pointer text-sm font-medium ${styles.text}`}>
                Technical Details
              </summary>
              <pre className={`mt-2 p-2 rounded text-xs overflow-auto ${styles.container} border`}>
                {JSON.stringify(details, null, 2)}
              </pre>
            </details>
          )}

          {/* Documentation Link */}
          {docsUrl && (
            <p className={`text-sm mt-3 ${styles.text}`}>
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline ${styles.button} transition`}
              >
                📖 Read the troubleshooting guide →
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
