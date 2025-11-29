import type { PricingPolicy, PricingCalculationAudit } from '@prisma/client';
export interface PricingCalculationInput {
    releaseId: string;
    policy: PricingPolicy;
    conditionMedia: string;
    conditionSleeve: string;
    calculationType: 'buy_offer' | 'sell_price';
}
export interface PricingCalculationOutput {
    releaseId: string;
    policyId: string;
    policyVersion: number;
    offerPrice: number;
    listPrice: number;
    breakdown: CalculationBreakdown;
    requiresManualReview: boolean;
    marketSnapshotId?: string;
    auditLogId: string;
}
export interface CalculationBreakdown {
    marketSource: string;
    marketStat: string;
    baseMarketPrice: number | null;
    formulaPercentage: number;
    conditionAdjustment: number;
    mediaWeight: number;
    sleeveWeight: number;
    policyConditionDiscount: number | null;
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
 * Calculate pricing (offer or list price) for a release
 * Returns both offer and list prices in a single calculation
 */
export declare function calculatePricing(input: PricingCalculationInput): Promise<PricingCalculationOutput>;
/**
 * Get full pricing quote (both offer and list price)
 * Returns a complete quote with all pricing information
 */
export declare function getFullPricingQuote(releaseId: string, policy: PricingPolicy, conditionMedia: string, conditionSleeve: string): Promise<{
    releaseId: string;
    policyId: string;
    policyVersion: number;
    buyOffer: number;
    sellListPrice: number;
    breakdown: {
        buy: CalculationBreakdown;
        sell: CalculationBreakdown;
    };
    requiresManualReview: boolean;
    auditLogs: {
        buy: string;
        sell: string;
    };
}>;
/**
 * Get pricing audit logs for a release
 */
export declare function getPricingAuditLogs(releaseId: string, limit?: number, offset?: number): Promise<{
    logs: Array<PricingCalculationAudit & {
        policy: PricingPolicy | null;
        marketSnapshot: any;
    }>;
    total: number;
}>;
/**
 * Get pricing audit logs by policy
 */
export declare function getPricingAuditLogsByPolicy(policyId: string, limit?: number, offset?: number): Promise<{
    logs: Array<PricingCalculationAudit & {
        release: any;
        marketSnapshot: any;
    }>;
    total: number;
}>;
//# sourceMappingURL=pricing.d.ts.map