/**
 * Admin API Routes
 * Handles admin operations for submissions, inventory, and business intelligence
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}
/**
 * List submissions with filters for admin dashboard
 */
export declare function listSubmissions(status?: string, sellerEmail?: string, startDate?: string, endDate?: string, minValue?: number, maxValue?: number, limit?: number, offset?: number): Promise<ApiResponse<any>>;
/**
 * Get submission detail for admin
 */
export declare function getSubmissionDetail(submissionId: string): Promise<ApiResponse<any>>;
export interface AcceptItemInput {
    submissionItemId: string;
    finalConditionMedia?: string;
    finalConditionSleeve?: string;
    finalOfferPrice?: number;
    adminNotes?: string;
}
/**
 * Accept a submission item
 */
export declare function acceptItem(input: AcceptItemInput): Promise<ApiResponse<null>>;
export interface RejectItemInput {
    submissionItemId: string;
    adminNotes?: string;
}
/**
 * Reject a submission item
 */
export declare function rejectItem(input: RejectItemInput): Promise<ApiResponse<null>>;
export interface CounterOfferInput {
    submissionItemId: string;
    newPrice: number;
    adminNotes?: string;
}
/**
 * Send counter-offer for a submission item
 */
export declare function counterOffer(input: CounterOfferInput): Promise<ApiResponse<null>>;
export interface InspectItemInput {
    submissionItemId: string;
    finalConditionMedia: string;
    finalConditionSleeve: string;
    adminNotes?: string;
}
/**
 * Inspect a received submission item and update condition
 */
export declare function inspectItem(input: InspectItemInput): Promise<ApiResponse<null>>;
/**
 * Finalize an inspected item (convert to inventory)
 */
export declare function finalizeItem(submissionItemId: string): Promise<ApiResponse<{
    lotNumber: string;
}>>;
export interface AcceptAllItemsInput {
    submissionId: string;
    adminNotes?: string;
}
/**
 * Accept all pending items in a submission
 */
export declare function acceptAllItems(input: AcceptAllItemsInput): Promise<ApiResponse<{
    acceptedCount: number;
}>>;
export interface RejectAllItemsInput {
    submissionId: string;
    adminNotes?: string;
}
/**
 * Reject all pending items in a submission
 */
export declare function rejectAllItems(input: RejectAllItemsInput): Promise<ApiResponse<{
    rejectedCount: number;
}>>;
/**
 * Get admin submission metrics for dashboard
 */
export declare function getSubmissionMetrics(): Promise<ApiResponse<any>>;
/**
 * Record seller's response to counter-offer
 */
export declare function recordCounterOfferResponse(submissionItemId: string, response: 'accepted' | 'rejected'): Promise<ApiResponse<null>>;
/**
 * List inventory lots
 */
export declare function listInventory(status?: string, channel?: string, releaseId?: string, minPrice?: number, maxPrice?: number, limit?: number, offset?: number): Promise<ApiResponse<any>>;
/**
 * Get inventory lot detail
 */
export declare function getInventoryDetail(identifier: string, byLotNumber?: boolean): Promise<ApiResponse<any>>;
export interface UpdateInventoryInput {
    lotId?: string;
    id?: string;
    listPrice?: number;
    status?: string;
    internalNotes?: string;
    channel?: string;
}
/**
 * Update inventory lot
 */
export declare function updateInventory(input: UpdateInventoryInput): Promise<ApiResponse<null>>;
/**
 * Bulk update inventory lots
 */
export interface BulkUpdateInventoryInput {
    lotIds: string[];
    updates: {
        status?: string;
        channel?: string;
        priceUpdate?: {
            type: 'set' | 'increase_amount' | 'increase_percent' | 'decrease_amount' | 'decrease_percent';
            value: number;
        };
    };
}
export declare function bulkUpdateInventory(input: BulkUpdateInventoryInput): Promise<ApiResponse<any>>;
/**
 * Get inventory metrics
 */
export declare function getInventoryMetricsRoute(): Promise<ApiResponse<any>>;
/**
 * List buyer orders with filters for admin dashboard
 */
export declare function listBuyerOrders(status?: string, paymentStatus?: string, limit?: number, offset?: number): Promise<ApiResponse<any>>;
/**
 * Get order detail for admin
 */
export declare function getBuyerOrderDetail(orderId: string): Promise<ApiResponse<any>>;
/**
 * Get sales reconciliation data - link lots to orders
 */
export declare function getSalesReconciliation(startDate?: string, endDate?: string, limit?: number, offset?: number): Promise<ApiResponse<any>>;
/**
 * Accept submission and create inventory
 */
export declare function acceptSubmissionAndCreateInventory(submissionId: string): Promise<ApiResponse<any>>;
/**
 * Reject submission
 */
export declare function rejectSubmission(submissionId: string): Promise<ApiResponse<null>>;
//# sourceMappingURL=admin-routes.d.ts.map