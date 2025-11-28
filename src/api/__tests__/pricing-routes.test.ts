import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../db/client';
import { getPricingQuote, getAuditLogsForRelease, getAuditLogsForPolicy } from '../pricing-routes';
import type { Release, PricingPolicy } from '@prisma/client';

describe('Pricing API Routes', () => {
  let testRelease: Release;
  let testPolicy: PricingPolicy;

  beforeAll(async () => {
    // Clean up test data
    await prisma.pricingCalculationAudit.deleteMany({});
    await prisma.marketSnapshot.deleteMany({});
    await prisma.release.deleteMany({});
    await prisma.pricingPolicy.deleteMany({});
    await prisma.conditionTier.deleteMany({});

    // Create or get condition tiers
    await prisma.conditionTier.upsert({
      where: { name: 'Mint' },
      update: {},
      create: { name: 'Mint', order: 1, mediaAdjustment: 1.15, sleeveAdjustment: 1.15 },
    });

    await prisma.conditionTier.upsert({
      where: { name: 'NM' },
      update: {},
      create: { name: 'NM', order: 2, mediaAdjustment: 1.0, sleeveAdjustment: 1.0 },
    });

    // Create test release
    testRelease = await prisma.release.create({
      data: {
        title: 'Test Album',
        artist: 'Test Artist',
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
        mediaWeight: 0.5,
        sleeveWeight: 0.5,
        roundingIncrement: 0.25,
      },
    });

    // Create market snapshot
    await prisma.marketSnapshot.create({
      data: {
        releaseId: testRelease.id,
        source: 'discogs',
        statLow: 10.0,
        statMedian: 20.0,
        statHigh: 30.0,
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

  describe('getPricingQuote', () => {
    it('should return a successful pricing quote', async () => {
      const response = await getPricingQuote({
        releaseId: testRelease.id,
        policyId: testPolicy.id,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.releaseId).toBe(testRelease.id);
      expect(response.data?.releaseTitle).toBe('Test Album');
      expect(response.data?.releaseArtist).toBe('Test Artist');
      expect(response.data?.policyId).toBe(testPolicy.id);
      expect(response.data?.policyName).toBe('Test Policy');
      expect(response.data?.buyOffer).toBe(11.0); // 20 * 0.55 * 1.0
      expect(response.data?.sellListPrice).toBe(25.0); // 20 * 1.25 * 1.0
      expect(response.data?.breakdown).toBeDefined();
      expect(response.data?.auditLogs).toBeDefined();
    });

    it('should return breakdown with all calculation details', async () => {
      const response = await getPricingQuote({
        releaseId: testRelease.id,
        policyId: testPolicy.id,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
      });

      expect(response.data?.breakdown.buy).toBeDefined();
      expect(response.data?.breakdown.sell).toBeDefined();

      const buyBreakdown = response.data?.breakdown.buy;
      expect(buyBreakdown?.marketSource).toBe('discogs');
      expect(buyBreakdown?.baseMarketPrice).toBe(20.0);
      expect(buyBreakdown?.formulaPercentage).toBe(0.55);
      expect(buyBreakdown?.conditionAdjustment).toBe(1.0);
      expect(buyBreakdown?.finalPrice).toBe(11.0);
    });

    it('should return error for non-existent release', async () => {
      const response = await getPricingQuote({
        releaseId: 'invalid-release-id',
        policyId: testPolicy.id,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('RELEASE_NOT_FOUND');
    });

    it('should return error for non-existent policy', async () => {
      const response = await getPricingQuote({
        releaseId: testRelease.id,
        policyId: 'invalid-policy-id',
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('POLICY_NOT_FOUND');
    });

    it('should return error for invalid condition', async () => {
      const response = await getPricingQuote({
        releaseId: testRelease.id,
        policyId: testPolicy.id,
        conditionMedia: 'InvalidCondition',
        conditionSleeve: 'NM',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_CONDITION');
    });

    it('should use default policy when policyId not provided', async () => {
      // Create genre-specific policy
      const genrePolicy = await prisma.pricingPolicy.create({
        data: {
          name: 'Rock Policy',
          scope: 'genre',
          scopeValue: 'Rock',
          buyMarketSource: 'discogs',
          buyMarketStat: 'median',
          buyPercentage: 0.60, // Different from default
          buyMinCap: 1.0,
          buyMaxCap: 100.0,
          sellMarketSource: 'discogs',
          sellMarketStat: 'median',
          sellPercentage: 1.20,
          sellMinCap: 2.0,
          sellMaxCap: 200.0,
          applyConditionAdjustment: true,
          mediaWeight: 0.5,
          sleeveWeight: 0.5,
          roundingIncrement: 0.25,
          isActive: true,
        },
      });

      const response = await getPricingQuote({
        releaseId: testRelease.id,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
      });

      expect(response.success).toBe(true);
      expect(response.data?.policyId).toBeDefined();

      await prisma.pricingPolicy.delete({ where: { id: genrePolicy.id } });
    });

    it('should include audit log IDs in response', async () => {
      const response = await getPricingQuote({
        releaseId: testRelease.id,
        policyId: testPolicy.id,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
      });

      expect(response.data?.auditLogs.buy).toBeDefined();
      expect(response.data?.auditLogs.sell).toBeDefined();
      expect(response.data?.auditLogs.buy).not.toBe(response.data?.auditLogs.sell);

      // Verify audit logs exist
      const buyAudit = await prisma.pricingCalculationAudit.findUnique({
        where: { id: response.data?.auditLogs.buy || '' },
      });

      const sellAudit = await prisma.pricingCalculationAudit.findUnique({
        where: { id: response.data?.auditLogs.sell || '' },
      });

      expect(buyAudit?.calculationType).toBe('buy_offer');
      expect(sellAudit?.calculationType).toBe('sell_price');
    });
  });

  describe('getAuditLogsForRelease', () => {
    beforeAll(async () => {
      // Generate some audit logs
      for (let i = 0; i < 5; i++) {
        await getPricingQuote({
          releaseId: testRelease.id,
          policyId: testPolicy.id,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        });
      }
    });

    it('should return audit logs for a release', async () => {
      const response = await getAuditLogsForRelease(testRelease.id);

      expect(response.success).toBe(true);
      expect(response.data?.releaseId).toBe(testRelease.id);
      expect(response.data?.logs.length).toBeGreaterThan(0);
      expect(response.data?.total).toBeGreaterThan(0);
    });

    it('should include breakdown data in logs', async () => {
      const response = await getAuditLogsForRelease(testRelease.id, 1);

      const log = response.data?.logs[0];
      expect(log?.breakdown).toBeDefined();
      expect(log?.calculationType).toBeDefined();
      expect(log?.marketPrice).toBeDefined();
      expect(log?.calculatedPrice).toBeDefined();
    });

    it('should support pagination', async () => {
      const page1 = await getAuditLogsForRelease(testRelease.id, 2, 0);
      const page2 = await getAuditLogsForRelease(testRelease.id, 2, 2);

      expect(page1.data?.logs.length).toBeLessThanOrEqual(2);
      expect(page2.data?.logs.length).toBeLessThanOrEqual(2);

      if (page1.data?.total! > 2) {
        expect(page1.data?.logs[0].id).not.toBe(page2.data?.logs[0]?.id);
      }
    });

    it('should return error for non-existent release', async () => {
      const response = await getAuditLogsForRelease('invalid-release-id');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('RELEASE_NOT_FOUND');
    });
  });

  describe('getAuditLogsForPolicy', () => {
    beforeAll(async () => {
      // Generate logs for the policy
      for (let i = 0; i < 3; i++) {
        await getPricingQuote({
          releaseId: testRelease.id,
          policyId: testPolicy.id,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        });
      }
    });

    it('should return audit logs for a policy', async () => {
      const response = await getAuditLogsForPolicy(testPolicy.id);

      expect(response.success).toBe(true);
      expect(response.data?.policyId).toBe(testPolicy.id);
      expect(response.data?.logs.length).toBeGreaterThan(0);
      expect(response.data?.total).toBeGreaterThan(0);
    });

    it('should include release information in logs', async () => {
      const response = await getAuditLogsForPolicy(testPolicy.id, 1);

      const log = response.data?.logs[0];
      expect(log?.releaseTitle).toBeDefined();
      expect(log?.releaseArtist).toBeDefined();
      expect(log?.releaseId).toBeDefined();
    });

    it('should support pagination', async () => {
      const page1 = await getAuditLogsForPolicy(testPolicy.id, 2, 0);
      const page2 = await getAuditLogsForPolicy(testPolicy.id, 2, 2);

      expect(page1.data?.logs.length).toBeLessThanOrEqual(2);
      expect(page2.data?.logs.length).toBeLessThanOrEqual(2);
    });

    it('should return error for non-existent policy', async () => {
      const response = await getAuditLogsForPolicy('invalid-policy-id');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('POLICY_NOT_FOUND');
    });
  });
});
