import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../../db/client';
import { calculatePricing, getFullPricingQuote, getPricingAuditLogs } from '../pricing';
import type { Release, PricingPolicy, MarketSnapshot, ConditionTier } from '@prisma/client';

describe('Pricing Service', () => {
  let testRelease: Release;
  let testPolicy: PricingPolicy;
  let discogsSnapshot: MarketSnapshot;
  let ebaySnapshot: MarketSnapshot;
  let conditionMint: ConditionTier;
  let conditionNM: ConditionTier;
  let conditionVGPlus: ConditionTier;

  beforeAll(async () => {
    // Clean up test data (but not all releases - leave seed data for other tests)
    await prisma.pricingCalculationAudit.deleteMany({});
    await prisma.marketSnapshot.deleteMany({});

    // Create or get condition tiers
    conditionMint = await prisma.conditionTier.upsert({
      where: { name: 'Mint' },
      update: {},
      create: {
        name: 'Mint',
        order: 1,
        mediaAdjustment: 1.15,
        sleeveAdjustment: 1.15,
      },
    });

    conditionNM = await prisma.conditionTier.upsert({
      where: { name: 'NM' },
      update: {},
      create: {
        name: 'NM',
        order: 2,
        mediaAdjustment: 1.0,
        sleeveAdjustment: 1.0,
      },
    });

    conditionVGPlus = await prisma.conditionTier.upsert({
      where: { name: 'VG+' },
      update: {},
      create: {
        name: 'VG+',
        order: 3,
        mediaAdjustment: 0.85,
        sleeveAdjustment: 0.85,
      },
    });

    // Create test release
    testRelease = await prisma.release.create({
      data: {
        title: 'Test Album',
        artist: 'Test Artist',
        label: 'Test Label',
        genre: 'Rock',
      },
    });

    // Create test policy
    testPolicy = await prisma.pricingPolicy.create({
      data: {
        name: 'Test Policy',
        scope: 'global',
        buyMarketSource: 'discogs',
        buyMarketStat: 'median',
        buyPercentage: 0.55,
        buyMinCap: 1.0,
        buyMaxCap: 100.0,
        sellMarketSource: 'discogs',
        sellMarketStat: 'median',
        sellPercentage: 1.25,
        sellMinCap: 2.0,
        sellMaxCap: 200.0,
        applyConditionAdjustment: true,
        mediaWeight: 0.6,
        sleeveWeight: 0.4,
        roundingIncrement: 0.25,
        requiresManualReview: false,
      },
    });

    // Create market snapshots
    discogsSnapshot = await prisma.marketSnapshot.create({
      data: {
        releaseId: testRelease.id,
        source: 'discogs',
        statLow: 10.0,
        statMedian: 20.0,
        statHigh: 30.0,
      },
    });

    ebaySnapshot = await prisma.marketSnapshot.create({
      data: {
        releaseId: testRelease.id,
        source: 'ebay',
        statLow: 12.0,
        statMedian: 22.0,
        statHigh: 32.0,
      },
    });
  });

  afterAll(async () => {
    // Clean up test-specific data only (keep seed data)
    await prisma.pricingCalculationAudit.deleteMany({
      where: { releaseId: testRelease.id },
    });
    await prisma.marketSnapshot.deleteMany({
      where: { releaseId: testRelease.id },
    });
    await prisma.release.deleteMany({
      where: { id: testRelease.id },
    });
    await prisma.pricingPolicy.deleteMany({
      where: { id: testPolicy.id },
    });
    await prisma.$disconnect();
  });

  describe('calculatePricing', () => {
    it('should calculate buy offer with median market price and condition adjustments', async () => {
      const result = await calculatePricing({
        releaseId: testRelease.id,
        policy: testPolicy,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
        calculationType: 'buy_offer',
      });

      // Expected: 20 * 0.55 (buy percentage) * 1.0 (condition) = 11.0
      expect(result.breakdown.finalPrice).toBe(11.0);
      expect(result.breakdown.marketSource).toBe('discogs');
      expect(result.breakdown.baseMarketPrice).toBe(20.0);
      expect(result.breakdown.formulaPercentage).toBe(0.55);
      expect(result.breakdown.conditionAdjustment).toBe(1.0);
      expect(result.auditLogId).toBeDefined();
    });

    it('should calculate sell price with apply condition adjustments', async () => {
      const result = await calculatePricing({
        releaseId: testRelease.id,
        policy: testPolicy,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
        calculationType: 'sell_price',
      });

      // Expected: 20 * 1.25 (sell percentage) * 1.0 (condition) = 25.0
      expect(result.breakdown.finalPrice).toBe(25.0);
      expect(result.breakdown.formulaPercentage).toBe(1.25);
    });

    it('should apply condition curve for Mint media and NM sleeve', async () => {
      const result = await calculatePricing({
        releaseId: testRelease.id,
        policy: testPolicy,
        conditionMedia: 'Mint',
        conditionSleeve: 'NM',
        calculationType: 'buy_offer',
      });

      // Condition adjustment: 1.15 * 0.6 + 1.0 * 0.4 = 0.69 + 0.4 = 1.09
      // Price: 20 * 0.55 * 1.09 = 12.01, rounded to 12.0
      expect(result.breakdown.conditionAdjustment).toBeCloseTo(1.09, 2);
      expect(result.breakdown.finalPrice).toBe(12.0);
    });

    it('should apply rounding increment correctly', async () => {
      const result = await calculatePricing({
        releaseId: testRelease.id,
        policy: testPolicy,
        conditionMedia: 'VG+',
        conditionSleeve: 'VG+',
        calculationType: 'buy_offer',
      });

      // Condition adjustment: 0.85 * 0.6 + 0.85 * 0.4 = 0.85
      // Price: 20 * 0.55 * 0.85 = 9.35, rounded to nearest 0.25 = 9.25
      expect(result.breakdown.priceBeforeRounding).toBeCloseTo(9.35, 2);
      expect(result.breakdown.finalPrice).toBe(9.25);
    });

    it('should apply minimum cap when calculated price is below minimum', async () => {
      // Create policy with high buy percentage to force checking min cap
      const capTestPolicy = await prisma.pricingPolicy.create({
        data: {
          name: 'Cap Test Policy ' + Date.now(),
          scope: 'global',
          buyMarketSource: 'discogs',
          buyMarketStat: 'low', // Use statLow (10.0)
          buyPercentage: 0.05, // Very low percentage: 10 * 0.05 = 0.5, which is below minCap of 1.0
          buyMinCap: 1.0,
          buyMaxCap: 100.0,
          sellMarketSource: 'discogs',
          sellMarketStat: 'median',
          sellPercentage: 1.25,
          sellMinCap: 2.0,
          sellMaxCap: 200.0,
          applyConditionAdjustment: false,
          mediaWeight: 0.5,
          sleeveWeight: 0.5,
          roundingIncrement: 0.25,
        },
      });

      const result = await calculatePricing({
        releaseId: testRelease.id,
        policy: capTestPolicy,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
        calculationType: 'buy_offer',
      });

      // Should be capped at minCap: 1.0
      expect(result.breakdown.finalPrice).toBe(1.0);
      expect(result.breakdown.appliedCaps.minCap).toBe(1.0);
      expect(result.breakdown.appliedCaps.cappedPrice).toBe(1.0);

    });

    it('should apply maximum cap when calculated price is above maximum', async () => {
      // Create policy with high sell percentage
      const capTestPolicy = await prisma.pricingPolicy.create({
        data: {
          name: 'Max Cap Test Policy ' + Date.now(),
          scope: 'global',
          buyMarketSource: 'discogs',
          buyMarketStat: 'median',
          buyPercentage: 0.55,
          buyMinCap: 1.0,
          buyMaxCap: 5.0, // Low max cap
          sellMarketSource: 'discogs',
          sellMarketStat: 'median',
          sellPercentage: 1.25,
          sellMinCap: 2.0,
          sellMaxCap: 200.0,
          applyConditionAdjustment: false,
          mediaWeight: 0.5,
          sleeveWeight: 0.5,
          roundingIncrement: 0.25,
        },
      });

      const result = await calculatePricing({
        releaseId: testRelease.id,
        policy: capTestPolicy,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
        calculationType: 'buy_offer',
      });

      // Without cap: 20 * 0.55 = 11.0, but capped at 5.0
      expect(result.breakdown.finalPrice).toBe(5.0);
      expect(result.breakdown.appliedCaps.maxCap).toBe(5.0);
      expect(result.breakdown.appliedCaps.cappedPrice).toBe(5.0);

    });

    it('should handle missing market data with requiresManualReview flag', async () => {
      // Create release without market data
      const noDataRelease = await prisma.release.create({
        data: {
          title: 'No Data Album',
          artist: 'No Data Artist',
        },
      });

      // Policy with manual review flag
      const manualReviewPolicy = await prisma.pricingPolicy.create({
        data: {
          name: 'Manual Review Policy ' + Date.now(),
          scope: 'global',
          buyMarketSource: 'discogs',
          buyMarketStat: 'median',
          buyPercentage: 0.55,
          buyMinCap: 5.0,
          buyMaxCap: 100.0,
          sellMarketSource: 'discogs',
          sellMarketStat: 'median',
          sellPercentage: 1.25,
          sellMinCap: 2.0,
          sellMaxCap: 200.0,
          applyConditionAdjustment: false,
          mediaWeight: 0.5,
          sleeveWeight: 0.5,
          roundingIncrement: 0.25,
          requiresManualReview: true,
        },
      });

      const result = await calculatePricing({
        releaseId: noDataRelease.id,
        policy: manualReviewPolicy,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
        calculationType: 'buy_offer',
      });

      expect(result.requiresManualReview).toBe(true);
      expect(result.breakdown.baseMarketPrice).toBeNull();
      // Falls back to minCap
      expect(result.breakdown.finalPrice).toBe(5.0);

      await prisma.release.delete({ where: { id: noDataRelease.id } });
    });

    it('should not apply condition adjustment when disabled in policy', async () => {
      // Create policy with condition adjustment disabled
      const noConditionPolicy = await prisma.pricingPolicy.create({
        data: {
          name: 'No Condition Policy ' + Date.now(),
          scope: 'global',
          buyMarketSource: 'discogs',
          buyMarketStat: 'median',
          buyPercentage: 0.55,
          buyMinCap: 1.0,
          buyMaxCap: 100.0,
          sellMarketSource: 'discogs',
          sellMarketStat: 'median',
          sellPercentage: 1.25,
          sellMinCap: 2.0,
          sellMaxCap: 200.0,
          applyConditionAdjustment: false,
          mediaWeight: 0.6,
          sleeveWeight: 0.4,
          roundingIncrement: 0.25,
        },
      });

      const result = await calculatePricing({
        releaseId: testRelease.id,
        policy: noConditionPolicy,
        conditionMedia: 'Mint',
        conditionSleeve: 'Mint',
        calculationType: 'buy_offer',
      });

      // Should use 1.0 adjustment even though Mint is 1.15
      expect(result.breakdown.conditionAdjustment).toBe(1.0);
      // Price: 20 * 0.55 * 1.0 = 11.0
      expect(result.breakdown.finalPrice).toBe(11.0);
    });

    it('should create audit log with calculation breakdown', async () => {
      const result = await calculatePricing({
        releaseId: testRelease.id,
        policy: testPolicy,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
        calculationType: 'buy_offer',
      });

      const audit = await prisma.pricingCalculationAudit.findUnique({
        where: { id: result.auditLogId },
      });

      expect(audit).toBeDefined();
      expect(audit?.releaseId).toBe(testRelease.id);
      expect(audit?.policyId).toBe(testPolicy.id);
      expect(audit?.calculationType).toBe('buy_offer');
      expect(audit?.calculatedPrice).toBe(11.0);
      expect(audit?.calculationDetails).toBeDefined();

      const breakdown = JSON.parse(audit?.calculationDetails || '{}');
      expect(breakdown.finalPrice).toBe(11.0);
      expect(breakdown.marketSource).toBe('discogs');
    });
  });

  describe('getFullPricingQuote', () => {
    it('should return both buy and sell prices with breakdown', async () => {
      const quote = await getFullPricingQuote(
        testRelease.id,
        testPolicy,
        'NM',
        'NM'
      );

      expect(quote.releaseId).toBe(testRelease.id);
      expect(quote.policyId).toBe(testPolicy.id);
      expect(quote.buyOffer).toBe(11.0); // 20 * 0.55 * 1.0
      expect(quote.sellListPrice).toBe(25.0); // 20 * 1.25 * 1.0
      expect(quote.breakdown.buy).toBeDefined();
      expect(quote.breakdown.sell).toBeDefined();
      expect(quote.auditLogs.buy).toBeDefined();
      expect(quote.auditLogs.sell).toBeDefined();
    });

    it('should reflect different market stats in breakdown', async () => {
      const quote = await getFullPricingQuote(
        testRelease.id,
        testPolicy,
        'NM',
        'NM'
      );

      expect(quote.breakdown.buy.marketStat).toBe('median');
      expect(quote.breakdown.buy.baseMarketPrice).toBe(20.0);
      expect(quote.breakdown.sell.baseMarketPrice).toBe(20.0);
    });
  });

  describe('getPricingAuditLogs', () => {
    beforeAll(async () => {
      // Create several audit logs
      for (let i = 0; i < 5; i++) {
        await calculatePricing({
          releaseId: testRelease.id,
          policy: testPolicy,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
          calculationType: i % 2 === 0 ? 'buy_offer' : 'sell_price',
        });
      }
    });

    it('should retrieve audit logs for a release', async () => {
      const { logs, total } = await getPricingAuditLogs(testRelease.id);

      expect(logs.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);
      expect(logs[0].releaseId).toBe(testRelease.id);
    });

    it('should support pagination', async () => {
      const { logs: logs1, total: total1 } = await getPricingAuditLogs(testRelease.id, 2, 0);
      const { logs: logs2, total: total2 } = await getPricingAuditLogs(testRelease.id, 2, 2);

      expect(logs1.length).toBeLessThanOrEqual(2);
      expect(logs2.length).toBeLessThanOrEqual(2);
      expect(total1).toBe(total2); // Same total
      expect(logs1[0].id).not.toBe(logs2[0]?.id); // Different items
    });

    it('should order audit logs by creation date descending', async () => {
      const { logs } = await getPricingAuditLogs(testRelease.id, 10);

      for (let i = 0; i < logs.length - 1; i++) {
        expect(logs[i].createdAt.getTime()).toBeGreaterThanOrEqual(logs[i + 1].createdAt.getTime());
      }
    });
  });

  describe('Condition combinations and rounding', () => {
    it('should calculate correct condition weights', async () => {
      const testCases = [
        {
          media: 'Mint',
          sleeve: 'Mint',
          expectedAdjustment: 1.15, // 1.15 * 0.6 + 1.15 * 0.4
        },
        {
          media: 'Mint',
          sleeve: 'VG+',
          expectedAdjustment: 1.02, // 1.15 * 0.6 + 0.85 * 0.4 = 0.69 + 0.34
        },
        {
          media: 'VG+',
          sleeve: 'Mint',
          expectedAdjustment: 1.02, // 0.85 * 0.6 + 1.15 * 0.4 = 0.51 + 0.46
        },
        {
          media: 'VG+',
          sleeve: 'VG+',
          expectedAdjustment: 0.85, // 0.85 * 0.6 + 0.85 * 0.4
        },
      ];

      for (const testCase of testCases) {
        const result = await calculatePricing({
          releaseId: testRelease.id,
          policy: testPolicy,
          conditionMedia: testCase.media,
          conditionSleeve: testCase.sleeve,
          calculationType: 'buy_offer',
        });

        expect(result.breakdown.conditionAdjustment).toBeCloseTo(testCase.expectedAdjustment, 1);
      }
    });

    it('should round to nearest increment correctly', async () => {
      const roundingTests = [
        { increment: 0.25, price: 11.03, expected: 11.0 },
        { increment: 0.25, price: 11.13, expected: 11.25 },
        { increment: 0.25, price: 11.38, expected: 11.5 },
        { increment: 0.5, price: 11.3, expected: 11.5 },
        { increment: 0.5, price: 11.2, expected: 11.0 },
      ];

      for (const test of roundingTests) {
        const policy = await prisma.pricingPolicy.create({
          data: {
            name: `Rounding Test ${test.increment}`,
            scope: 'global',
            buyMarketSource: 'discogs',
            buyMarketStat: 'median',
            buyPercentage: test.price / 20, // Will yield exactly the target price
            buyMinCap: 1.0,
            buyMaxCap: 500.0,
            sellMarketSource: 'discogs',
            sellMarketStat: 'median',
            sellPercentage: 1.25,
            sellMinCap: 2.0,
            sellMaxCap: 200.0,
            applyConditionAdjustment: false,
            mediaWeight: 0.5,
            sleeveWeight: 0.5,
            roundingIncrement: test.increment,
          },
        });

        const result = await calculatePricing({
          releaseId: testRelease.id,
          policy,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
          calculationType: 'buy_offer',
        });

        expect(result.breakdown.finalPrice).toBe(test.expected);

      }
    });
  });

  describe('Hybrid market source fallback', () => {
    it('should use discogs when hybrid source is configured and discogs exists', async () => {
      const hybridPolicy = await prisma.pricingPolicy.create({
        data: {
          name: 'Hybrid Policy ' + Date.now(),
          scope: 'global',
          buyMarketSource: 'hybrid',
          buyMarketStat: 'median',
          buyPercentage: 0.55,
          buyMinCap: 1.0,
          buyMaxCap: 100.0,
          sellMarketSource: 'hybrid',
          sellMarketStat: 'median',
          sellPercentage: 1.25,
          sellMinCap: 2.0,
          sellMaxCap: 200.0,
          applyConditionAdjustment: false,
          mediaWeight: 0.5,
          sleeveWeight: 0.5,
          roundingIncrement: 0.25,
        },
      });

      const result = await calculatePricing({
        releaseId: testRelease.id,
        policy: hybridPolicy,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
        calculationType: 'buy_offer',
      });

      expect(result.breakdown.marketSource).toBe('discogs');
      expect(result.breakdown.baseMarketPrice).toBe(20.0); // discogs median

    });

    it('should fall back to ebay when discogs is missing but ebay exists', async () => {
      // Create release with only eBay data
      const ebayOnlyRelease = await prisma.release.create({
        data: {
          title: 'eBay Only Album',
          artist: 'eBay Only Artist',
        },
      });

      await prisma.marketSnapshot.create({
        data: {
          releaseId: ebayOnlyRelease.id,
          source: 'ebay',
          statLow: 15.0,
          statMedian: 25.0,
          statHigh: 35.0,
        },
      });

      const hybridPolicy = await prisma.pricingPolicy.create({
        data: {
          name: 'Hybrid Fallback Policy ' + Date.now(),
          scope: 'global',
          buyMarketSource: 'hybrid',
          buyMarketStat: 'median',
          buyPercentage: 0.55,
          buyMinCap: 1.0,
          buyMaxCap: 100.0,
          sellMarketSource: 'hybrid',
          sellMarketStat: 'median',
          sellPercentage: 1.25,
          sellMinCap: 2.0,
          sellMaxCap: 200.0,
          applyConditionAdjustment: false,
          mediaWeight: 0.5,
          sleeveWeight: 0.5,
          roundingIncrement: 0.25,
        },
      });

      const result = await calculatePricing({
        releaseId: ebayOnlyRelease.id,
        policy: hybridPolicy,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
        calculationType: 'buy_offer',
      });

      expect(result.breakdown.marketSource).toBe('ebay');
      expect(result.breakdown.baseMarketPrice).toBe(25.0); // ebay median

      await prisma.release.delete({ where: { id: ebayOnlyRelease.id } });
    });
  });
});
