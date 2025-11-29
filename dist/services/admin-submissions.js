/**
 * Admin Submission Management Service
 * Handles admin operations: viewing submissions, filtering, accepting/rejecting, inspection, etc.
 */
import { prisma } from '../db/client.js';
import { ValidationError } from '../validation/inputs.js';
import { sendCounterOfferNotification } from './email.js';
import { createInventoryLotFromSubmissionItem } from './inventory-management.js';
/**
 * List submissions with filtering for admin dashboard
 */
export async function listAdminSubmissions(filters = {}) {
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;
    const where = {};
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.sellerEmail) {
        where.sellerEmail = {
            contains: filters.sellerEmail,
            mode: 'insensitive',
        };
    }
    if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
            where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
            where.createdAt.lte = filters.endDate;
        }
    }
    if (filters.minValue !== undefined || filters.maxValue !== undefined) {
        where.expectedPayout = {};
        if (filters.minValue !== undefined) {
            where.expectedPayout.gte = filters.minValue;
        }
        if (filters.maxValue !== undefined) {
            where.expectedPayout.lte = filters.maxValue;
        }
    }
    const submissions = await prisma.sellerSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
            items: {
                include: {
                    release: {
                        select: {
                            title: true,
                            artist: true,
                        },
                    },
                },
            },
        },
    });
    const total = await prisma.sellerSubmission.count({ where });
    return {
        submissions: submissions.map(sub => ({
            id: sub.id,
            submissionNumber: sub.submissionNumber,
            sellerEmail: sub.sellerEmail,
            sellerPhone: sub.sellerPhone || undefined,
            status: sub.status,
            expectedPayout: sub.expectedPayout || 0,
            actualPayout: sub.actualPayout || undefined,
            itemCount: sub.items.length,
            items: sub.items.map(item => ({
                id: item.id,
                release: item.release,
            })),
            createdAt: sub.createdAt,
            expiresAt: sub.expiresAt,
        })),
        total,
    };
}
/**
 * Get detailed view of a submission for admin
 */
export async function getAdminSubmissionDetail(submissionId) {
    const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
        include: {
            items: {
                include: {
                    release: true,
                },
            },
            history: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });
    if (!submission) {
        return null;
    }
    return {
        id: submission.id,
        submissionNumber: submission.submissionNumber,
        sellerEmail: submission.sellerEmail,
        sellerPhone: submission.sellerPhone || undefined,
        status: submission.status,
        expectedPayout: submission.expectedPayout || 0,
        actualPayout: submission.actualPayout || undefined,
        notes: submission.notes || undefined,
        createdAt: submission.createdAt,
        expiresAt: submission.expiresAt,
        items: submission.items.map(item => ({
            id: item.id,
            releaseId: item.releaseId,
            title: item.release.title,
            artist: item.release.artist,
            quantity: item.quantity,
            sellerConditionMedia: item.sellerConditionMedia,
            sellerConditionSleeve: item.sellerConditionSleeve,
            autoOfferPrice: item.autoOfferPrice,
            finalOfferPrice: item.finalOfferPrice || undefined,
            finalConditionMedia: item.finalConditionMedia || undefined,
            finalConditionSleeve: item.finalConditionSleeve || undefined,
            status: item.status,
            itemNotes: item.itemNotes || undefined,
        })),
        history: submission.history.map(h => ({
            id: h.id,
            actionType: h.actionType,
            adminNotes: h.adminNotes || undefined,
            adjustedPrice: h.adjustedPrice || undefined,
            sellerResponse: h.sellerResponse || undefined,
            createdAt: h.createdAt,
        })),
    };
}
/**
 * Accept a single submission item
 */
