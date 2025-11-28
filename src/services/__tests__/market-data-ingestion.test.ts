import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../db/client';
import {
  updateMarketSnapshot,
  batchUpdateMarketSnapshots,
  getReleasesNeedingMarketData,
  getMarketDataStats,
  cleanupOldMarketData,
  type MarketDataRecord,
} from '../market-data-ingestion';
import type { Release } from '@prisma/client';

describe('Market Data Ingestion Service', () => {
  let testRelease1: Release;
  let testRelease2: Release;
  let testRelease3: Release;

  beforeAll(async () => {
    // Clean up test data
    await prisma.pricingCalculationAudit.deleteMany({});
    await prisma.marketSnapshot.deleteMany({});
    await prisma.release.deleteMany({});

    // Create test releases
    testRelease1 = await prisma.release.create({
      data: {
        title: 'Album 1',
        artist: 'Artist 1',
      },
    });

    testRelease2 = await prisma.release.create({
      data: {
        title: 'Album 2',
        artist: 'Artist 2',
      },
    });

    testRelease3 = await prisma.release.create({
      data: {
        title: 'Album 3',
        artist: 'Artist 3',
      },
    });

    // Create one market snapshot for testRelease1
    await prisma.marketSnapshot.create({
      data: {
        releaseId: testRelease1.id,
        source: 'discogs',
        statLow: 10.0,
        statMedian: 20.0,
        statHigh: 30.0,
      },
    });
  });

  afterAll(async () => {
    await prisma.pricingCalculationAudit.deleteMany({});
    await prisma.marketSnapshot.deleteMany({});
    await prisma.release.deleteMany({});
    await prisma.$disconnect();
  });

  describe('updateMarketSnapshot', () => {
    it('should create a new market snapshot', async () => {
      const snapshot = await updateMarketSnapshot({
        releaseId: testRelease2.id,
        source: 'discogs',
        statLow: 5.0,
        statMedian: 15.0,
        statHigh: 25.0,
      });

      expect(snapshot.releaseId).toBe(testRelease2.id);
      expect(snapshot.source).toBe('discogs');
      expect(snapshot.statMedian).toBe(15.0);
    });

    it('should update an existing market snapshot', async () => {
      const originalSnapshot = await prisma.marketSnapshot.findUnique({
        where: {
          releaseId_source: {
            releaseId: testRelease1.id,
            source: 'discogs',
          },
        },
      });

      const updatedSnapshot = await updateMarketSnapshot({
        releaseId: testRelease1.id,
        source: 'discogs',
        statLow: 12.0,
        statMedian: 22.0,
        statHigh: 32.0,
      });

      expect(updatedSnapshot.id).toBe(originalSnapshot?.id);
      expect(updatedSnapshot.statMedian).toBe(22.0);
      expect(updatedSnapshot.updatedAt.getTime()).toBeGreaterThan(originalSnapshot?.updatedAt.getTime() || 0);
    });

    it('should create different sources for same release', async () => {
      await updateMarketSnapshot({
        releaseId: testRelease2.id,
        source: 'ebay',
        statLow: 8.0,
        statMedian: 18.0,
        statHigh: 28.0,
      });

      const discogs = await prisma.marketSnapshot.findUnique({
        where: {
          releaseId_source: {
            releaseId: testRelease2.id,
            source: 'discogs',
          },
        },
      });

      const ebay = await prisma.marketSnapshot.findUnique({
        where: {
          releaseId_source: {
            releaseId: testRelease2.id,
            source: 'ebay',
          },
        },
      });

      expect(discogs).toBeDefined();
      expect(ebay).toBeDefined();
      expect(discogs?.id).not.toBe(ebay?.id);
    });
  });

  describe('batchUpdateMarketSnapshots', () => {
    it('should batch update multiple snapshots', async () => {
      const records: MarketDataRecord[] = [
        {
          releaseId: testRelease3.id,
          source: 'discogs',
          statLow: 7.0,
          statMedian: 17.0,
          statHigh: 27.0,
        },
        {
          releaseId: testRelease3.id,
          source: 'ebay',
          statLow: 9.0,
          statMedian: 19.0,
          statHigh: 29.0,
        },
      ];

      const result = await batchUpdateMarketSnapshots(records);

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid release IDs', async () => {
      const records: MarketDataRecord[] = [
        {
          releaseId: 'invalid-release-id',
          source: 'discogs',
          statLow: 10.0,
          statMedian: 20.0,
          statHigh: 30.0,
        },
      ];

      const result = await batchUpdateMarketSnapshots(records);

      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toContain('Release not found');
    });

    it('should reject negative prices', async () => {
      const records: MarketDataRecord[] = [
        {
          releaseId: testRelease1.id,
          source: 'discogs',
          statLow: -5.0,
          statMedian: 20.0,
          statHigh: 30.0,
        },
      ];

      const result = await batchUpdateMarketSnapshots(records);

      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toContain('negative');
    });

    it('should continue processing after error', async () => {
      const records: MarketDataRecord[] = [
        {
          releaseId: 'invalid-id',
          source: 'discogs',
          statLow: 10.0,
          statMedian: 20.0,
          statHigh: 30.0,
        },
        {
          releaseId: testRelease1.id,
          source: 'ebay',
          statLow: 11.0,
          statMedian: 21.0,
          statHigh: 31.0,
        },
      ];

      const result = await batchUpdateMarketSnapshots(records);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should accept null values in market data', async () => {
      const newRelease = await prisma.release.create({
        data: {
          title: 'Partial Data Album',
          artist: 'Artist',
        },
      });

      const records: MarketDataRecord[] = [
        {
          releaseId: newRelease.id,
          source: 'discogs',
          statLow: null,
          statMedian: 20.0,
          statHigh: null,
        },
      ];

      const result = await batchUpdateMarketSnapshots(records);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);

      const snapshot = await prisma.marketSnapshot.findUnique({
        where: {
          releaseId_source: {
            releaseId: newRelease.id,
            source: 'discogs',
          },
        },
      });

      expect(snapshot?.statLow).toBeNull();
      expect(snapshot?.statMedian).toBe(20.0);
      expect(snapshot?.statHigh).toBeNull();

      await prisma.release.delete({ where: { id: newRelease.id } });
    });
  });

  describe('getReleasesNeedingMarketData', () => {
    beforeAll(async () => {
      // Create a fresh release for this test
      await prisma.release.create({
        data: {
          title: 'Fresh Album',
          artist: 'Fresh Artist',
        },
      });

      // Create a release with very old market data
      const oldRelease = await prisma.release.create({
        data: {
          title: 'Old Data Album',
          artist: 'Old Artist',
        },
      });

      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

      await prisma.marketSnapshot.create({
        data: {
          releaseId: oldRelease.id,
          source: 'discogs',
          statLow: 10.0,
          statMedian: 20.0,
          statHigh: 30.0,
          fetchedAt: oldDate,
        },
      });
    });

    it('should find releases without market data', async () => {
      const releases = await getReleasesNeedingMarketData(24, 100);

      const hasNoData = releases.some((r) => r.title === 'Fresh Album');
      expect(hasNoData).toBe(true);
    });

    it('should find releases with stale market data', async () => {
      const releases = await getReleasesNeedingMarketData(24, 100); // 24 hours max age

      const hasStaleData = releases.some((r) => r.title === 'Old Data Album');
      expect(hasStaleData).toBe(true);
    });

    it('should not find releases with fresh market data', async () => {
      const releases = await getReleasesNeedingMarketData(24, 100); // 24 hours max age

      // testRelease1 has fresh data
      const hasFreshData = releases.some((r) => r.id === testRelease1.id);
      expect(hasFreshData).toBe(false);
    });

    it('should respect limit parameter', async () => {
      const releases = await getReleasesNeedingMarketData(1, 1); // Limit to 1

      expect(releases.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getMarketDataStats', () => {
    it('should return market data statistics', async () => {
      const stats = await getMarketDataStats();

      expect(stats.totalReleases).toBeGreaterThan(0);
      expect(stats.releasesWithData).toBeGreaterThanOrEqual(0);
      expect(stats.releasesWithoutData).toBeGreaterThanOrEqual(0);
      expect(stats.totalReleases).toBe(stats.releasesWithData + stats.releasesWithoutData);
      expect(stats.dataBySource.length).toBeGreaterThan(0);
      expect(stats.averageAgeHours).toBeGreaterThanOrEqual(0);
    });

    it('should correctly count releases by source', async () => {
      const stats = await getMarketDataStats();

      const discogs = stats.dataBySource.find((s) => s.source === 'discogs');
      const ebay = stats.dataBySource.find((s) => s.source === 'ebay');

      expect(discogs).toBeDefined();
      expect(discogs?.count).toBeGreaterThan(0);

      // We've created some eBay snapshots
      expect(ebay?.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanupOldMarketData', () => {
    it('should delete market data older than specified days', async () => {
      // Create a very old snapshot
      const veryOldRelease = await prisma.release.create({
        data: {
          title: 'Very Old Album',
          artist: 'Very Old Artist',
        },
      });

      const veryOldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

      await prisma.marketSnapshot.create({
        data: {
          releaseId: veryOldRelease.id,
          source: 'discogs',
          statLow: 10.0,
          statMedian: 20.0,
          statHigh: 30.0,
          fetchedAt: veryOldDate,
        },
      });

      const countBefore = await prisma.marketSnapshot.count();

      // Cleanup snapshots older than 30 days
      const deletedCount = await cleanupOldMarketData(30);

      expect(deletedCount).toBeGreaterThan(0);

      const countAfter = await prisma.marketSnapshot.count();

      expect(countAfter).toBeLessThan(countBefore);

      // Verify the old snapshot is gone
      const deleted = await prisma.marketSnapshot.findFirst({
        where: {
          releaseId: veryOldRelease.id,
          source: 'discogs',
        },
      });

      expect(deleted).toBeNull();

      await prisma.release.delete({ where: { id: veryOldRelease.id } });
    });

    it('should not delete recent market data', async () => {
      const recentSnapshot = await prisma.marketSnapshot.findFirst({
        where: { source: 'discogs' },
      });

      const countBefore = await prisma.marketSnapshot.count();

      // Cleanup snapshots older than 1000 days - nothing should be deleted
      const deletedCount = await cleanupOldMarketData(1000);

      const countAfter = await prisma.marketSnapshot.count();

      if (recentSnapshot) {
        // If there were any snapshots, they should still exist
        const stillExists = await prisma.marketSnapshot.findUnique({
          where: { id: recentSnapshot.id },
        });

        expect(stillExists).toBeDefined();
        expect(countAfter).toBe(countBefore);
      }
    });
  });
});
