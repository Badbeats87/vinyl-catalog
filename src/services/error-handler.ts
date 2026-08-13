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
  | 'SUBMISSION_INVALID_ITEMS'
  | 'SUBMISSION_NO_ITEMS'
  | 'SUBMISSION_QUOTE_FAILED'
  | 'SUBMISSION_ITEM_NOT_FOUND'
  | 'SUBMISSION_POLICY_MISSING'
  | 'CONDITION_INVALID'
  | 'PRICE_INVALID'
  | 'QUANTITY_INVALID'
  | 'RELEASE_NOT_FOUND'
  | 'POLICY_NOT_FOUND'
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
  VALIDATION_ERROR: 'Please check your input and ensure all required fields are filled correctly.',
  MARKET_DATA_MISSING:
    'Market data is temporarily unavailable. Prices will use fallback values based on your pricing policies. Try again in a moment or adjust your pricing manually.',
  INVENTORY_CREATION_FAILED:
    'Failed to create inventory. This might be due to invalid item data or pricing settings. Review your submission details and try again.',
  PRICING_CALCULATION_FAILED:
    'Pricing calculation failed. Verify your pricing policy is properly configured and try again. If the issue persists, contact support.',
  AUTHENTICATION_FAILED: 'Your session has expired or credentials are invalid. Please log in again.',
  AUTHORIZATION_FAILED:
    'You do not have permission to perform this action. Contact your administrator if you believe this is an error.',
  NOT_FOUND: 'The requested item could not be found. It may have been deleted or the ID is incorrect.',
  DUPLICATE_ENTRY: 'This item already exists in the system. Please verify you are not creating a duplicate entry.',
  DATABASE_ERROR: 'A database error occurred. Please try again in a few moments. If this persists, contact support.',
  EXTERNAL_API_ERROR:
    'Unable to reach an external service. This is often temporary. Please try again in a moment.',
  SUBMISSION_FAILED:
    'Your submission could not be processed. Please review all required fields and try again.',
  SUBMISSION_INVALID_ITEMS:
    'One or more items in your submission are invalid. Ensure all items have valid release IDs, quantities, and conditions.',
  SUBMISSION_NO_ITEMS:
    'Your submission must include at least one item. Please add items before submitting.',
  SUBMISSION_QUOTE_FAILED:
    'Failed to generate quotes for your items. This might be due to missing pricing data. Check your submission details and try again.',
  SUBMISSION_ITEM_NOT_FOUND:
    'One of the items in your submission could not be found. It may have been removed from our catalog.',
  SUBMISSION_POLICY_MISSING:
    'No pricing policy is configured for one or more items. Contact support to set up pricing policies.',
  CONDITION_INVALID:
    'Please select a valid condition. Choose from: Mint, Near Mint, Very Good Plus, Very Good, Good Plus, Good, Fair, or Poor.',
  PRICE_INVALID:
    'Price must be a positive number. Please enter a valid price greater than $0.01.',
  QUANTITY_INVALID:
    'Quantity must be a positive whole number. Please enter a valid quantity greater than 0.',
  RELEASE_NOT_FOUND:
    'The release you are looking for does not exist in our catalog. Try searching for a similar title or artist.',
  POLICY_NOT_FOUND:
    'No pricing policy found for this item. Please ensure pricing policies are configured before submission.',
  CHECKOUT_ERROR:
    'Your checkout could not be completed. Please review your items and try again. If the issue persists, contact support.',
  PAYMENT_ERROR: 'Payment processing failed. Please check your payment method is valid and has sufficient funds.',
  INTERNAL_ERROR: 'An unexpected error occurred. Our team has been notified and will investigate. Please try again later.',
};

/**
 * Documentation links for error resolution
 */
