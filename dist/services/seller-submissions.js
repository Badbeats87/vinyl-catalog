/**
 * Seller Submission Service
 * Handles seller workflows: search, quote generation, and submission management
 */
import { prisma } from '../db/client';
import { getFullPricingQuote } from './pricing';
import { getPolicyForRelease } from './pricing-policies';
import { validateSearchQuery, validateLimit, ValidationError } from '../validation/inputs';
import { sendSubmissionConfirmation } from './email';
/**
 * Levenshtein distance algorithm for fuzzy matching
 * Returns similarity score between 0 and 1 (1 = exact match)
 */
function levenshteinDistance(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2)
        return 1;
    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0)
        return 1;
    const d = [];
    for (let i = 0; i <= len1; i++) {
        d[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        d[0][j] = j;
    }
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, // deletion
            d[i][j - 1] + 1, // insertion
            d[i - 1][j - 1] + cost // substitution
            );
        }
    }
    const distance = d[len1][len2];
    const similarity = 1 - (distance / maxLen);
    return Math.max(0, similarity);
}
/**
 * Search releases by artist, title, or barcode with fuzzy matching
 * Returns results sorted by relevance
 */
export async function searchReleasesCatalog(query, limit = 20) {
    const validatedQuery = validateSearchQuery(query);
    const validatedLimit = validateLimit(limit, 100);
    // First, try exact barcode match
    if (/^\d+$/.test(validatedQuery)) {
        const barcodeMatch = await prisma.release.findFirst({
            where: { barcode: validatedQuery },
        });
        if (barcodeMatch) {
            return [{ ...barcodeMatch, matchScore: 1 }];
        }
    }
    // Search by artist and title using case-insensitive contains
    const searchTerms = validatedQuery.split(/\s+/).filter(t => t.length > 0);
    const releases = await prisma.release.findMany({
        where: {
            OR: searchTerms.flatMap(term => [
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
                {
                    barcode: {
                        contains: term,
                        mode: 'insensitive',
                    },
                },
            ]),
        },
        take: validatedLimit * 2, // Get extra to score and re-rank
    });
    // Score each result for relevance
    const scoredResults = releases.map(release => {
        let score = 0;
        // Artist match scoring
        const artistScore = levenshteinDistance(release.artist, validatedQuery);
        score += artistScore * 0.5; // 50% weight to artist
        // Title match scoring
        const titleScore = levenshteinDistance(release.title, validatedQuery);
        score += titleScore * 0.5; // 50% weight to title
        // Boost exact artist match
        if (release.artist.toLowerCase() === validatedQuery.toLowerCase()) {
            score = Math.min(1, score + 0.3);
        }
        // Boost exact title match
        if (release.title.toLowerCase() === validatedQuery.toLowerCase()) {
            score = Math.min(1, score + 0.3);
        }
        // Boost barcode match
        if (release.barcode === validatedQuery) {
            score = 1;
        }
        return { ...release, matchScore: score };
    });
    // Sort by relevance and return top results
    return scoredResults
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, validatedLimit);
}
/**
 * Format search results for API response
 */
export function formatSearchResults(results) {
    return results.map(r => ({
        releaseId: r.id,
        title: r.title,
        artist: r.artist,
        barcode: r.barcode || undefined,
        genre: r.genre || undefined,
        coverArtUrl: r.coverArtUrl || undefined,
        releaseYear: r.releaseYear || undefined,
        matchScore: r.matchScore,
    }));
}
/**
 * Generate quote for selected items with conditions
 */
