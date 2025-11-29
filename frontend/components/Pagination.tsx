'use client';

import { FC } from 'react';

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

/**
 * Pagination Component
 * Displays navigation controls for paginated content
 */
export const Pagination: FC<PaginationProps> = ({
  pagination,
  onPageChange,
  isLoading = false,
}) => {
  const { page, totalPages, hasNextPage, hasPrevPage, total, pageSize } = pagination;

  if (totalPages <= 1) {
    return null; // Don't show pagination if only one page
  }

  // Calculate item range
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  // Generate page numbers to display (show max 5 pages)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust start if end is near the limit
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // Add first page ellipsis
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add last page ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Item count info */}
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold">{startItem}</span> to{' '}
        <span className="font-semibold">{endItem}</span> of{' '}
        <span className="font-semibold">{total}</span> items
      </div>

      {/* Pagination buttons */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage || isLoading}
          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Previous page"
        >
          ← Prev
        </button>

        {/* Page number buttons */}
        {pageNumbers.map((pageNum, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (typeof pageNum === 'number') {
                onPageChange(pageNum);
              }
            }}
            disabled={pageNum === '...' || isLoading}
            className={`px-3 py-2 rounded transition ${
              pageNum === page
                ? 'bg-green-600 text-white font-semibold'
                : pageNum === '...'
                ? 'cursor-default'
                : 'border border-gray-300 hover:bg-gray-100 disabled:opacity-50'
            }`}
            aria-label={`Page ${pageNum}`}
            aria-current={pageNum === page ? 'page' : undefined}
          >
            {pageNum}
          </button>
        ))}

        {/* Next button */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage || isLoading}
          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>

      {/* Page info */}
      <div className="text-sm text-gray-600">
        Page <span className="font-semibold">{page}</span> of{' '}
        <span className="font-semibold">{totalPages}</span>
      </div>
    </div>
  );
};

export default Pagination;
