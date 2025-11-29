/**
 * Admin API Routes
 * Handles admin operations for submissions, inventory, and business intelligence
 */
import { listAdminSubmissions, getAdminSubmissionDetail, acceptSubmissionItem, rejectSubmissionItem, counterOfferSubmissionItem, inspectSubmissionItem, finalizeSubmissionItem, acceptAllSubmissionItems, rejectAllSubmissionItems, getAdminSubmissionMetrics, recordSellerCounterOfferResponse, } from '../services/admin-submissions.js';
import { listInventoryLots, getInventoryLot, updateInventoryLot, getInventoryMetrics, } from '../services/inventory-management.js';
import { getPolicyConditionDiscounts, setConditionDiscount, setBulkConditionDiscounts, getAllConditionTiers, } from '../services/condition-discounts.js';
import { ValidationError } from '../validation/inputs.js';
/**
 * List submissions with filters for admin dashboard
 */
export async function listSubmissions(status, sellerEmail, startDate, endDate, minValue, maxValue, limit, offset) {
    try {
        const result = await listAdminSubmissions({
            status,
            sellerEmail,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            minValue,
            maxValue,
            limit,
            offset,
        });
        return {
            success: true,
            data: result,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'LIST_SUBMISSIONS_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to list submissions',
            },
        };
    }
}
/**
 * Get submission detail for admin
 */
export async function getSubmissionDetail(submissionId) {
    try {
        if (!submissionId) {
            throw new ValidationError('Submission ID is required');
        }
        const detail = await getAdminSubmissionDetail(submissionId);
        if (!detail) {
            return {
                success: false,
                error: {
                    code: 'SUBMISSION_NOT_FOUND',
                    message: 'Submission not found',
                },
            };
        }
        return {
            success: true,
            data: detail,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'GET_SUBMISSION_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to get submission',
            },
        };
    }
}
/**
 * Accept a submission item
 */
export async function acceptItem(input) {
    try {
        await acceptSubmissionItem(input);
        return {
            success: true,
            data: null,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'ACCEPT_ITEM_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to accept item',
            },
        };
    }
}
/**
 * Reject a submission item
 */
export async function rejectItem(input) {
    try {
        await rejectSubmissionItem(input);
        return {
            success: true,
            data: null,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'REJECT_ITEM_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to reject item',
            },
        };
    }
}
/**
 * Send counter-offer for a submission item
 */
export async function counterOffer(input) {
    try {
        await counterOfferSubmissionItem(input);
        return {
            success: true,
            data: null,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'COUNTER_OFFER_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to send counter-offer',
            },
        };
    }
}
/**
 * Inspect a received submission item and update condition
 */
export async function inspectItem(input) {
    try {
        await inspectSubmissionItem(input);
        return {
            success: true,
            data: null,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'INSPECT_ITEM_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to inspect item',
            },
        };
    }
}
/**
 * Finalize an inspected item (convert to inventory)
 */
export async function finalizeItem(submissionItemId) {
    try {
        const lotNumber = await finalizeSubmissionItem({ submissionItemId });
        return {
            success: true,
            data: { lotNumber },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'FINALIZE_ITEM_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to finalize item',
            },
        };
    }
}
/**
 * Accept all pending items in a submission
 */
export async function acceptAllItems(input) {
    try {
        const acceptedCount = await acceptAllSubmissionItems(input);
        return {
            success: true,
            data: { acceptedCount },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'ACCEPT_ALL_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to accept all items',
            },
        };
    }
}
/**
 * Reject all pending items in a submission
 */
export async function rejectAllItems(input) {
    try {
        const rejectedCount = await rejectAllSubmissionItems(input);
        return {
            success: true,
            data: { rejectedCount },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'REJECT_ALL_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to reject all items',
            },
        };
    }
}
/**
 * Get admin submission metrics for dashboard
 */
export async function getSubmissionMetrics() {
    try {
        const metrics = await getAdminSubmissionMetrics();
        return {
            success: true,
            data: metrics,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'GET_METRICS_ERROR',
                message: 'Failed to get submission metrics',
            },
        };
    }
}
/**
 * Record seller's response to counter-offer
 */
export async function recordCounterOfferResponse(submissionItemId, response) {
    try {
        if (response !== 'accepted' && response !== 'rejected') {
            throw new ValidationError('Response must be "accepted" or "rejected"');
        }
        await recordSellerCounterOfferResponse(submissionItemId, response);
        return {
            success: true,
            data: null,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'RECORD_RESPONSE_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to record response',
            },
        };
    }
}
// ============= Inventory Routes =============
/**
 * List inventory lots
 */
