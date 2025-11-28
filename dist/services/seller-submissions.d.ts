/**
 * Seller Submission Service
 * Handles seller workflows: search, quote generation, and submission management
 */
import { Release, SellerSubmission } from '@prisma/client';
export interface SearchResult extends Release {
    matchScore: number;
}
/**
 * Search releases by artist, title, or barcode with fuzzy matching
 * Returns results sorted by relevance
 */
export declare function searchReleasesCatalog(query: string, limit?: number): Promise<SearchResult[]>;
export interface SearchItem {
    releaseId: string;
    title: string;
    artist: string;
    barcode?: string;
    genre?: string;
    coverArtUrl?: string;
    releaseYear?: number;
    matchScore: number;
}
/**
 * Format search results for API response
 */
export declare function formatSearchResults(results: SearchResult[]): SearchItem[];
export interface QuoteItem {
    releaseId: string;
    quantity: number;
    conditionMedia: string;
    conditionSleeve: string;
}
export interface QuoteResponse {
    releaseId: string;
    title: string;
    artist: string;
    quantity: number;
    conditionMedia: string;
    conditionSleeve: string;
    buyOffer: number;
    totalOffer: number;
}
/**
 * Generate quote for selected items with conditions
 */
export declare function generateQuotesForItems(items: QuoteItem[]): Promise<QuoteResponse[]>;
export interface CreateSubmissionInput {
    sellerEmail: string;
    sellerPhone?: string;
    items: QuoteItem[];
    sellerConsent: boolean;
    offerExpiryDays?: number;
}
export interface SubmissionResponse {
    submissionNumber: string;
    submissionId: string;
    sellerEmail: string;
    expectedPayout: number;
    items: QuoteResponse[];
    expiresAt: Date;
    status: string;
}
/**
 * Create a new seller submission with multiple items
 */
export declare function createSellerSubmission(input: CreateSubmissionInput): Promise<SubmissionResponse>;
export interface SubmissionDetail {
    submissionNumber: string;
    submissionId: string;
    sellerEmail: string;
    sellerPhone?: string;
    status: string;
    expectedPayout: number;
    actualPayout?: number;
    items: Array<{
        itemId: string;
        releaseId: string;
        title: string;
        artist: string;
        quantity: number;
        conditionMedia: string;
        conditionSleeve: string;
        autoOfferPrice: number;
        totalOffer: number;
        itemStatus: string;
    }>;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Get submission details by submission number
 */
export declare function getSubmissionByNumber(submissionNumber: string): Promise<SubmissionDetail | null>;
/**
 * Get all submissions for a seller email (paginated)
 */
export declare function getSubmissionsByEmail(email: string, limit?: number, offset?: number): Promise<{
    submissions: SubmissionDetail[];
    total: number;
}>;
/**
 * Update submission status
 */
export declare function updateSubmissionStatus(submissionId: string, status: string, actualPayout?: number): Promise<SellerSubmission | null>;
/**
 * Get all condition tiers for frontend
 */
export declare function getConditionTiers(): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    order: number;
    mediaAdjustment: number;
    sleeveAdjustment: number;
}[]>;
//# sourceMappingURL=seller-submissions.d.ts.map