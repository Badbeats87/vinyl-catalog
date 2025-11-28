/**
 * Seller API Routes
 * Endpoints for seller submission workflows: search, quote, and submission
 */
import { searchReleasesCatalog, formatSearchResults, generateQuotesForItems, createSellerSubmission, getSubmissionByNumber, getSubmissionsByEmail, getConditionTiers, } from '../services/seller-submissions';
import { ValidationError } from '../validation/inputs';
export async function searchCatalog(request) {
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
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: error instanceof ValidationError ? 'VALIDATION_ERROR' : 'SEARCH_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
        };
    }
}
export async function generateQuotes(request) {
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
        const totalPayout = quotes.reduce((sum, q) => q.totalOffer, 0);
        return {
            success: true,
            data: {
                quotes,
                totalPayout,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'QUOTE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to generate quotes',
            },
        };
    }
}
export async function submitSellerOffer(request) {
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
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: error instanceof ValidationError ? 'VALIDATION_ERROR' : 'SUBMISSION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to create submission',
            },
        };
    }
}
export async function getSubmission(request) {
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
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'RETRIEVAL_ERROR',
                message: error instanceof Error ? error.message : 'Failed to retrieve submission',
            },
        };
    }
}
export async function getSellerSubmissions(request) {
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
        const { submissions, total } = await getSubmissionsByEmail(request.email, request.limit, request.offset);
        return {
            success: true,
            data: { submissions, total },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'RETRIEVAL_ERROR',
                message: error instanceof Error ? error.message : 'Failed to retrieve submissions',
            },
        };
    }
}
export async function getConditionOptions() {
    try {
        const tiers = await getConditionTiers();
        return {
            success: true,
            data: tiers,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'RETRIEVAL_ERROR',
                message: error instanceof Error ? error.message : 'Failed to retrieve condition tiers',
            },
        };
    }
}
//# sourceMappingURL=seller-routes.js.map