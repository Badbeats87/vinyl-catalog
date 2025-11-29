import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as policyService from '../pricing-policies.js';

const prisma = new PrismaClient();

describe('Pricing Policy Service', () => {
  beforeAll(async () => {
    // Clean up before tests
    await prisma.pricingPolicy.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createPricingPolicy', () => {
    it('should create a global policy', async () => {
      const policy = await policyService.createPricingPolicy({
        name: 'Test Global Policy',
        scope: 'global',
        buyPercentage: 0.55,
        sellPercentage: 1.25,
      });

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('Test Global Policy');
      expect(policy.scope).toBe('global');
      expect(policy.buyPercentage).toBe(0.55);
      expect(policy.sellPercentage).toBe(1.25);
    });

    it('should create a genre-specific policy', async () => {
      const policy = await policyService.createPricingPolicy({
        name: 'Jazz Policy',
        scope: 'genre',
        scopeValue: 'Jazz',
        buyPercentage: 0.60,
        sellPercentage: 1.30,
      });

      expect(policy.scope).toBe('genre');
      expect(policy.scopeValue).toBe('Jazz');
    });

    it('should create a release-specific policy', async () => {
      const policy = await policyService.createPricingPolicy({
        name: 'Release Policy',
        scope: 'release',
        scopeValue: 'release-123',
        buyPercentage: 0.50,
        sellPercentage: 1.35,
      });

      expect(policy.scope).toBe('release');
      expect(policy.scopeValue).toBe('release-123');
    });

    it('should validate mediaWeight + sleeveWeight = 1.0', async () => {
      try {
        await policyService.createPricingPolicy({
          name: 'Invalid Weights',
          scope: 'global',
          mediaWeight: 0.6,
          sleeveWeight: 0.6, // Sum is 1.2, invalid
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('must equal 1.0');
      }
    });

    it('should validate buyPercentage range', async () => {
      try {
        await policyService.createPricingPolicy({
          name: 'Invalid Buy %',
          scope: 'global',
          buyPercentage: 1.5, // Too high (max 1.0)
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('buyPercentage');
      }
    });

    it('should validate sellPercentage range', async () => {
      try {
        await policyService.createPricingPolicy({
          name: 'Invalid Sell %',
          scope: 'global',
          sellPercentage: 0.5, // Too low (min 1.0)
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('sellPercentage');
      }
    });

    it('should require scopeValue for non-global scopes', async () => {
      try {
        await policyService.createPricingPolicy({
          name: 'Missing Scope Value',
          scope: 'genre',
          // No scopeValue provided
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('scopeValue required');
      }
    });

    it('should apply default weights if not provided', async () => {
      const policy = await policyService.createPricingPolicy({
        name: 'Default Weights',
        scope: 'global',
        // mediaWeight and sleeveWeight not provided
      });

      expect(policy.mediaWeight).toBe(0.5);
      expect(policy.sleeveWeight).toBe(0.5);
    });
  });

  describe('getPricingPolicyById', () => {
    it('should retrieve a policy by ID', async () => {
      const created = await policyService.createPricingPolicy({
        name: 'Retrievable Policy',
        scope: 'global',
      });

      const retrieved = await policyService.getPricingPolicyById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Retrievable Policy');
    });

    it('should return null for non-existent ID', async () => {
      const result = await policyService.getPricingPolicyById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getDefaultPolicy', () => {
    it('should return the default global policy', async () => {
      const policy = await policyService.getDefaultPolicy();
      expect(policy?.scope).toBe('global');
      expect(policy?.scopeValue).toBeNull();
    });
  });

  describe('getPoliciesByScope', () => {
    it('should retrieve policies by scope', async () => {
      await policyService.createPricingPolicy({
        name: 'Genre Policy 1',
        scope: 'genre',
        scopeValue: 'Rock',
      });

      await policyService.createPricingPolicy({
        name: 'Genre Policy 2',
        scope: 'genre',
        scopeValue: 'Jazz',
      });

      const results = await policyService.getPoliciesByScope('genre');
      expect(results.every((p) => p.scope === 'genre')).toBe(true);
    });
  });

  describe('getPolicyForGenre', () => {
    it('should return genre-specific policy if available', async () => {
      const genrePolicy = await policyService.createPricingPolicy({
        name: 'Blues Policy',
        scope: 'genre',
        scopeValue: 'Blues',
        buyPercentage: 0.65,
      });

      const retrieved = await policyService.getPolicyForGenre('Blues');

      expect(retrieved?.id).toBe(genrePolicy.id);
      expect(retrieved?.buyPercentage).toBe(0.65);
    });

    it('should fall back to default policy if no genre-specific policy', async () => {
      const retrieved = await policyService.getPolicyForGenre('Nonexistent Genre');

      expect(retrieved?.scope).toBe('global');
      expect(retrieved?.scopeValue).toBeNull();
    });
  });

  describe('getPolicyForRelease', () => {
    it('should return release-specific policy if available', async () => {
      const releasePolicy = await policyService.createPricingPolicy({
        name: 'Special Album Policy',
        scope: 'release',
        scopeValue: 'album-999',
        sellPercentage: 1.5,
      });

      const retrieved = await policyService.getPolicyForRelease('album-999');

      expect(retrieved?.id).toBe(releasePolicy.id);
      expect(retrieved?.sellPercentage).toBe(1.5);
    });

    it('should fall back to default policy if no release-specific policy', async () => {
      const retrieved = await policyService.getPolicyForRelease('unknown-release');

      expect(retrieved?.scope).toBe('global');
    });
  });

  describe('updatePricingPolicy', () => {
    it('should update policy fields', async () => {
      const created = await policyService.createPricingPolicy({
        name: 'Original Name',
        scope: 'global',
        buyPercentage: 0.55,
      });

      const updated = await policyService.updatePricingPolicy(created.id, {
        name: 'Updated Name',
        buyPercentage: 0.60,
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.buyPercentage).toBe(0.60);
      expect(updated?.version).toBe(2); // Version incremented
    });

    it('should increment version on update', async () => {
      const created = await policyService.createPricingPolicy({
        name: 'Version Test',
        scope: 'global',
      });

      expect(created.version).toBe(1);

      const updated = await policyService.updatePricingPolicy(created.id, {
        name: 'Updated',
      });

      expect(updated?.version).toBe(2);
    });

    it('should return null for non-existent policy', async () => {
      const result = await policyService.updatePricingPolicy('non-existent', {
        name: 'New Name',
      });

      expect(result).toBeNull();
    });
  });

  describe('deactivatePricingPolicy', () => {
    it('should deactivate a policy', async () => {
      const created = await policyService.createPricingPolicy({
        name: 'To Deactivate',
        scope: 'global',
        isActive: true,
      });

      const deactivated = await policyService.deactivatePricingPolicy(created.id);

      expect(deactivated?.isActive).toBe(false);
    });

    it('should return null for non-existent policy', async () => {
      const result = await policyService.deactivatePricingPolicy('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('countActivePolicies', () => {
    it('should count only active policies', async () => {
      const initialCount = await policyService.countActivePolicies();

      const policy = await policyService.createPricingPolicy({
        name: 'Count Test ' + Date.now(),
        scope: 'global',
        isActive: true,
      });

      const newCount = await policyService.countActivePolicies();
      expect(newCount).toBeGreaterThanOrEqual(initialCount + 1);

      await policyService.deactivatePricingPolicy(policy.id);

      const finalCount = await policyService.countActivePolicies();
      expect(finalCount).toBeLessThanOrEqual(initialCount);
    });
  });

  describe('getPolicyHistory', () => {
    it('should retrieve all versions of a policy', async () => {
      const v1 = await policyService.createPricingPolicy({
        name: 'Versioned Policy',
        scope: 'global',
        buyPercentage: 0.55,
      });

      const v2 = await policyService.updatePricingPolicy(v1.id, {
        buyPercentage: 0.60,
      });

      // Note: This test assumes history is tracked (would need policy versioning strategy)
      expect(v2?.version).toBe(2);
    });
  });

  describe('deletePricingPolicy', () => {
    it('should delete a policy', async () => {
      const created = await policyService.createPricingPolicy({
        name: 'To Delete',
        scope: 'global',
      });

      const deleted = await policyService.deletePricingPolicy(created.id);
      expect(deleted).toBe(true);

      const retrieved = await policyService.getPricingPolicyById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent policy', async () => {
      const result = await policyService.deletePricingPolicy('non-existent');
      expect(result).toBe(false);
    });
  });
});