const docsUrls: Record<ErrorCode, string> = {
  VALIDATION_ERROR: '/docs/api/validation',
  MARKET_DATA_MISSING: '/docs/pricing/fallback-pricing',
  INVENTORY_CREATION_FAILED: '/docs/seller/inventory-creation',
  PRICING_CALCULATION_FAILED: '/docs/seller/pricing-policies',
  AUTHENTICATION_FAILED: '/docs/auth/login-help',
  AUTHORIZATION_FAILED: '/docs/auth/permissions',
  NOT_FOUND: '/docs/api/not-found',
  DUPLICATE_ENTRY: '/docs/seller/duplicate-items',
  DATABASE_ERROR: '/docs/support/contact',
  EXTERNAL_API_ERROR: '/docs/integrations/troubleshoot',
  SUBMISSION_FAILED: '/docs/seller/submission-troubleshooting',
  SUBMISSION_INVALID_ITEMS: '/docs/seller/item-validation',
  SUBMISSION_NO_ITEMS: '/docs/seller/adding-items',
  SUBMISSION_QUOTE_FAILED: '/docs/seller/quote-generation',
  SUBMISSION_ITEM_NOT_FOUND: '/docs/seller/missing-items',
  SUBMISSION_POLICY_MISSING: '/docs/seller/pricing-policies-setup',
  CONDITION_INVALID: '/docs/seller/condition-grades',
  PRICE_INVALID: '/docs/seller/pricing-requirements',
  QUANTITY_INVALID: '/docs/seller/quantity-requirements',
  RELEASE_NOT_FOUND: '/docs/seller/searching-catalog',
  POLICY_NOT_FOUND: '/docs/seller/pricing-policies-setup',
  CHECKOUT_ERROR: '/docs/buyer/checkout-troubleshooting',
  PAYMENT_ERROR: '/docs/buyer/payment-help',
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

  // Submission-specific errors
  submissionInvalidItems: (itemCount: number, invalidItems: string[]) =>
    createErrorResponse(
      'SUBMISSION_INVALID_ITEMS',
      `${invalidItems.length} of ${itemCount} items in your submission are invalid`,
      { itemCount, invalidItems }
    ),

  submissionNoItems: () =>
    createErrorResponse(
      'SUBMISSION_NO_ITEMS',
      'Your submission must include at least one item'
    ),

  submissionQuoteFailed: (itemId: string, reason: string) =>
    createErrorResponse(
      'SUBMISSION_QUOTE_FAILED',
      `Failed to generate quote for item "${itemId}": ${reason}`,
      { itemId, reason }
    ),

  submissionItemNotFound: (itemId: string) =>
    createErrorResponse(
      'SUBMISSION_ITEM_NOT_FOUND',
      `Item with ID "${itemId}" not found in catalog`,
      { itemId }
    ),

  submissionPolicyMissing: (releaseId: string, releaseTitle: string) =>
    createErrorResponse(
      'SUBMISSION_POLICY_MISSING',
      `No pricing policy configured for "${releaseTitle}" (${releaseId})`,
      { releaseId, releaseTitle }
    ),

  // Field validation errors
  conditionInvalid: (providedCondition: string) =>
    createErrorResponse(
      'CONDITION_INVALID',
      `"${providedCondition}" is not a valid condition grade`,
      { providedCondition }
    ),

  priceInvalid: (reason: string) =>
    createErrorResponse(
      'PRICE_INVALID',
      `Price validation failed: ${reason}`,
      { reason }
    ),

  quantityInvalid: (reason: string) =>
    createErrorResponse(
      'QUANTITY_INVALID',
      `Quantity validation failed: ${reason}`,
      { reason }
    ),

  releaseNotFound: (query: string) =>
    createErrorResponse(
      'RELEASE_NOT_FOUND',
      `Release matching "${query}" not found in catalog`,
      { query }
    ),

  policyNotFound: (releaseId: string) =>
    createErrorResponse(
      'POLICY_NOT_FOUND',
      `No pricing policy found for release ${releaseId}`,
      { releaseId }
    ),
};

export default {
  createErrorResponse,
  createSuccessResponse,
  AppError,
};