export async function listInventory(status, channel, releaseId, minPrice, maxPrice, limit, offset) {
    try {
        const result = await listInventoryLots({
            status,
            channel,
            releaseId,
            minPrice,
            maxPrice,
            limit,
            offset,
        });
        return {
            success: true,
            data: result,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'LIST_INVENTORY_ERROR',
                message: 'Failed to list inventory',
            },
        };
    }
}
/**
 * Get inventory lot detail
 */
export async function getInventoryDetail(identifier, byLotNumber = false) {
    try {
        const lot = await getInventoryLot(identifier, byLotNumber);
        if (!lot) {
            return {
                success: false,
                error: {
                    code: 'LOT_NOT_FOUND',
                    message: 'Inventory lot not found',
                },
            };
        }
        return {
            success: true,
            data: lot,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'GET_INVENTORY_ERROR',
                message: 'Failed to get inventory lot',
            },
        };
    }
}
/**
 * Update inventory lot
 */
export async function updateInventory(input) {
    try {
        const lotId = input.lotId || input.id;
        if (!lotId) {
            return {
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Lot ID is required',
                },
            };
        }
        await updateInventoryLot(lotId, {
            listPrice: input.listPrice,
            status: input.status,
            internalNotes: input.internalNotes,
            channel: input.channel,
            conditionMedia: input.conditionMedia,
            conditionSleeve: input.conditionSleeve,
        });
        return {
            success: true,
            data: null,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'UPDATE_INVENTORY_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to update inventory',
            },
        };
    }
}
export async function bulkUpdateInventory(input) {
    try {
        const { bulkUpdateInventoryLots } = await import('../services/inventory-management');
        const result = await bulkUpdateInventoryLots(input.lotIds, input.updates);
        return {
            success: true,
            data: result,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'BULK_UPDATE_INVENTORY_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to bulk update inventory',
            },
        };
    }
}
/**
 * Get inventory metrics
 */
export async function getInventoryMetricsRoute() {
    try {
        const metrics = await getInventoryMetrics();
        return {
            success: true,
            data: metrics,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'GET_INVENTORY_METRICS_ERROR',
                message: 'Failed to get inventory metrics',
            },
        };
    }
}
/**
 * List buyer orders with filters for admin dashboard
 */
export async function listBuyerOrders(status, paymentStatus, limit, offset) {
    try {
        const { prisma } = await import('../db/client');
        const whereClause = {};
        if (status)
            whereClause.status = status;
        if (paymentStatus)
            whereClause.paymentStatus = paymentStatus;
        const total = await prisma.buyerOrder.count({ where: whereClause });
        const orders = await prisma.buyerOrder.findMany({
            where: whereClause,
            include: {
                buyer: {
                    select: {
                        email: true,
                        name: true,
                        phone: true,
                    },
                },
                items: {
                    include: {
                        lot: {
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
                },
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit || 20, 100),
            skip: offset || 0,
        });
        return {
            success: true,
            data: {
                orders,
                total,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'LIST_ORDERS_ERROR',
                message: 'Failed to list buyer orders',
            },
        };
    }
}
/**
 * Get order detail for admin
 */
export async function getBuyerOrderDetail(orderId) {
    try {
        if (!orderId) {
            throw new ValidationError('Order ID is required');
        }
        const { prisma } = await import('../db/client');
        const order = await prisma.buyerOrder.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
                items: {
                    include: {
                        lot: {
                            include: {
                                release: true,
                            },
                        },
                    },
                },
            },
        });
        if (!order) {
            return {
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found',
                },
            };
        }
        return {
            success: true,
            data: order,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'GET_ORDER_ERROR',
                message: error instanceof ValidationError ? error.message : 'Failed to get order',
            },
        };
    }
}
/**
 * Get sales reconciliation data - link lots to orders
 */
