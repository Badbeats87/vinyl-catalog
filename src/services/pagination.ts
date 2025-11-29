/**
 * Pagination Utilities
 * Provides consistent pagination format across all API endpoints
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Parse pagination parameters from request
 * Supports both page/pageSize and offset/limit formats
 */
export function parsePaginationParams(params: PaginationParams) {
  // Support both pagination formats
  let page = params.page || 1;
  let pageSize = params.pageSize || params.limit || 20;

  // Ensure reasonable values
  page = Math.max(1, page);
  pageSize = Math.min(200, Math.max(1, pageSize)); // Max 200 per page

  const offset = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    offset,
    limit: pageSize,
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pageSize);

  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Calculate offset from page number and page size
 */
export function getOffset(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}

/**
 * Get page number from offset and page size
 */
export function getPage(offset: number, pageSize: number): number {
  return Math.floor(offset / pageSize) + 1;
}

export default {
  parsePaginationParams,
  createPaginatedResponse,
  getOffset,
  getPage,
};
