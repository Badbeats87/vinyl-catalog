import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as releaseService from '../releases';

const prisma = new PrismaClient();

describe('Release Service', () => {
  let createdReleaseIds: string[] = [];

  beforeAll(async () => {
    // Tests will create their own releases
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createRelease', () => {
    it('should create a release with required fields', async () => {
      const release = await releaseService.createRelease({
        title: 'Test Album',
        artist: 'Test Artist',
      });

      expect(release.id).toBeDefined();
      expect(release.title).toBe('Test Album');
      expect(release.artist).toBe('Test Artist');
      expect(release.createdAt).toBeDefined();
    });

    it('should create a release with all optional fields', async () => {
      const release = await releaseService.createRelease({
        title: 'Complete Album',
        artist: 'Complete Artist',
        label: 'Test Label',
        catalogNumber: 'CAT-001',
        barcode: '1234567890',
        releaseYear: 1999,
        genre: 'Rock',
        coverArtUrl: 'https://example.com/cover.jpg',
      });

      expect(release.label).toBe('Test Label');
      expect(release.catalogNumber).toBe('CAT-001');
      expect(release.barcode).toBe('1234567890');
      expect(release.releaseYear).toBe(1999);
      expect(release.genre).toBe('Rock');
      expect(release.coverArtUrl).toBe('https://example.com/cover.jpg');
    });
  });

  describe('getReleaseById', () => {
    it('should retrieve a release by ID', async () => {
      const created = await releaseService.createRelease({
        title: 'Retrievable Album',
        artist: 'Retrievable Artist',
      });

      const retrieved = await releaseService.getReleaseById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Retrievable Album');
    });

    it('should return null for non-existent ID', async () => {
      const result = await releaseService.getReleaseById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getReleaseByBarcode', () => {
    it('should retrieve a release by barcode', async () => {
      const barcode = 'BARCODE-12345';
      const created = await releaseService.createRelease({
        title: 'Barcode Album',
        artist: 'Barcode Artist',
        barcode,
      });

      const retrieved = await releaseService.getReleaseByBarcode(barcode);

      expect(retrieved?.barcode).toBe(barcode);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent barcode', async () => {
      const result = await releaseService.getReleaseByBarcode('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateRelease', () => {
    it('should update release fields', async () => {
      const created = await releaseService.createRelease({
        title: 'Original Title',
        artist: 'Original Artist',
        genre: 'Jazz',
      });

      const updated = await releaseService.updateRelease(created.id, {
        title: 'Updated Title',
        genre: 'Blues',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.artist).toBe('Original Artist'); // Unchanged
      expect(updated?.genre).toBe('Blues');
    });

    it('should return null for non-existent release', async () => {
      const result = await releaseService.updateRelease('non-existent', {
        title: 'New Title',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteRelease', () => {
    it('should delete a release', async () => {
      const created = await releaseService.createRelease({
        title: 'To Delete',
        artist: 'To Delete Artist',
      });

      const deleted = await releaseService.deleteRelease(created.id);
      expect(deleted).toBe(true);

      const retrieved = await releaseService.getReleaseById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent release', async () => {
      const result = await releaseService.deleteRelease('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('searchReleases', () => {
    it('should search releases by artist', async () => {
      await releaseService.createRelease({
        title: 'Album 1',
        artist: 'Search Test Artist',
      });

      await releaseService.createRelease({
        title: 'Album 2',
        artist: 'Search Test Artist',
      });

      const results = await releaseService.searchReleases('Search Test');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for no matches', async () => {
      const results = await releaseService.searchReleases('ZZZZZZZ Nonexistent ZZZZZZZ');
      expect(results).toEqual([]);
    });
  });

  describe('getReleasesByGenre', () => {
    it('should retrieve releases by genre', async () => {
      await releaseService.createRelease({
        title: 'Jazz Album 1',
        artist: 'Jazz Artist 1',
        genre: 'Jazz',
      });

      await releaseService.createRelease({
        title: 'Jazz Album 2',
        artist: 'Jazz Artist 2',
        genre: 'Jazz',
      });

      const results = await releaseService.getReleasesByGenre('Jazz');
      expect(results.every((r) => r.genre === 'Jazz')).toBe(true);
    });
  });

  describe('countReleases', () => {
    it('should count all releases', async () => {
      const initialCount = await releaseService.countReleases();
      expect(initialCount).toBeGreaterThanOrEqual(0);

      const release = await releaseService.createRelease({
        title: 'Count Test ' + Date.now(),
        artist: 'Count Test Artist',
      });

      const newCount = await releaseService.countReleases();
      expect(newCount).toBeGreaterThanOrEqual(initialCount + 1);

      // Clean up
      await prisma.release.delete({ where: { id: release.id } });
    });
  });

  describe('getReleasesWithoutPricing', () => {
    it('should find releases without market snapshots', async () => {
      const release = await releaseService.createRelease({
        title: 'No Pricing',
        artist: 'No Pricing Artist',
      });

      const results = await releaseService.getReleasesWithoutPricing(50);
      expect(results.some((r) => r.id === release.id)).toBe(true);
    });
  });
});
