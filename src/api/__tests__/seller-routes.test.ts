/**
 * Tests for Seller API Routes
 * Tests search, quote, and submission endpoints
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '../../db/client';
import {
  searchCatalog,
  generateQuotes,
  submitSellerOffer,
  getSubmission,
  getSellerSubmissions,
  getConditionOptions,
} from '../seller-routes';

// Mock email service
vi.mock('../../services/email', () => ({
  sendSubmissionConfirmation: vi.fn().mockResolvedValue(true),
  sendSubmissionStatusUpdate: vi.fn().mockResolvedValue(true),
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe('Seller API Routes', () => {
  let releaseId: string;

  beforeAll(async () => {
    const release = await prisma.release.findFirst();
    if (!release) {
      throw new Error('Test data not found. Please run seed.ts first.');
    }
    releaseId = release.id;
  });

  describe('searchCatalog', () => {
    it('should return search results with success', async () => {
      const response = await searchCatalog({
        query: 'Pink',
        limit: 10,
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data!.length).toBeGreaterThan(0);
      expect(response.data![0]).toHaveProperty('releaseId');
      expect(response.data![0]).toHaveProperty('matchScore');
    });

    it('should return error for empty query', async () => {
      const response = await searchCatalog({
        query: '',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('INVALID_INPUT');
    });

    it('should return empty data for non-matching query', async () => {
      const response = await searchCatalog({
        query: 'XYZABC123NONEXISTENT',
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data!.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const response = await searchCatalog({
        query: 'the',
        limit: 3,
      });

      expect(response.success).toBe(true);
      expect(response.data!.length).toBeLessThanOrEqual(3);
    });
  });

  describe('generateQuotes', () => {
    it('should generate quotes for valid items', async () => {
      const response = await generateQuotes({
        items: [
          {
            releaseId,
            quantity: 1,
            conditionMedia: 'NM',
            conditionSleeve: 'NM',
          },
        ],
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.quotes.length).toBe(1);
      expect(response.data?.totalPayout).toBeGreaterThan(0);
      expect(response.data?.quotes[0].buyOffer).toBeGreaterThan(0);
    });

    it('should return error for empty items', async () => {
      const response = await generateQuotes({
        items: [],
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_INPUT');
    });

    it('should return error for missing releaseId', async () => {
      const response = await generateQuotes({
        items: [
          {
            releaseId: '',
            quantity: 1,
            conditionMedia: 'NM',
            conditionSleeve: 'NM',
          },
        ],
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_INPUT');
    });

    it('should return error for invalid quantity', async () => {
      const response = await generateQuotes({
        items: [
          {
            releaseId,
            quantity: 0,
            conditionMedia: 'NM',
            conditionSleeve: 'NM',
          },
        ],
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_INPUT');
    });

    it('should calculate correct total payout', async () => {
      const response = await generateQuotes({
        items: [
          {
            releaseId,
            quantity: 2,
            conditionMedia: 'VG',
            conditionSleeve: 'VG',
          },
        ],
      });

      expect(response.success).toBe(true);
      const quote = response.data?.quotes[0]!;
      expect(response.data?.totalPayout).toBe(quote.totalOffer);
      expect(quote.totalOffer).toBe(quote.buyOffer * 2);
    });
  });

  describe('submitSellerOffer', () => {
    it('should create submission with valid data', async () => {
      const response = await submitSellerOffer({
        sellerEmail: 'submit-test@example.com',
        sellerPhone: '+1-234-567-8900',
        items: [
          {
            releaseId,
            quantity: 1,
            conditionMedia: 'NM',
            conditionSleeve: 'NM',
          },
        ],
        sellerConsent: true,
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.submissionNumber).toBeTruthy();
      expect(response.data?.submissionId).toBeTruthy();
      expect(response.data?.status).toBe('pending_review');
      expect(response.data?.expectedPayout).toBeGreaterThan(0);
    });

    it('should reject submission without consent', async () => {
      const response = await submitSellerOffer({
        sellerEmail: 'no-consent@example.com',
        items: [
          {
            releaseId,
            quantity: 1,
            conditionMedia: 'NM',
            conditionSleeve: 'NM',
          },
        ],
        sellerConsent: false,
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_INPUT');
      expect(response.error?.message).toContain('consent');
    });

    it('should reject submission with invalid email', async () => {
      const response = await submitSellerOffer({
        sellerEmail: 'not-an-email',
        items: [
          {
            releaseId,
            quantity: 1,
            conditionMedia: 'NM',
            conditionSleeve: 'NM',
          },
        ],
        sellerConsent: true,
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_INPUT');
      expect(response.error?.message).toContain('email');
    });

    it('should reject submission with no items', async () => {
      const response = await submitSellerOffer({
        sellerEmail: 'no-items@example.com',
        items: [],
        sellerConsent: true,
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_INPUT');
      expect(response.error?.message).toContain('At least one item');
    });

    it('should store submission with correct status', async () => {
      const response = await submitSellerOffer({
        sellerEmail: 'status-check@example.com',
        items: [
          {
            releaseId,
            quantity: 1,
            conditionMedia: 'NM',
            conditionSleeve: 'NM',
          },
        ],
        sellerConsent: true,
      });

      expect(response.success).toBe(true);
      expect(response.data?.status).toBe('pending_review');
    });
  });

  describe('getSubmission', () => {
    it('should retrieve submission by number', async () => {
      // First create a submission
      const createResponse = await submitSellerOffer({
        sellerEmail: 'get-test@example.com',
        items: [
          {
            releaseId,
            quantity: 1,
            conditionMedia: 'NM',
            conditionSleeve: 'NM',
          },
        ],
        sellerConsent: true,
      });

      expect(createResponse.success).toBe(true);

      // Then retrieve it
      const getResponse = await getSubmission({
        submissionNumber: createResponse.data!.submissionNumber,
      });

      expect(getResponse.success).toBe(true);
      expect(getResponse.data?.submissionNumber).toBe(createResponse.data!.submissionNumber);
      expect(getResponse.data?.sellerEmail).toBe('get-test@example.com');
    });

    it('should return error for invalid submission number', async () => {
      const response = await getSubmission({
        submissionNumber: 'INVALID-12345-XYZ',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('NOT_FOUND');
    });

    it('should return error for empty submission number', async () => {
      const response = await getSubmission({
        submissionNumber: '',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_INPUT');
    });
  });

  describe('getSellerSubmissions', () => {
    it('should retrieve submissions for email', async () => {
      const testEmail = 'list-test@example.com';

      // Create a submission
      await submitSellerOffer({
        sellerEmail: testEmail,
        items: [
          {
            releaseId,
            quantity: 1,
            conditionMedia: 'NM',
            conditionSleeve: 'NM',
          },
        ],
        sellerConsent: true,
      });

      // Retrieve submissions
      const response = await getSellerSubmissions({
        email: testEmail,
      });

      expect(response.success).toBe(true);
      expect(response.data?.submissions).toBeDefined();
      expect(response.data?.total).toBeGreaterThanOrEqual(1);
      expect(response.data?.submissions.some(s => s.sellerEmail === testEmail)).toBe(true);
    });

    it('should return empty list for non-existent email', async () => {
      const response = await getSellerSubmissions({
        email: 'nonexistent-list@example.com',
      });

      expect(response.success).toBe(true);
      expect(response.data?.submissions.length).toBe(0);
      expect(response.data?.total).toBe(0);
    });

    it('should return error for missing email', async () => {
      const response = await getSellerSubmissions({
        email: '',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_INPUT');
    });

    it('should support pagination', async () => {
      const testEmail = 'pagination-list@example.com';

      // Create multiple submissions
      for (let i = 0; i < 3; i++) {
        await submitSellerOffer({
          sellerEmail: testEmail,
          items: [
            {
              releaseId,
              quantity: 1,
              conditionMedia: 'NM',
              conditionSleeve: 'NM',
            },
          ],
          sellerConsent: true,
        });
      }

      const page1 = await getSellerSubmissions({
        email: testEmail,
        limit: 2,
        offset: 0,
      });

      expect(page1.data?.submissions.length).toBeLessThanOrEqual(2);
      expect(page1.data?.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getConditionOptions', () => {
    it('should retrieve condition tiers', async () => {
      const response = await getConditionOptions();

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data!.length).toBeGreaterThan(0);
    });

    it('should return proper condition tier structure', async () => {
      const response = await getConditionOptions();

      expect(response.success).toBe(true);
      const tier = response.data![0];
      expect(tier).toHaveProperty('id');
      expect(tier).toHaveProperty('name');
      expect(tier).toHaveProperty('order');
      expect(tier).toHaveProperty('mediaAdjustment');
      expect(tier).toHaveProperty('sleeveAdjustment');
    });
  });
});
