/**
 * Admin API Routes
 * Handles admin operations for submissions, inventory, and business intelligence
 */
import { listAdminSubmissions, getAdminSubmissionDetail, acceptSubmissionItem, rejectSubmissionItem, counterOfferSubmissionItem, inspectSubmissionItem, finalizeSubmissionItem, acceptAllSubmissionItems, rejectAllSubmissionItems, getAdminSubmissionMetrics, recordSellerCounterOfferResponse, } from '../services/admin-submissions';
import { listInventoryLots, getInventoryLot, updateInventoryLot, getInventoryMetrics, } from '../services/inventory-management';
import { ValidationError } from '../validation/inputs';
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
        await updateInventoryLot(input.lotId, {
            listPrice: input.listPrice,
            status: input.status,
            internalNotes: input.internalNotes,
            channel: input.channel,
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
//# sourceMappingURL=admin-routes.js.map