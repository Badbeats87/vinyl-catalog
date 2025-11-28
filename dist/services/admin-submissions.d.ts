/**
 * Admin Submission Management Service
 * Handles admin operations: viewing submissions, filtering, accepting/rejecting, inspection, etc.
 */
export interface AdminSubmissionListFilters {
    status?: string;
    sellerEmail?: string;
    startDate?: Date;
    endDate?: Date;
    minValue?: number;
    maxValue?: number;
    limit?: number;
    offset?: number;
}
export interface AdminSubmissionSummary {
    id: string;
    submissionNumber: string;
    sellerEmail: string;
    sellerPhone?: string;
    status: string;
    expectedPayout: number;
    actualPayout?: number;
    itemCount: number;
    createdAt: Date;
    expiresAt: Date;
}
/**
 * List submissions with filtering for admin dashboard
 */
export declare function listAdminSubmissions(filters?: AdminSubmissionListFilters): Promise<{
    submissions: AdminSubmissionSummary[];
    total: number;
}>;
export interface AdminSubmissionDetail {
    id: string;
    submissionNumber: string;
    sellerEmail: string;
    sellerPhone?: string;
    status: string;
    expectedPayout: number;
    actualPayout?: number;
    notes?: string;
    createdAt: Date;
    expiresAt: Date;
    items: Array<{
        id: string;
        releaseId: string;
        title: string;
        artist: string;
        quantity: number;
        sellerConditionMedia: string;
        sellerConditionSleeve: string;
        autoOfferPrice: number;
        finalOfferPrice?: number;
        finalConditionMedia?: string;
        finalConditionSleeve?: string;
        status: string;
        itemNotes?: string;
    }>;
    history: Array<{
        id: string;
        actionType: string;
        adminNotes?: string;
        adjustedPrice?: number;
        sellerResponse?: string;
        createdAt: Date;
    }>;
}
/**
 * Get detailed view of a submission for admin
 */
export declare function getAdminSubmissionDetail(submissionId: string): Promise<AdminSubmissionDetail | null>;
export interface AcceptSubmissionItemInput {
    submissionItemId: string;
    finalConditionMedia?: string;
    finalConditionSleeve?: string;
    finalOfferPrice?: number;
    adminNotes?: string;
}
/**
 * Accept a single submission item
 */
export declare function acceptSubmissionItem(input: AcceptSubmissionItemInput): Promise<void>;
export interface RejectSubmissionItemInput {
    submissionItemId: string;
    adminNotes?: string;
}
/**
 * Reject a single submission item
 */
export declare function rejectSubmissionItem(input: RejectSubmissionItemInput): Promise<void>;
export interface CounterOfferItemInput {
    submissionItemId: string;
    newPrice: number;
    adminNotes?: string;
}
/**
 * Send counter-offer to seller for a specific item
 */
export declare function counterOfferSubmissionItem(input: CounterOfferItemInput): Promise<void>;
export interface InspectSubmissionItemInput {
    submissionItemId: string;
    finalConditionMedia: string;
    finalConditionSleeve: string;
    adminNotes?: string;
}
/**
 * Mark an accepted item as received and inspected (update condition based on inspection)
 */
export declare function inspectSubmissionItem(input: InspectSubmissionItemInput): Promise<void>;
export interface FinalizeSubmissionItemInput {
    submissionItemId: string;
}
/**
 * Finalize a received/inspected item - converts to inventory if accepted
 */
export declare function finalizeSubmissionItem(input: FinalizeSubmissionItemInput): Promise<string>;
export interface AcceptAllSubmissionItemsInput {
    submissionId: string;
    adminNotes?: string;
}
/**
 * Accept all pending items in a submission at once
 */
export declare function acceptAllSubmissionItems(input: AcceptAllSubmissionItemsInput): Promise<number>;
export interface RejectAllSubmissionItemsInput {
    submissionId: string;
    adminNotes?: string;
}
/**
 * Reject all pending items in a submission at once
 */
export declare function rejectAllSubmissionItems(input: RejectAllSubmissionItemsInput): Promise<number>;
/**
 * Get submission metrics summary for admin dashboard
 */
export declare function getAdminSubmissionMetrics(): Promise<{
    totalSubmissions: number;
    submissionsByStatus: {
        status: string;
        count: number;
    }[];
    totalExpectedPayout: number;
    itemsByStatus: {
        status: string;
        count: number;
    }[];
}>;
/**
 * Respond to counter-offer from seller
 */
export declare function recordSellerCounterOfferResponse(submissionItemId: string, response: 'accepted' | 'rejected'): Promise<void>;
//# sourceMappingURL=admin-submissions.d.ts.map