export async function acceptSubmissionItem(input) {
    const item = await prisma.submissionItem.findUnique({
        where: { id: input.submissionItemId },
        include: {
            submission: true,
            release: true,
        },
    });
    if (!item) {
        throw new ValidationError('Submission item not found');
    }
    if (item.status !== 'pending' && item.status !== 'counter_offered') {
        throw new ValidationError(`Cannot accept item with status: ${item.status}`);
    }
    const finalConditionMedia = input.finalConditionMedia || item.sellerConditionMedia;
    const finalConditionSleeve = input.finalConditionSleeve || item.sellerConditionSleeve;
    // Check if conditions changed from what was offered
    const conditionsChanged = finalConditionMedia !== item.sellerConditionMedia ||
        finalConditionSleeve !== item.sellerConditionSleeve;
    let finalOfferPrice = input.finalOfferPrice || item.autoOfferPrice;
    let priceRecalculated = false;
    let recalculationDetails = '';
    // If conditions changed and no explicit price was provided, recalculate
    if (conditionsChanged && !input.finalOfferPrice) {
        try {
            const { calculatePricing } = await import('./pricing');
            const { getPolicyForRelease } = await import('./pricing-policies');
            console.log(`[Pricing] Conditions changed during acceptance - recalculating price`);
            console.log(`  Original: ${item.sellerConditionMedia}/${item.sellerConditionSleeve}`);
            console.log(`  Updated: ${finalConditionMedia}/${finalConditionSleeve}`);
            const policy = await getPolicyForRelease(item.releaseId);
            if (policy) {
                const pricingResult = await calculatePricing({
                    releaseId: item.releaseId,
                    policy,
                    conditionMedia: finalConditionMedia,
                    conditionSleeve: finalConditionSleeve,
                    calculationType: 'buy_offer',
                });
                const newPrice = pricingResult.offerPrice;
                if (newPrice !== finalOfferPrice) {
                    priceRecalculated = true;
                    recalculationDetails = `Price auto-recalculated from $${finalOfferPrice} to $${newPrice} based on condition changes`;
                    finalOfferPrice = newPrice;
                    console.log(`[Pricing] Auto-recalculated offer price: $${finalOfferPrice}`);
                }
            }
            else {
                console.warn(`[Pricing] No policy found for release ${item.releaseId}, using original price`);
            }
        }
        catch (err) {
            console.error(`[Pricing] Error recalculating price on condition change:`, err);
            // Fall back to manual price if provided, otherwise use auto offer
        }
    }
    // Update the item
    await prisma.submissionItem.update({
        where: { id: input.submissionItemId },
        data: {
            status: 'accepted',
            finalConditionMedia,
            finalConditionSleeve,
            finalOfferPrice,
            updatedAt: new Date(),
        },
    });
    // Log the action
    const adminNotes = input.adminNotes
        ? `${input.adminNotes}${priceRecalculated ? ` | ${recalculationDetails}` : ''}`
        : priceRecalculated ? recalculationDetails : undefined;
    await prisma.submissionHistory.create({
        data: {
            submissionId: item.submissionId,
            submissionItemId: input.submissionItemId,
            actionType: 'accepted',
            adminNotes,
            finalConditionMedia,
            finalConditionSleeve,
            adjustedPrice: input.finalOfferPrice,
        },
    });
}
/**
 * Reject a single submission item
 */
export async function rejectSubmissionItem(input) {
    const item = await prisma.submissionItem.findUnique({
        where: { id: input.submissionItemId },
        include: {
            submission: true,
        },
    });
    if (!item) {
        throw new ValidationError('Submission item not found');
    }
    if (item.status !== 'pending' && item.status !== 'counter_offered') {
        throw new ValidationError(`Cannot reject item with status: ${item.status}`);
    }
    // Update the item
    await prisma.submissionItem.update({
        where: { id: input.submissionItemId },
        data: {
            status: 'rejected',
            updatedAt: new Date(),
        },
    });
    // Log the action
    await prisma.submissionHistory.create({
        data: {
            submissionId: item.submissionId,
            submissionItemId: input.submissionItemId,
            actionType: 'rejected',
            adminNotes: input.adminNotes,
        },
    });
}
/**
 * Send counter-offer to seller for a specific item
 */
export async function counterOfferSubmissionItem(input) {
    const item = await prisma.submissionItem.findUnique({
        where: { id: input.submissionItemId },
        include: {
            submission: true,
            release: true,
        },
    });
    if (!item) {
        throw new ValidationError('Submission item not found');
    }
    if (item.status !== 'pending') {
        throw new ValidationError(`Cannot counter-offer item with status: ${item.status}`);
    }
    if (input.newPrice <= 0) {
        throw new ValidationError('Counter-offer price must be positive');
    }
    // Update the item
    await prisma.submissionItem.update({
        where: { id: input.submissionItemId },
        data: {
            status: 'counter_offered',
            finalOfferPrice: input.newPrice,
            updatedAt: new Date(),
        },
    });
    // Log the action
    await prisma.submissionHistory.create({
        data: {
            submissionId: item.submissionId,
            submissionItemId: input.submissionItemId,
            actionType: 'counter_offered',
            adminNotes: input.adminNotes,
            adjustedPrice: input.newPrice,
            sellerResponse: 'pending',
        },
    });
    // Send notification to seller (fire-and-forget)
    sendCounterOfferNotification(item.submission.sellerEmail, item.submission.submissionNumber, item.release.title, item.release.artist, input.newPrice, item.quantity).catch(error => {
        console.error(`Failed to send counter-offer notification for ${item.submission.submissionNumber}:`, error);
    });
}
/**
 * Mark an accepted item as received and inspected (update condition based on inspection)
 */
export async function inspectSubmissionItem(input) {
    const item = await prisma.submissionItem.findUnique({
        where: { id: input.submissionItemId },
        include: {
            submission: true,
        },
    });
    if (!item) {
        throw new ValidationError('Submission item not found');
    }
    if (item.status !== 'accepted') {
        throw new ValidationError(`Can only inspect accepted items. Current status: ${item.status}`);
    }
    // Update the item with inspection results
    await prisma.submissionItem.update({
        where: { id: input.submissionItemId },
        data: {
            status: 'received_and_inspected',
            finalConditionMedia: input.finalConditionMedia,
            finalConditionSleeve: input.finalConditionSleeve,
            updatedAt: new Date(),
        },
    });
    // Log the inspection action
    await prisma.submissionHistory.create({
        data: {
            submissionId: item.submissionId,
            submissionItemId: input.submissionItemId,
            actionType: 'received_and_inspected',
            adminNotes: input.adminNotes,
            finalConditionMedia: input.finalConditionMedia,
            finalConditionSleeve: input.finalConditionSleeve,
        },
    });
}
/**
 * Finalize a received/inspected item - converts to inventory if accepted
 */
