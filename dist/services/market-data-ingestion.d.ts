import type { MarketSnapshot } from '@prisma/client';
export interface MarketDataRecord {
    releaseId: string;
    source: 'discogs' | 'ebay';
    statLow: number | null;
    statMedian: number | null;
    statHigh: number | null;
}
export interface IngestionResult {
    successCount: number;
    errorCount: number;
    errors: Array<{
        releaseId: string;
        source: string;
        error: string;
    }>;
}
/**
 * Update market snapshot data for a single record
 * Creates or updates the market snapshot based on release ID and source
 */
export declare function updateMarketSnapshot(data: MarketDataRecord): Promise<MarketSnapshot>;
/**
 * Batch update market snapshots from ingested data
 */
export declare function batchUpdateMarketSnapshots(records: MarketDataRecord[]): Promise<IngestionResult>;
/**
 * Get releases that need market data (have no snapshots or stale snapshots)
 */
export declare function getReleasesNeedingMarketData(maxAgeHours?: number, limit?: number): Promise<Array<{
    id: string;
    title: string;
    artist: string;
}>>;
/**
 * Get market data freshness statistics
 */
export declare function getMarketDataStats(): Promise<{
    totalReleases: number;
    releasesWithData: number;
    releasesWithoutData: number;
    dataBySource: {
        source: string;
        count: number;
        oldestFetch: Date | null;
        newestFetch: Date | null;
    }[];
    averageAgeHours: number;
}>;
/**
 * Clean up old market data (optional maintenance)
 * Deletes snapshots older than specified days
 */
export declare function cleanupOldMarketData(olderThanDays: number): Promise<number>;
//# sourceMappingURL=market-data-ingestion.d.ts.map