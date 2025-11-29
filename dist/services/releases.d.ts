import { Release } from '@prisma/client';
export interface CreateReleaseInput {
    title: string;
    artist: string;
    label?: string;
    catalogNumber?: string;
    barcode?: string;
    releaseYear?: number;
    genre?: string;
    coverArtUrl?: string;
}
export interface UpdateReleaseInput {
    title?: string;
    artist?: string;
    label?: string;
    catalogNumber?: string;
    barcode?: string;
    releaseYear?: number;
    genre?: string;
    coverArtUrl?: string;
}
/**
 * Create a new release with validation
 */
export declare function createRelease(input: CreateReleaseInput): Promise<Release>;
/**
 * Get a release by ID
 */
export declare function getReleaseById(id: string): Promise<Release | null>;
/**
 * Get a release by barcode
 */
export declare function getReleaseByBarcode(barcode: string): Promise<Release | null>;
/**
 * Search releases by artist/title with case-insensitive matching
 * Performs separate queries for each term and merges results
 * Note: For production, consider pg_trgm extension for fuzzy matching
 */
export declare function searchReleases(query: string, limit?: number): Promise<Release[]>;
/**
 * Get all releases with pagination
 */
export declare function getAllReleases(skip?: number, take?: number): Promise<Release[]>;
/**
 * Get releases by genre
 */
export declare function getReleasesByGenre(genre: string, limit?: number): Promise<Release[]>;
/**
 * Update a release
 */
export declare function updateRelease(id: string, input: UpdateReleaseInput): Promise<Release | null>;
/**
 * Delete a release
 */
export declare function deleteRelease(id: string): Promise<boolean>;
/**
 * Get release with related market snapshots and inventory
 */
export declare function getReleaseWithDetails(id: string): Promise<({
    marketSnapshots: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        releaseId: string;
        source: string;
        statLow: number | null;
        statMedian: number | null;
        statHigh: number | null;
        fetchedAt: Date;
    }[];
    inventoryLots: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        releaseId: string;
        conditionMedia: string;
        conditionSleeve: string;
        listPrice: number;
        status: string;
        quantity: number;
        lotNumber: string;
        costBasis: number;
        channel: string;
        availableQuantity: number;
        internalNotes: string | null;
        listedAt: Date | null;
    }[];
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    artist: string;
    label: string | null;
    catalogNumber: string | null;
    barcode: string | null;
    releaseYear: number | null;
    genre: string | null;
    coverArtUrl: string | null;
}) | null>;
/**
 * Count total releases
 */
export declare function countReleases(): Promise<number>;
/**
 * Get releases with no market snapshot (missing pricing data)
 */
export declare function getReleasesWithoutPricing(limit?: number): Promise<Release[]>;
//# sourceMappingURL=releases.d.ts.map