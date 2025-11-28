/**
 * Pricing API Routes
 * Endpoints for requesting pricing quotes and viewing audit logs
 */
export interface QuoteRequest {
    releaseId: string;
    policyId?: string;
    conditionMedia: string;
    conditionSleeve: string;
}
export interface QuoteResponse {
    success: boolean;
    data?: {
        releaseId: string;
        releaseTitle: string;
        releaseArtist: string;
        policyId: string;
        policyName: string;
        policyVersion: number;
        buyOffer: number;
        sellListPrice: number;
        breakdown: {
            buy: BreakdownDetail;
            sell: BreakdownDetail;
        };
        requiresManualReview: boolean;
        auditLogs: {
            buy: string;
            sell: string;
        };
    };
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}
export interface BreakdownDetail {
    marketSource: string;
    marketStat: string;
    baseMarketPrice: number | null;
    formulaPercentage: number;
    conditionAdjustment: number;
    mediaWeight: number;
    sleeveWeight: number;
    priceBeforeRounding: number;
    roundingIncrement: number;
    finalPrice: number;
    appliedCaps: {
        minCap: number | null;
        maxCap: number | null;
        cappedPrice: number;
    };
}
/**
 * Request a pricing quote for a release
 * Returns both buy offer and sell list price with breakdown
 */
export declare function getPricingQuote(request: QuoteRequest): Promise<QuoteResponse>;
/**
 * Get pricing audit logs for a release
 */
export declare function getAuditLogsForRelease(releaseId: string, limit?: number, offset?: number): Promise<{
    success: boolean;
    data?: {
        releaseId: string;
        logs: Array<{
            id: string;
            calculationType: string;
            conditionMedia: string;
            conditionSleeve: string;
            marketPrice: number | null;
            calculatedPrice: number;
            policyId: string;
            policyVersion?: number;
            marketSnapshotId: string | null;
            createdAt: Date;
            breakdown?: Record<string, unknown>;
        }>;
        total: number;
        limit: number;
        offset: number;
    };
    error?: {
        code: string;
        message: string;
    };
}>;
/**
 * Get pricing audit logs for a policy
 */
export declare function getAuditLogsForPolicy(policyId: string, limit?: number, offset?: number): Promise<{
    success: boolean;
    data?: {
        policyId: string;
        logs: Array<{
            id: string;
            releaseId: string;
            releaseTitle?: string;
            releaseArtist?: string;
            calculationType: string;
            conditionMedia: string;
            conditionSleeve: string;
            marketPrice: number | null;
            calculatedPrice: number;
            marketSnapshotId: string | null;
            createdAt: Date;
            breakdown?: Record<string, unknown>;
        }>;
        total: number;
        limit: number;
        offset: number;
    };
    error?: {
        code: string;
        message: string;
    };
}>;
//# sourceMappingURL=pricing-routes.d.ts.map