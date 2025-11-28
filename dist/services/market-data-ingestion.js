import { prisma } from '../db/client';
/**
 * Update market snapshot data for a single record
 * Creates or updates the market snapshot based on release ID and source
 */
export async function updateMarketSnapshot(data) {
    const snapshot = await prisma.marketSnapshot.upsert({
        where: {
            releaseId_source: {
                releaseId: data.releaseId,
                source: data.source,
            },
        },
        update: {
            statLow: data.statLow,
            statMedian: data.statMedian,
            statHigh: data.statHigh,
            fetchedAt: new Date(),
            updatedAt: new Date(),
        },
        create: {
            releaseId: data.releaseId,
            source: data.source,
            statLow: data.statLow,
            statMedian: data.statMedian,
            statHigh: data.statHigh,
            fetchedAt: new Date(),
        },
    });
    return snapshot;
}
/**
 * Batch update market snapshots from ingested data
 */
export async function batchUpdateMarketSnapshots(records) {
    const result = {
        successCount: 0,
        errorCount: 0,
        errors: [],
    };
    for (const record of records) {
        try {
            // Validate that the release exists
            const release = await prisma.release.findUnique({
                where: { id: record.releaseId },
            });
            if (!release) {
                result.errorCount++;
                result.errors.push({
                    releaseId: record.releaseId,
                    source: record.source,
                    error: `Release not found: ${record.releaseId}`,
                });
                continue;
            }
            // Validate price values
            if ((record.statLow !== null && record.statLow < 0) ||
                (record.statMedian !== null && record.statMedian < 0) ||
                (record.statHigh !== null && record.statHigh < 0)) {
                result.errorCount++;
                result.errors.push({
                    releaseId: record.releaseId,
                    source: record.source,
                    error: 'Price values cannot be negative',
                });
                continue;
            }
            await updateMarketSnapshot(record);
            result.successCount++;
        }
        catch (error) {
            result.errorCount++;
            result.errors.push({
                releaseId: record.releaseId,
                source: record.source,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    return result;
}
/**
 * Get releases that need market data (have no snapshots or stale snapshots)
 */
export async function getReleasesNeedingMarketData(maxAgeHours = 24, limit = 100) {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const releases = await prisma.release.findMany({
        where: {
            OR: [
                {
                    marketSnapshots: {
                        none: {},
                    },
                },
                {
                    marketSnapshots: {
                        every: {
                            fetchedAt: {
                                lt: cutoffDate,
                            },
                        },
                    },
                },
            ],
        },
        select: {
            id: true,
            title: true,
            artist: true,
        },
        take: limit,
    });
    return releases;
}
/**
 * Get market data freshness statistics
 */
export async function getMarketDataStats() {
    const totalReleases = await prisma.release.count();
    const releasesWithData = await prisma.release.count({
        where: {
            marketSnapshots: {
                some: {},
            },
        },
    });
    const releasesWithoutData = totalReleases - releasesWithData;
    const dataBySource = await prisma.marketSnapshot.groupBy({
        by: ['source'],
        _count: true,
        _min: {
            fetchedAt: true,
        },
        _max: {
            fetchedAt: true,
        },
    });
    const allSnapshots = await prisma.marketSnapshot.findMany({
        select: {
            fetchedAt: true,
        },
    });
    let averageAgeHours = 0;
    if (allSnapshots.length > 0) {
        const now = new Date();
        const totalAge = allSnapshots.reduce((sum, snap) => {
            return sum + (now.getTime() - snap.fetchedAt.getTime());
        }, 0);
        averageAgeHours = (totalAge / allSnapshots.length) / (60 * 60 * 1000);
    }
    return {
        totalReleases,
        releasesWithData,
        releasesWithoutData,
        dataBySource: dataBySource.map((source) => ({
            source: source.source,
            count: source._count,
            oldestFetch: source._min.fetchedAt,
            newestFetch: source._max.fetchedAt,
        })),
        averageAgeHours,
    };
}
/**
 * Clean up old market data (optional maintenance)
 * Deletes snapshots older than specified days
 */
export async function cleanupOldMarketData(olderThanDays) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await prisma.marketSnapshot.deleteMany({
        where: {
            fetchedAt: {
                lt: cutoffDate,
            },
        },
    });
    return result.count;
}
//# sourceMappingURL=market-data-ingestion.js.map