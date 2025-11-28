import { PricingPolicy } from '@prisma/client';
export interface CreatePricingPolicyInput {
    name: string;
    description?: string;
    scope: 'global' | 'genre' | 'release';
    scopeValue?: string;
    buyMarketSource?: string;
    buyMarketStat?: string;
    buyPercentage?: number;
    buyMinCap?: number;
    buyMaxCap?: number;
    offerExpiryDays?: number;
    sellMarketSource?: string;
    sellMarketStat?: string;
    sellPercentage?: number;
    sellMinCap?: number;
    sellMaxCap?: number;
    applyConditionAdjustment?: boolean;
    mediaWeight?: number;
    sleeveWeight?: number;
    roundingIncrement?: number;
    requiresManualReview?: boolean;
    profitMarginTarget?: number;
    isActive?: boolean;
}
export interface UpdatePricingPolicyInput {
    name?: string;
    description?: string;
    buyMarketSource?: string;
    buyMarketStat?: string;
    buyPercentage?: number;
    buyMinCap?: number;
    buyMaxCap?: number;
    offerExpiryDays?: number;
    sellMarketSource?: string;
    sellMarketStat?: string;
    sellPercentage?: number;
    sellMinCap?: number;
    sellMaxCap?: number;
    applyConditionAdjustment?: boolean;
    mediaWeight?: number;
    sleeveWeight?: number;
    roundingIncrement?: number;
    requiresManualReview?: boolean;
    profitMarginTarget?: number;
    isActive?: boolean;
}
/**
 * Create a new pricing policy with validation
 */
export declare function createPricingPolicy(input: CreatePricingPolicyInput): Promise<PricingPolicy>;
/**
 * Get a pricing policy by ID
 */
export declare function getPricingPolicyById(id: string): Promise<PricingPolicy | null>;
/**
 * Get the default global policy
 */
export declare function getDefaultPolicy(): Promise<PricingPolicy | null>;
/**
 * Get active policies with pagination
 */
export declare function getActivePolicies(skip?: number, take?: number): Promise<PricingPolicy[]>;
/**
 * Get all policies (including inactive) with pagination
 */
export declare function getAllPolicies(skip?: number, take?: number): Promise<PricingPolicy[]>;
/**
 * Get policies by scope
 */
export declare function getPoliciesByScope(scope: 'global' | 'genre' | 'release', limit?: number): Promise<PricingPolicy[]>;
/**
 * Get policy for a specific genre
 */
export declare function getPolicyForGenre(genre: string): Promise<PricingPolicy | null>;
/**
 * Get policy for a specific release
 */
export declare function getPolicyForRelease(releaseId: string): Promise<PricingPolicy | null>;
/**
 * Update a pricing policy with validation
 */
export declare function updatePricingPolicy(id: string, input: UpdatePricingPolicyInput): Promise<PricingPolicy | null>;
/**
 * Deactivate a pricing policy
 */
export declare function deactivatePricingPolicy(id: string): Promise<PricingPolicy | null>;
/**
 * Delete a pricing policy (only if no references exist)
 */
export declare function deletePricingPolicy(id: string): Promise<boolean>;
/**
 * Get policy history (all versions)
 */
export declare function getPolicyHistory(baseName: string): Promise<PricingPolicy[]>;
/**
 * Count active policies
 */
export declare function countActivePolicies(): Promise<number>;
/**
 * Get policies requiring manual review
 */
export declare function getPoliciesRequiringManualReview(): Promise<PricingPolicy[]>;
//# sourceMappingURL=pricing-policies.d.ts.map