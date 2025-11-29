/**
 * Inventory Management Service
 * Handles inventory lot creation and management
 */
import { SubmissionItem } from '@prisma/client';
export interface CreateInventoryLotInput {
    releaseId: string;
    conditionMedia: string;
    conditionSleeve: string;
    costBasis: number;
    listPrice: number;
    quantity?: number;
    channel?: string;
    internalNotes?: string;
    status?: string;
}
/**
 * Create a new inventory lot
 */
export declare function createInventoryLot(input: CreateInventoryLotInput): Promise<string>;
/**
 * Create inventory lot from a submission item
 * Uses finalized values if available, otherwise falls back to seller-provided values
 * Applies pricing strategy to calculate selling price
 */
export declare function createInventoryLotFromSubmissionItem(item: SubmissionItem): Promise<string>;
/**
 * Get an inventory lot by ID or lot number
 */
export declare function getInventoryLot(identifier: string, byLotNumber?: boolean): Promise<any | null>;
/**
 * List inventory lots with filtering
 */
export declare function listInventoryLots(filters?: {
    status?: string;
    channel?: string;
    releaseId?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
}): Promise<{
    lots: any[];
    total: number;
}>;
/**
 * Update inventory lot
 */
export declare function updateInventoryLot(lotId: string, updates: {
    listPrice?: number;
    status?: string;
    internalNotes?: string;
    channel?: string;
    conditionMedia?: string;
    conditionSleeve?: string;
}): Promise<void>;
/**
 * Get inventory metrics
 */
export declare function getInventoryMetrics(): Promise<{
    totalLots: number;
    lotsByStatus: {
        status: string;
        count: number;
    }[];
    totalInventoryValue: number;
    totalCostBasis: number;
}>;
/**
 * Bulk update inventory lots
 */
export declare function bulkUpdateInventoryLots(lotIds: string[], updates: {
    status?: string;
    channel?: string;
    priceUpdate?: {
        type: 'set' | 'increase_amount' | 'increase_percent' | 'decrease_amount' | 'decrease_percent';
        value: number;
    };
}): Promise<{
    updatedCount: number;
    errors: string[];
}>;
//# sourceMappingURL=inventory-management.d.ts.map