/**
 * Seller API Routes
 * Endpoints for seller submission workflows: search, quote, and submission
 */
import { QuoteItem, SearchItem, QuoteResponse, SubmissionResponse, SubmissionDetail } from '../services/seller-submissions';
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
export declare function searchCatalog(request: SearchRequest): Promise<ApiResponse<SearchItem[]>>;
export interface QuoteRequest {
    items: QuoteItem[];
}
export declare function generateQuotes(request: QuoteRequest): Promise<ApiResponse<{
    quotes: QuoteResponse[];
    totalPayout: number;
}>>;
export interface CreateSubmissionRequest {
    sellerEmail: string;
    sellerPhone?: string;
    items: QuoteItem[];
    sellerConsent: boolean;
    offerExpiryDays?: number;
}
export declare function submitSellerOffer(request: CreateSubmissionRequest): Promise<ApiResponse<SubmissionResponse>>;
export interface GetSubmissionRequest {
    submissionNumber: string;
}
export declare function getSubmission(request: GetSubmissionRequest): Promise<ApiResponse<SubmissionDetail>>;
export interface GetSellerSubmissionsRequest {
    email: string;
    limit?: number;
    offset?: number;
}
export declare function getSellerSubmissions(request: GetSellerSubmissionsRequest): Promise<ApiResponse<{
    submissions: SubmissionDetail[];
    total: number;
}>>;
export declare function getConditionOptions(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    order: number;
    mediaAdjustment: number;
    sleeveAdjustment: number;
}>>>;
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
    condition: string;
    buyingPrice: number;
    sellingPrice: number;
    notes?: string;
}
export declare function createListing(request: CreateListingRequest): Promise<ApiResponse<{
    id: string;
    message: string;
}>>;
export {};
//# sourceMappingURL=seller-routes.d.ts.map