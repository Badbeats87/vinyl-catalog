/**
 * Centralized Error Handling Service
 * Provides structured error responses for all API endpoints
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'MARKET_DATA_MISSING'
  | 'INVENTORY_CREATION_FAILED'
  | 'PRICING_CALCULATION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'NOT_FOUND'
  | 'DUPLICATE_ENTRY'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_API_ERROR'
  | 'SUBMISSION_FAILED'
  | 'CHECKOUT_ERROR'
  | 'PAYMENT_ERROR'
  | 'INTERNAL_ERROR';

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    suggestion?: string;
    docsUrl?: string;
    timestamp: string;
  };
}

export interface SuccessResponse<T> {
  success: true;
  data?: T;
  timestamp: string;
}

/**
 * Error suggestion messages for different scenarios
 */
const errorSuggestions: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  MARKET_DATA_MISSING:
    'Prices will use fallback values. You can update pricing policies if needed.',
  INVENTORY_CREATION_FAILED:
    'The inventory creation failed. Check your submission details and try again.',
  PRICING_CALCULATION_FAILED:
    'Unable to calculate pricing. Check your pricing policy settings.',
  AUTHENTICATION_FAILED: 'Please log in again to continue.',
  AUTHORIZATION_FAILED:
    'You do not have permission to perform this action. Contact an administrator.',
  NOT_FOUND: 'The requested item was not found. Please check and try again.',
  DUPLICATE_ENTRY: 'This item already exists. Please try with different data.',
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  EXTERNAL_API_ERROR:
    'Unable to reach external service. Please try again in a moment.',
  SUBMISSION_FAILED:
    'Your submission could not be processed. Please review and try again.',
  CHECKOUT_ERROR:
    'Your checkout could not be completed. Please review your items and try again.',
  PAYMENT_ERROR: 'Payment processing failed. Please check your payment method.',
  INTERNAL_ERROR: 'An unexpected error occurred. Our team has been notified.',
};

/**
 * Documentation links for error resolution
 */
const docsUrls: Record<ErrorCode, string> = {
  VALIDATION_ERROR: '/docs/api/validation',
  MARKET_DATA_MISSING: '/docs/pricing/fallback',
  INVENTORY_CREATION_FAILED: '/docs/inventory/creation',
  PRICING_CALCULATION_FAILED: '/docs/pricing/calculation',
  AUTHENTICATION_FAILED: '/docs/auth/login',
  AUTHORIZATION_FAILED: '/docs/auth/roles',
  NOT_FOUND: '/docs/api/errors',
  DUPLICATE_ENTRY: '/docs/api/duplicates',
  DATABASE_ERROR: '/docs/support/contact',
  EXTERNAL_API_ERROR: '/docs/integrations/troubleshoot',
  SUBMISSION_FAILED: '/docs/seller/submissions',
  CHECKOUT_ERROR: '/docs/buyer/checkout',
  PAYMENT_ERROR: '/docs/buyer/payment',
  INTERNAL_ERROR: '/docs/support/contact',
};

/**
 * Create a structured error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      suggestion: errorSuggestions[code],
      docsUrl: docsUrls[code],
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create a structured success response
 */
export function createSuccessResponse<T>(data?: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Common error creators with built-in messages
 */
export const AppError = {
  validation: (field: string, reason: string) =>
    createErrorResponse('VALIDATION_ERROR', `Validation failed for ${field}: ${reason}`, {
      field,
      reason,
    }),

  marketDataMissing: (releaseId: string, artist: string, title: string) =>
    createErrorResponse(
      'MARKET_DATA_MISSING',
      `Unable to calculate price - market data not available for "${title}" by ${artist}`,
      { releaseId, artist, title }
    ),

  inventoryCreationFailed: (reason: string) =>
    createErrorResponse('INVENTORY_CREATION_FAILED', `Failed to create inventory: ${reason}`, {
      reason,
    }),

  pricingCalculationFailed: (reason: string) =>
    createErrorResponse('PRICING_CALCULATION_FAILED', `Pricing calculation failed: ${reason}`, {
      reason,
    }),

  authenticationFailed: () =>
    createErrorResponse('AUTHENTICATION_FAILED', 'Invalid credentials or session expired'),

  authorizationFailed: (action: string, role: string) =>
    createErrorResponse(
      'AUTHORIZATION_FAILED',
      `You (${role}) cannot ${action}. This action requires higher privileges.`,
      { action, role }
    ),

  notFound: (resource: string, id: string) =>
    createErrorResponse('NOT_FOUND', `${resource} with ID "${id}" not found`, {
      resource,
      id,
    }),

  duplicateEntry: (resource: string, field: string, value: string) =>
    createErrorResponse(
      'DUPLICATE_ENTRY',
      `A ${resource} with ${field} "${value}" already exists`,
      { resource, field, value }
    ),

  databaseError: (operation: string) =>
    createErrorResponse('DATABASE_ERROR', `Database operation failed: ${operation}`, {
      operation,
    }),

  externalApiError: (service: string) =>
    createErrorResponse(
      'EXTERNAL_API_ERROR',
      `Failed to reach ${service}. Please try again later.`,
      { service }
    ),

  submissionFailed: (reason: string) =>
    createErrorResponse('SUBMISSION_FAILED', `Submission failed: ${reason}`, {
      reason,
    }),

  checkoutError: (reason: string) =>
    createErrorResponse('CHECKOUT_ERROR', `Checkout error: ${reason}`, {
      reason,
    }),

  paymentError: (reason: string) =>
    createErrorResponse('PAYMENT_ERROR', `Payment processing failed: ${reason}`, {
      reason,
    }),

  internalError: (details?: string) =>
    createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred. Please try again later.',
      details ? { details } : undefined
    ),
};

export default {
  createErrorResponse,
  createSuccessResponse,
  AppError,
};
