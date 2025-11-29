/**
 * Seller API Routes
 * Endpoints for seller submission workflows: search, quote, and submission
 */

import { PrismaClient } from '@prisma/client';
import {
  searchReleasesCatalog,
  formatSearchResults,
  generateQuotesForItems,
  createSellerSubmission,
  getSubmissionByNumber,
  getSubmissionsByEmail,
  getConditionTiers,
  QuoteItem,
  SearchItem,
  QuoteResponse,
  SubmissionResponse,
  SubmissionDetail,
} from '../services/seller-submissions.js';
import { ValidationError } from '../validation/inputs.js';

/**
 * Standard API response wrapper
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface SearchRequest {
  query: string;
  limit?: number;
}

export async function searchCatalog(request: SearchRequest): Promise<ApiResponse<SearchItem[]>> {
  try {
    if (!request.query) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Search query is required',
        },
      };
    }

    const results = await searchReleasesCatalog(request.query, request.limit);
    const formatted = formatSearchResults(results);

    return {
      success: true,
      data: formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: error instanceof ValidationError ? 'VALIDATION_ERROR' : 'SEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
  }
}

export interface QuoteRequest {
  items: QuoteItem[];
}

export async function generateQuotes(request: QuoteRequest): Promise<ApiResponse<{
  quotes: QuoteResponse[];
  totalPayout: number;
}>> {
  try {
    if (!request.items || !Array.isArray(request.items) || request.items.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'At least one item is required for quote generation',
        },
      };
    }

    // Validate all items have required fields
    for (let i = 0; i < request.items.length; i++) {
      const item = request.items[i];
      if (!item.releaseId || typeof item.releaseId !== 'string') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `Item ${i + 1}: releaseId is required`,
          },
        };
      }
      if (!item.quantity || item.quantity < 1) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `Item ${i + 1}: quantity must be at least 1`,
          },
        };
      }
      if (!item.conditionMedia || typeof item.conditionMedia !== 'string') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `Item ${i + 1}: conditionMedia is required`,
          },
        };
      }
      if (!item.conditionSleeve || typeof item.conditionSleeve !== 'string') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `Item ${i + 1}: conditionSleeve is required`,
          },
        };
      }
    }

    const quotes = await generateQuotesForItems(request.items);
    const totalPayout = quotes.reduce((total, q) => total + q.totalOffer, 0);

    return {
      success: true,
      data: {
        quotes,
        totalPayout,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'QUOTE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate quotes',
      },
    };
  }
}

export interface CreateSubmissionRequest {
  sellerEmail: string;
  sellerPhone?: string;
  items: QuoteItem[];
  sellerConsent: boolean;
  offerExpiryDays?: number;
}

export async function submitSellerOffer(request: CreateSubmissionRequest): Promise<ApiResponse<SubmissionResponse>> {
  try {
    // Validate email format
    if (!request.sellerEmail || typeof request.sellerEmail !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Seller email is required',
        },
      };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.sellerEmail)) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid email format',
        },
      };
    }

    if (!request.sellerConsent) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Seller must consent to notifications',
        },
      };
    }

    if (!request.items || !Array.isArray(request.items) || request.items.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'At least one item is required',
        },
      };
    }

    const submission = await createSellerSubmission(request);

    return {
      success: true,
      data: submission,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: error instanceof ValidationError ? 'VALIDATION_ERROR' : 'SUBMISSION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create submission',
      },
    };
  }
}

export interface GetSubmissionRequest {
  submissionNumber: string;
}

export async function getSubmission(request: GetSubmissionRequest): Promise<ApiResponse<SubmissionDetail>> {
  try {
    if (!request.submissionNumber) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Submission number is required',
        },
      };
    }

    const submission = await getSubmissionByNumber(request.submissionNumber);

    if (!submission) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Submission not found: ${request.submissionNumber}`,
        },
      };
    }

    return {
      success: true,
      data: submission,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'RETRIEVAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve submission',
      },
    };
  }
}

export interface GetSellerSubmissionsRequest {
  email: string;
  limit?: number;
  offset?: number;
}

export async function getSellerSubmissions(request: GetSellerSubmissionsRequest): Promise<
  ApiResponse<{ submissions: SubmissionDetail[]; total: number }>
> {
  try {
    if (!request.email) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Email is required',
        },
      };
    }

    const { submissions, total } = await getSubmissionsByEmail(
      request.email,
      request.limit,
      request.offset
    );

    return {
      success: true,
      data: { submissions, total },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'RETRIEVAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve submissions',
      },
    };
  }
}

export async function getConditionOptions(): Promise<ApiResponse<Array<{
  id: string;
  name: string;
  order: number;
  mediaAdjustment: number;
  sleeveAdjustment: number;
}>>> {
  try {
    const tiers = await getConditionTiers();

    return {
      success: true,
      data: tiers,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'RETRIEVAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve condition tiers',
      },
    };
  }
}

export interface CreateListingRequest {
  discogsId: number;
  title: string;
  artist: string;
  year?: number;
  label: string;
  genre: string;
  format: string;
  catalog?: string;
  imageUrl?: string;
  condition?: string; // Backward compatibility
  conditionMedia?: string; // New separate field
  conditionSleeve?: string; // New separate field
  buyingPrice: number;
  sellingPrice: number;
  notes?: string;
}

export async function createListing(request: CreateListingRequest, userId: string): Promise<ApiResponse<{
  id: string;
  message: string;
  submissionNumber: string;
}>> {
  try {
    if (!request.discogsId || !request.title || !request.artist) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'discogsId, title, and artist are required',
        },
      };
    }

    // Create Prisma client for database operations
    const prisma = new PrismaClient();

    try {
      // Create or find release
      let release = await prisma.release.findFirst({
        where: {
          artist: { mode: 'insensitive', equals: request.artist },
          title: { mode: 'insensitive', equals: request.title },
        },
      });

      if (!release) {
        release = await prisma.release.create({
          data: {
            title: request.title,
            artist: request.artist,
            label: request.label,
            catalogNumber: request.catalog,
            releaseYear: request.year,
            genre: request.genre,
            coverArtUrl: request.imageUrl,
          },
        });
      }

      // Create seller submission
      const submissionNumber = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Use separate conditions if provided, otherwise fall back to single condition (backward compat)
      const mediaCondition = request.conditionMedia || request.condition || 'Very Good';
      const sleeveCondition = request.conditionSleeve || request.condition || 'Very Good';

      const submission = await prisma.sellerSubmission.create({
        data: {
          submissionNumber,
          sellerEmail: userId || 'unknown@demo.com',
          status: 'pending_review',
          expectedPayout: request.buyingPrice,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          items: {
            create: {
              releaseId: release.id,
              quantity: 1,
              sellerConditionMedia: mediaCondition,
              sellerConditionSleeve: sleeveCondition,
              autoOfferPrice: request.buyingPrice,
              itemNotes: request.notes,
            },
          },
        },
        include: {
          items: true,
        },
      });

      return {
        success: true,
        data: {
          id: submission.id,
          submissionNumber,
          message: 'Listing created successfully',
        },
      };
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'CREATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create listing',
      },
    };
  }
}
