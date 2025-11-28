import { Release } from '@prisma/client';
import { prisma } from '../db/client';
import {
  validateReleaseTitle,
  validateArtistName,
  validateBarcode,
  validateReleaseYear,
  validateUrl,
  validateSearchQuery,
  validateId,
  validateLimit,
  validateOffset,
} from '../validation/inputs';

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
export async function createRelease(input: CreateReleaseInput): Promise<Release> {
  const title = validateReleaseTitle(input.title);
  const artist = validateArtistName(input.artist);
  const barcode = validateBarcode(input.barcode);
  const releaseYear = validateReleaseYear(input.releaseYear);
  const coverArtUrl = validateUrl(input.coverArtUrl, 'Cover art URL');

  return prisma.release.create({
    data: {
      title,
      artist,
      barcode,
      releaseYear,
      coverArtUrl,
      label: input.label,
      catalogNumber: input.catalogNumber,
      genre: input.genre,
    },
  });
}

/**
 * Get a release by ID
 */
export async function getReleaseById(id: string): Promise<Release | null> {
  return prisma.release.findUnique({
    where: { id },
  });
}

/**
 * Get a release by barcode
 */
export async function getReleaseByBarcode(barcode: string): Promise<Release | null> {
  return prisma.release.findFirst({
    where: { barcode },
  });
}

/**
 * Search releases by artist/title with case-insensitive matching
 * Performs separate queries for each term and merges results
 * Note: For production, consider pg_trgm extension for fuzzy matching
 */
export async function searchReleases(query: string, limit = 20): Promise<Release[]> {
  const validatedQuery = validateSearchQuery(query);
  const validatedLimit = validateLimit(limit);
  const searchTerms = validatedQuery.split(/\s+/).filter(t => t.length > 0);

  if (searchTerms.length === 0) {
    return [];
  }

  // Build OR conditions for matching any term in artist or title
  const orConditions = searchTerms.flatMap(term => [
    {
      artist: {
        contains: term,
        mode: 'insensitive' as const,
      },
    },
    {
      title: {
        contains: term,
        mode: 'insensitive' as const,
      },
    },
  ]);

  return prisma.release.findMany({
    where: {
      OR: orConditions,
    },
    take: validatedLimit,
    orderBy: [
      { artist: 'asc' },
      { title: 'asc' },
    ],
  });
}

/**
 * Get all releases with pagination
 */
export async function getAllReleases(skip = 0, take = 50): Promise<Release[]> {
  return prisma.release.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get releases by genre
 */
export async function getReleasesByGenre(genre: string, limit = 50): Promise<Release[]> {
  return prisma.release.findMany({
    where: { genre },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a release
 */
export async function updateRelease(id: string, input: UpdateReleaseInput): Promise<Release | null> {
  try {
    return await prisma.release.update({
      where: { id },
      data: input,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Record not found
      return null;
    }
    throw error;
  }
}

/**
 * Delete a release
 */
export async function deleteRelease(id: string): Promise<boolean> {
  try {
    await prisma.release.delete({
      where: { id },
    });
    return true;
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Record not found
      return false;
    }
    throw error;
  }
}

/**
 * Get release with related market snapshots and inventory
 */
export async function getReleaseWithDetails(id: string) {
  return prisma.release.findUnique({
    where: { id },
    include: {
      marketSnapshots: {
        orderBy: { fetchedAt: 'desc' },
        take: 2, // Latest Discogs and eBay
      },
      inventoryLots: {
        where: { status: 'live' },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

/**
 * Count total releases
 */
export async function countReleases(): Promise<number> {
  return prisma.release.count();
}

/**
 * Get releases with no market snapshot (missing pricing data)
 */
export async function getReleasesWithoutPricing(limit = 50): Promise<Release[]> {
  return prisma.release.findMany({
    where: {
      marketSnapshots: {
        none: {},
      },
    },
    take: limit,
  });
}