export async function finalizeSubmissionItem(input) {
    const item = await prisma.submissionItem.findUnique({
        where: { id: input.submissionItemId },
        include: {
            submission: true,
            release: true,
        },
    });
    if (!item) {
        throw new ValidationError('Submission item not found');
    }
    if (item.status !== 'received_and_inspected') {
        throw new ValidationError(`Can only finalize received/inspected items. Current status: ${item.status}`);
    }
    // Update the item to finalized
    await prisma.submissionItem.update({
        where: { id: input.submissionItemId },
        data: {
            status: 'finalized',
            updatedAt: new Date(),
        },
    });
    // Log the finalization action
    await prisma.submissionHistory.create({
        data: {
            submissionId: item.submissionId,
            submissionItemId: input.submissionItemId,
            actionType: 'finalized',
        },
    });
    // Create inventory lot from this item
    const inventoryLotNumber = await createInventoryLotFromSubmissionItem(item);
    return inventoryLotNumber;
}
/**
 * Accept all pending items in a submission at once
 */
export async function acceptAllSubmissionItems(input) {
    const submission = await prisma.sellerSubmission.findUnique({
        where: { id: input.submissionId },
        include: {
            items: true,
        },
    });
    if (!submission) {
        throw new ValidationError('Submission not found');
    }
    const pendingItems = submission.items.filter(item => item.status === 'pending' || item.status === 'counter_offered');
    if (pendingItems.length === 0) {
        throw new ValidationError('No pending items to accept');
    }
    let acceptedCount = 0;
    for (const item of pendingItems) {
        await acceptSubmissionItem({
            submissionItemId: item.id,
            adminNotes: input.adminNotes,
        });
        acceptedCount++;
    }
    return acceptedCount;
}
/**
 * Reject all pending items in a submission at once
 */
export async function rejectAllSubmissionItems(input) {
    const submission = await prisma.sellerSubmission.findUnique({
        where: { id: input.submissionId },
        include: {
            items: true,
        },
    });
    if (!submission) {
        throw new ValidationError('Submission not found');
    }
    const pendingItems = submission.items.filter(item => item.status === 'pending' || item.status === 'counter_offered');
    if (pendingItems.length === 0) {
        throw new ValidationError('No pending items to reject');
    }
    let rejectedCount = 0;
    for (const item of pendingItems) {
        await rejectSubmissionItem({
            submissionItemId: item.id,
            adminNotes: input.adminNotes,
        });
        rejectedCount++;
    }
    return rejectedCount;
}
/**
 * Get submission metrics summary for admin dashboard
 */
export async function getAdminSubmissionMetrics() {
    const total = await prisma.sellerSubmission.count();
    const statusCounts = await prisma.sellerSubmission.groupBy({
        by: ['status'],
        _count: true,
    });
    const totalValue = await prisma.sellerSubmission.aggregate({
        _sum: {
            expectedPayout: true,
        },
    });
    const itemStatuses = await prisma.submissionItem.groupBy({
        by: ['status'],
        _count: true,
    });
    return {
        totalSubmissions: total,
        submissionsByStatus: statusCounts.map(sc => ({
            status: sc.status,
            count: sc._count,
        })),
        totalExpectedPayout: totalValue._sum.expectedPayout || 0,
        itemsByStatus: itemStatuses.map(is => ({
            status: is.status,
            count: is._count,
        })),
    };
}
/**
 * Respond to counter-offer from seller
 */
export async function recordSellerCounterOfferResponse(submissionItemId, response) {
    const item = await prisma.submissionItem.findUnique({
        where: { id: submissionItemId },
        include: {
            submission: true,
        },
    });
    if (!item) {
        throw new ValidationError('Submission item not found');
    }
    if (item.status !== 'counter_offered') {
        throw new ValidationError(`Item is not in counter_offered status: ${item.status}`);
    }
    // Update the item based on response
    if (response === 'accepted') {
        await prisma.submissionItem.update({
            where: { id: submissionItemId },
            data: {
                status: 'accepted',
                updatedAt: new Date(),
            },
        });
    }
    else {
        await prisma.submissionItem.update({
            where: { id: submissionItemId },
            data: {
                status: 'rejected',
                updatedAt: new Date(),
            },
        });
    }
    // Update history with seller response
    await prisma.submissionHistory.updateMany({
        where: {
            submissionItemId,
            actionType: 'counter_offered',
            sellerResponse: 'pending',
        },
        data: {
            sellerResponse: response,
            sellerResponseAt: new Date(),
        },
    });
}
//# sourceMappingURL=admin-submissions.js.map