export async function getSalesReconciliation(startDate, endDate, limit, offset) {
    try {
        const { prisma } = await import('../db/client');
        const whereClause = {
            status: 'sold',
        };
        if (startDate || endDate) {
            whereClause.updatedAt = {};
            if (startDate)
                whereClause.updatedAt.gte = new Date(startDate);
            if (endDate)
                whereClause.updatedAt.lte = new Date(endDate);
        }
        const total = await prisma.inventoryLot.count({ where: whereClause });
        const lots = await prisma.inventoryLot.findMany({
            where: whereClause,
            include: {
                release: {
                    select: {
                        title: true,
                        artist: true,
                    },
                },
                orderItems: {
                    include: {
                        order: {
                            select: {
                                id: true,
                                orderNumber: true,
                                buyer: {
                                    select: {
                                        email: true,
                                        name: true,
                                    },
                                },
                                paidAt: true,
                                shippedAt: true,
                                status: true,
                            },
                        },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: Math.min(limit || 20, 100),
            skip: offset || 0,
        });
        // Format reconciliation data
        const reconciliation = lots.map((lot) => ({
            lotNumber: lot.lotNumber,
            release: lot.release,
            conditionMedia: lot.conditionMedia,
            conditionSleeve: lot.conditionSleeve,
            costBasis: lot.costBasis,
            soldPrice: lot.listPrice,
            profit: lot.listPrice - lot.costBasis,
            quantity: lot.quantity,
            soldAt: lot.updatedAt,
            orders: lot.orderItems.map((oi) => ({
                orderNumber: oi.order.orderNumber,
                buyerEmail: oi.order.buyer.email,
                buyerName: oi.order.buyer.name,
                paidAt: oi.order.paidAt,
                shippedAt: oi.order.shippedAt,
                status: oi.order.status,
            })),
        }));
        return {
            success: true,
            data: {
                reconciliation,
                total,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'RECONCILIATION_ERROR',
                message: 'Failed to get sales reconciliation',
            },
        };
    }
}
/**
 * Accept submission and create inventory
 */
export async function acceptSubmissionAndCreateInventory(submissionId) {
    try {
        const { prisma } = await import('../db/client');
        const { createInventoryLotFromSubmissionItem } = await import('../services/inventory-management');
        // Find the submission by ID or submissionNumber
        let submission;
        if (submissionId.includes('-')) {
            // Looks like a submissionNumber (e.g., SUB-1764410071896-I5MVV)
            submission = await prisma.sellerSubmission.findFirst({
                where: { submissionNumber: submissionId },
                include: {
                    items: {
                        include: {
                            release: true,
                        },
                    },
                },
            });
        }
        else {
            // Looks like an ID
            submission = await prisma.sellerSubmission.findUnique({
                where: { id: submissionId },
                include: {
                    items: {
                        include: {
                            release: true,
                        },
                    },
                },
            });
        }
        if (!submission) {
            return {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Submission not found',
                },
            };
        }
        // Update submission status
        await prisma.sellerSubmission.update({
            where: { id: submission.id },
            data: { status: 'accepted' },
        });
        // Create inventory for each item
        const createdLots = [];
        const errors = [];
        for (const item of submission.items) {
            try {
                const lotId = await createInventoryLotFromSubmissionItem(item);
                createdLots.push(lotId);
            }
            catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error(`Failed to create inventory for item ${item.id}:`, errorMsg);
                errors.push(`Item ${item.id}: ${errorMsg}`);
            }
        }
        return {
            success: createdLots.length > 0,
            data: {
                createdLots,
                message: `Submission accepted. Created ${createdLots.length} lot(s).`,
                errors: errors.length > 0 ? errors : undefined,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'ACCEPT_SUBMISSION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to accept submission',
            },
        };
    }
}
/**
 * Reject submission
 */
export async function rejectSubmission(submissionId) {
    try {
        const { prisma } = await import('../db/client');
        // Find and update the submission
        const submission = await prisma.sellerSubmission.findUnique({
            where: { id: submissionId },
        });
        if (!submission) {
            return {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Submission not found',
                },
            };
        }
        await prisma.sellerSubmission.update({
            where: { id: submissionId },
            data: { status: 'rejected' },
        });
        return {
            success: true,
            data: null,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'REJECT_SUBMISSION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to reject submission',
            },
        };
    }
}
/**
 * Get all condition tiers for policy configuration
 */
export async function getConditionTiers() {
    try {
        const tiers = await getAllConditionTiers();
        return {
            success: true,
            data: {
                tiers: tiers.map(t => ({
                    id: t.id,
                    name: t.name,
                    order: t.order,
                    mediaAdjustment: t.mediaAdjustment,
                    sleeveAdjustment: t.sleeveAdjustment,
                })),
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'GET_CONDITION_TIERS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to get condition tiers',
            },
        };
    }
}
/**
 * Get condition discounts for a policy
 */
export async function getPolicyDiscounts(policyId) {
    try {
        const discounts = await getPolicyConditionDiscounts(policyId);
        return {
            success: true,
            data: { discounts },
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'GET_POLICY_DISCOUNTS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to get policy discounts',
            },
        };
    }
}
/**
 * Set condition discount for a policy
 */
export async function setDiscount(policyId, conditionTierId, buyDiscountPercentage, sellDiscountPercentage) {
    try {
        await setConditionDiscount(policyId, conditionTierId, buyDiscountPercentage, sellDiscountPercentage);
        return {
            success: true,
            data: null,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'SET_DISCOUNT_ERROR',
                message: error instanceof Error ? error.message : 'Failed to set discount',
            },
        };
    }
}
/**
 * Bulk set condition discounts for a policy
 */
export async function setDiscounts(policyId, discounts) {
    try {
        await setBulkConditionDiscounts(policyId, discounts);
        return {
            success: true,
            data: null,
        };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'SET_DISCOUNTS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to set discounts',
            },
        };
    }
}
//# sourceMappingURL=admin-routes.js.map