export async function generateQuotesForItems(items) {
    const quotes = [];
    for (const item of items) {
        try {
            // Validate release exists
            const release = await prisma.release.findUnique({
                where: { id: item.releaseId },
            });
            if (!release) {
                throw new Error(`Release not found: ${item.releaseId}`);
            }
            // Get applicable policy
            const policy = await getPolicyForRelease(item.releaseId);
            if (!policy) {
                throw new Error(`No pricing policy found for release ${item.releaseId}`);
            }
            // Calculate pricing
            const quote = await getFullPricingQuote(item.releaseId, policy, item.conditionMedia, item.conditionSleeve);
            quotes.push({
                releaseId: item.releaseId,
                title: release.title,
                artist: release.artist,
                quantity: item.quantity,
                conditionMedia: item.conditionMedia,
                conditionSleeve: item.conditionSleeve,
                buyOffer: quote.buyOffer,
                totalOffer: quote.buyOffer * item.quantity,
            });
        }
        catch (error) {
            throw new Error(`Failed to generate quote for ${item.releaseId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    return quotes;
}
/**
 * Create a new seller submission with multiple items
 */
export async function createSellerSubmission(input) {
    if (!input.sellerConsent) {
        throw new ValidationError('Seller must consent to notifications');
    }
    if (!input.items || input.items.length === 0) {
        throw new ValidationError('Submission must include at least one item');
    }
    // Generate quotes for all items
    const quotes = await generateQuotesForItems(input.items);
    const totalPayout = quotes.reduce((sum, q) => sum + q.totalOffer, 0);
    // Generate unique submission number
    const submissionNumber = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    // Calculate expiry date
    const expiryDays = input.offerExpiryDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    // Create submission in database
    const submission = await prisma.sellerSubmission.create({
        data: {
            submissionNumber,
            sellerEmail: input.sellerEmail,
            sellerPhone: input.sellerPhone,
            status: 'pending_review',
            expectedPayout: totalPayout,
            expiresAt,
            items: {
                create: quotes.map(quote => ({
                    releaseId: quote.releaseId,
                    quantity: quote.quantity,
                    sellerConditionMedia: quote.conditionMedia,
                    sellerConditionSleeve: quote.conditionSleeve,
                    autoOfferPrice: quote.buyOffer,
                    status: 'pending',
                })),
            },
        },
        include: {
            items: {
                include: {
                    release: true,
                },
            },
        },
    });
    // Format submission detail for email
    const submissionDetail = {
        submissionNumber: submission.submissionNumber,
        submissionId: submission.id,
        sellerEmail: submission.sellerEmail,
        sellerPhone: submission.sellerPhone || undefined,
        status: submission.status,
        expectedPayout: submission.expectedPayout || 0,
        actualPayout: submission.actualPayout || undefined,
        items: submission.items.map(item => ({
            itemId: item.id,
            releaseId: item.releaseId,
            title: item.release.title,
            artist: item.release.artist,
            quantity: item.quantity,
            conditionMedia: item.sellerConditionMedia,
            conditionSleeve: item.sellerConditionSleeve,
            autoOfferPrice: item.autoOfferPrice,
            totalOffer: item.autoOfferPrice * item.quantity,
            itemStatus: item.status,
        })),
        expiresAt: submission.expiresAt,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
    };
    // Send confirmation email (don't wait for result - fire and forget)
    sendSubmissionConfirmation(submissionDetail).catch(error => {
        console.error(`Failed to send confirmation email for ${submissionNumber}:`, error);
    });
    return {
        submissionNumber: submission.submissionNumber,
        submissionId: submission.id,
        sellerEmail: submission.sellerEmail,
        expectedPayout: submission.expectedPayout || 0,
        items: quotes,
        expiresAt: submission.expiresAt,
        status: submission.status,
    };
}
/**
 * Get submission details by submission number
 */
export async function getSubmissionByNumber(submissionNumber) {
    const submission = await prisma.sellerSubmission.findUnique({
        where: { submissionNumber },
        include: {
            items: {
                include: {
                    release: true,
                },
            },
        },
    });
    if (!submission) {
        return null;
    }
    return {
        submissionNumber: submission.submissionNumber,
        submissionId: submission.id,
        sellerEmail: submission.sellerEmail,
        sellerPhone: submission.sellerPhone || undefined,
        status: submission.status,
        expectedPayout: submission.expectedPayout || 0,
        actualPayout: submission.actualPayout || undefined,
        items: submission.items.map(item => ({
            itemId: item.id,
            releaseId: item.releaseId,
            title: item.release.title,
            artist: item.release.artist,
            quantity: item.quantity,
            conditionMedia: item.sellerConditionMedia,
            conditionSleeve: item.sellerConditionSleeve,
            autoOfferPrice: item.autoOfferPrice,
            totalOffer: item.autoOfferPrice * item.quantity,
            itemStatus: item.status,
        })),
        expiresAt: submission.expiresAt,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
    };
}
/**
 * Get all submissions for a seller email (paginated)
 */
export async function getSubmissionsByEmail(email, limit = 20, offset = 0) {
    const submissions = await prisma.sellerSubmission.findMany({
        where: { sellerEmail: email },
        include: {
            items: {
                include: {
                    release: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });
    const total = await prisma.sellerSubmission.count({
        where: { sellerEmail: email },
    });
    return {
        submissions: submissions.map(submission => ({
            submissionNumber: submission.submissionNumber,
            submissionId: submission.id,
            sellerEmail: submission.sellerEmail,
            sellerPhone: submission.sellerPhone || undefined,
            status: submission.status,
            expectedPayout: submission.expectedPayout || 0,
            actualPayout: submission.actualPayout || undefined,
            items: submission.items.map(item => ({
                itemId: item.id,
                releaseId: item.releaseId,
                title: item.release.title,
                artist: item.release.artist,
                quantity: item.quantity,
                conditionMedia: item.sellerConditionMedia,
                conditionSleeve: item.sellerConditionSleeve,
                autoOfferPrice: item.autoOfferPrice,
                totalOffer: item.autoOfferPrice * item.quantity,
                itemStatus: item.status,
            })),
            expiresAt: submission.expiresAt,
            createdAt: submission.createdAt,
            updatedAt: submission.updatedAt,
        })),
        total,
    };
}
/**
 * Update submission status
 */
export async function updateSubmissionStatus(submissionId, status, actualPayout) {
    try {
        return await prisma.sellerSubmission.update({
            where: { id: submissionId },
            data: {
                status,
                actualPayout,
                updatedAt: new Date(),
            },
        });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return null;
        }
        throw error;
    }
}
/**
 * Get all condition tiers for frontend
 */
export async function getConditionTiers() {
    return prisma.conditionTier.findMany({
        orderBy: { order: 'asc' },
    });
}
//# sourceMappingURL=seller-submissions.js.map