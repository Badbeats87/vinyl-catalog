/**
 * Tests for Seller Submission Service
 * Tests search, quote generation, and submission workflows
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../../db/client';
import {
  searchReleasesCatalog,
  formatSearchResults,
  generateQuotesForItems,
  createSellerSubmission,
  getSubmissionByNumber,
  getSubmissionsByEmail,
  getConditionTiers,
  QuoteItem,
} from '../seller-submissions';

// Mock email service to avoid sending actual emails during tests
vi.mock('../email', () => ({
  sendSubmissionConfirmation: vi.fn().mockResolvedValue(true),
  sendSubmissionStatusUpdate: vi.fn().mockResolvedValue(true),
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe('Seller Submission Service', () => {
  let releaseId: string;
  let policyId: string;

  beforeAll(async () => {
    // Get the first release and policy for testing
    const release = await prisma.release.findFirst();
    const policy = await prisma.pricingPolicy.findFirst({
      where: { isActive: true },
    });

    if (!release || !policy) {
      throw new Error('Test data not found. Please run seed.ts first.');
    }

    releaseId = release.id;
    policyId = policy.id;
  });

  describe('searchReleasesCatalog', () => {
    it('should find releases by artist name', async () => {
      const results = await searchReleasesCatalog('Pink', 10);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchScore).toBeGreaterThan(0);
    });

    it('should find releases by title', async () => {
      const results = await searchReleasesCatalog('Wall', 10);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-matching query', async () => {
      const results = await searchReleasesCatalog('XYZABC123XYZ', 10);
      expect(results.length).toBe(0);
    });

    it('should return results sorted by match score', async () => {
      const results = await searchReleasesCatalog('Beatles', 10);
      if (results.length > 1) {
        // Check that results are sorted by score (descending)
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].matchScore).toBeGreaterThanOrEqual(results[i + 1].matchScore);
        }
      }
      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit results to specified count', async () => {
      const results = await searchReleasesCatalog('the', 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('formatSearchResults', () => {
    it('should format search results correctly', async () => {
      const results = await searchReleasesCatalog('Pink', 5);
      const formatted = formatSearchResults(results);

      expect(formatted.length).toBe(results.length);
      formatted.forEach((item, i) => {
        expect(item).toHaveProperty('releaseId');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('artist');
        expect(item).toHaveProperty('matchScore');
        expect(item.releaseId).toBe(results[i].id);
        expect(item.title).toBe(results[i].title);
      });
    });
  });

  describe('generateQuotesForItems', () => {
    it('should generate quotes for valid items', async () => {
      const items: QuoteItem[] = [
        {
          releaseId,
          quantity: 1,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        },
      ];

      const quotes = await generateQuotesForItems(items);

      expect(quotes.length).toBe(1);
      expect(quotes[0].releaseId).toBe(releaseId);
      expect(quotes[0].quantity).toBe(1);
      expect(quotes[0].buyOffer).toBeGreaterThan(0);
      expect(quotes[0].totalOffer).toBe(quotes[0].buyOffer * 1);
    });

    it('should calculate total offer based on quantity', async () => {
      const items: QuoteItem[] = [
        {
          releaseId,
          quantity: 3,
          conditionMedia: 'VG',
          conditionSleeve: 'VG',
        },
      ];

      const quotes = await generateQuotesForItems(items);

      expect(quotes[0].totalOffer).toBe(quotes[0].buyOffer * 3);
    });

    it('should handle multiple items', async () => {
      const releases = await prisma.release.findMany({ take: 2 });
      if (releases.length < 2) {
        console.log('Skipping multiple items test - insufficient test data');
        return;
      }

      const items: QuoteItem[] = releases.map(r => ({
        releaseId: r.id,
        quantity: 1,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
      }));

      const quotes = await generateQuotesForItems(items);

      expect(quotes.length).toBe(items.length);
      quotes.forEach((quote, i) => {
        expect(quote.releaseId).toBe(items[i].releaseId);
        expect(quote.quantity).toBe(items[i].quantity);
        expect(quote.buyOffer).toBeGreaterThan(0);
      });
    });

    it('should throw error for non-existent release', async () => {
      const items: QuoteItem[] = [
        {
          releaseId: 'invalid-id-12345',
          quantity: 1,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        },
      ];

      await expect(generateQuotesForItems(items)).rejects.toThrow();
    });
  });

  describe('createSellerSubmission', () => {
    it('should create submission with valid data', async () => {
      const items: QuoteItem[] = [
        {
          releaseId,
          quantity: 1,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        },
      ];

      const submission = await createSellerSubmission({
        sellerEmail: 'test@example.com',
        sellerPhone: '+1-234-567-8900',
        items,
        sellerConsent: true,
        offerExpiryDays: 7,
      });

      expect(submission).toHaveProperty('submissionNumber');
      expect(submission).toHaveProperty('submissionId');
      expect(submission.sellerEmail).toBe('test@example.com');
      expect(submission.status).toBe('pending_review');
      expect(submission.expectedPayout).toBeGreaterThan(0);
      expect(submission.items.length).toBe(1);
      expect(submission.items[0].buyOffer).toBeGreaterThan(0);
    });

    it('should reject submission without consent', async () => {
      const items: QuoteItem[] = [
        {
          releaseId,
          quantity: 1,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        },
      ];

      await expect(
        createSellerSubmission({
          sellerEmail: 'test@example.com',
          items,
          sellerConsent: false,
        })
      ).rejects.toThrow('Seller must consent to notifications');
    });

    it('should reject submission with no items', async () => {
      await expect(
        createSellerSubmission({
          sellerEmail: 'test@example.com',
          items: [],
          sellerConsent: true,
        })
      ).rejects.toThrow('Submission must include at least one item');
    });

    it('should calculate correct total payout', async () => {
      const releases = await prisma.release.findMany({ take: 2 });
      if (releases.length < 2) {
        console.log('Skipping payout test - insufficient test data');
        return;
      }

      const items: QuoteItem[] = releases.map((r, i) => ({
        releaseId: r.id,
        quantity: i + 1,
        conditionMedia: 'NM',
        conditionSleeve: 'NM',
      }));

      const submission = await createSellerSubmission({
        sellerEmail: 'payout-test@example.com',
        items,
        sellerConsent: true,
      });

      // Calculate expected payout manually
      let expectedTotal = 0;
      submission.items.forEach(item => {
        expectedTotal += item.totalOffer;
      });

      expect(submission.expectedPayout).toBe(expectedTotal);
    });

    it('should set expiry date correctly', async () => {
      const items: QuoteItem[] = [
        {
          releaseId,
          quantity: 1,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        },
      ];

      const now = new Date();
      const submission = await createSellerSubmission({
        sellerEmail: 'expiry-test@example.com',
        items,
        sellerConsent: true,
        offerExpiryDays: 14,
      });

      const expiryDate = new Date(submission.expiresAt);
      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + 14);

      // Allow 1-minute tolerance for test execution time
      const timeDiff = Math.abs(expiryDate.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60000);
    });
  });

  describe('getSubmissionByNumber', () => {
    it('should retrieve submission by number', async () => {
      const items: QuoteItem[] = [
        {
          releaseId,
          quantity: 1,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        },
      ];

      const created = await createSellerSubmission({
        sellerEmail: 'retrieve-test@example.com',
        items,
        sellerConsent: true,
      });

      const retrieved = await getSubmissionByNumber(created.submissionNumber);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.submissionNumber).toBe(created.submissionNumber);
      expect(retrieved?.sellerEmail).toBe('retrieve-test@example.com');
      expect(retrieved?.items.length).toBe(1);
    });

    it('should return null for non-existent submission', async () => {
      const result = await getSubmissionByNumber('INVALID-12345-ABC');
      expect(result).toBeNull();
    });
  });

  describe('getSubmissionsByEmail', () => {
    it('should retrieve all submissions for email', async () => {
      const testEmail = 'email-query-test@example.com';
      const items: QuoteItem[] = [
        {
          releaseId,
          quantity: 1,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        },
      ];

      // Create multiple submissions
      await createSellerSubmission({
        sellerEmail: testEmail,
        items,
        sellerConsent: true,
      });

      await createSellerSubmission({
        sellerEmail: testEmail,
        items,
        sellerConsent: true,
      });

      const result = await getSubmissionsByEmail(testEmail);

      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.submissions.length).toBeGreaterThanOrEqual(2);
      result.submissions.forEach(sub => {
        expect(sub.sellerEmail).toBe(testEmail);
      });
    });

    it('should support pagination', async () => {
      const testEmail = 'pagination-test@example.com';
      const items: QuoteItem[] = [
        {
          releaseId,
          quantity: 1,
          conditionMedia: 'NM',
          conditionSleeve: 'NM',
        },
      ];

      // Create 3 submissions
      for (let i = 0; i < 3; i++) {
        await createSellerSubmission({
          sellerEmail: testEmail,
          items,
          sellerConsent: true,
        });
      }

      const page1 = await getSubmissionsByEmail(testEmail, 2, 0);
      const page2 = await getSubmissionsByEmail(testEmail, 2, 2);

      expect(page1.submissions.length).toBeLessThanOrEqual(2);
      expect(page1.total).toBeGreaterThanOrEqual(3);
      expect(page2.submissions.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for non-existent email', async () => {
      const result = await getSubmissionsByEmail('nonexistent@example.com');
      expect(result.total).toBe(0);
      expect(result.submissions.length).toBe(0);
    });
  });

  describe('getConditionTiers', () => {
    it('should retrieve all condition tiers', async () => {
      const tiers = await getConditionTiers();

      expect(tiers.length).toBeGreaterThan(0);
      expect(tiers[0]).toHaveProperty('id');
      expect(tiers[0]).toHaveProperty('name');
      expect(tiers[0]).toHaveProperty('order');
      expect(tiers[0]).toHaveProperty('mediaAdjustment');
      expect(tiers[0]).toHaveProperty('sleeveAdjustment');
    });

    it('should return tiers sorted by order', async () => {
      const tiers = await getConditionTiers();

      for (let i = 0; i < tiers.length - 1; i++) {
        expect(tiers[i].order).toBeLessThan(tiers[i + 1].order);
      }
    });
  });
});
