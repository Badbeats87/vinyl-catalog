import { prisma } from '../db/client';
import { validateReleaseTitle, validateArtistName, validateBarcode, validateReleaseYear, validateUrl, validateSearchQuery, validateLimit, } from '../validation/inputs';
/**
 * Create a new release with validation
 */
export async function createRelease(input) {
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
export async function getReleaseById(id) {
    return prisma.release.findUnique({
        where: { id },
    });
}
/**
 * Get a release by barcode
 */
export async function getReleaseByBarcode(barcode) {
    return prisma.release.findFirst({
        where: { barcode },
    });
}
/**
 * Search releases by artist/title with case-insensitive matching
 * Performs separate queries for each term and merges results
 * Note: For production, consider pg_trgm extension for fuzzy matching
 */
export async function searchReleases(query, limit = 20) {
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
                mode: 'insensitive',
            },
        },
        {
            title: {
                contains: term,
                mode: 'insensitive',
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
export async function getAllReleases(skip = 0, take = 50) {
    return prisma.release.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Get releases by genre
 */
export async function getReleasesByGenre(genre, limit = 50) {
    return prisma.release.findMany({
        where: { genre },
        take: limit,
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Update a release
 */
export async function updateRelease(id, input) {
    try {
        return await prisma.release.update({
            where: { id },
            data: input,
        });
    }
    catch (error) {
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
export async function deleteRelease(id) {
    try {
        await prisma.release.delete({
            where: { id },
        });
        return true;
    }
    catch (error) {
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
export async function getReleaseWithDetails(id) {
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
export async function countReleases() {
    return prisma.release.count();
}
/**
 * Get releases with no market snapshot (missing pricing data)
 */
export async function getReleasesWithoutPricing(limit = 50) {
    return prisma.release.findMany({
        where: {
            marketSnapshots: {
                none: {},
            },
        },
        take: limit,
    });
}
//# sourceMappingURL=releases.js.map