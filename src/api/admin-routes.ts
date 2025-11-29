/**
 * Admin API Routes
 * Handles admin operations for submissions, inventory, and business intelligence
 */

import {
  listAdminSubmissions,
  getAdminSubmissionDetail,
  acceptSubmissionItem,
  rejectSubmissionItem,
  counterOfferSubmissionItem,
  inspectSubmissionItem,
  finalizeSubmissionItem,
  acceptAllSubmissionItems,
  rejectAllSubmissionItems,
  getAdminSubmissionMetrics,
  recordSellerCounterOfferResponse,
} from '../services/admin-submissions';
import {
  listInventoryLots,
  getInventoryLot,
  updateInventoryLot,
  getInventoryMetrics,
} from '../services/inventory-management';
import { ValidationError } from '../validation/inputs';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * List submissions with filters for admin dashboard
 */
export async function listSubmissions(
  status?: string,
  sellerEmail?: string,
  startDate?: string,
  endDate?: string,
  minValue?: number,
  maxValue?: number,
  limit?: number,
  offset?: number
): Promise<ApiResponse<any>> {
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
  } catch (error: any) {
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
export async function getSubmissionDetail(submissionId: string): Promise<ApiResponse<any>> {
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
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'GET_SUBMISSION_ERROR',
        message: error instanceof ValidationError ? error.message : 'Failed to get submission',
      },
    };
  }
}

export interface AcceptItemInput {
  submissionItemId: string;
  finalConditionMedia?: string;
  finalConditionSleeve?: string;
  finalOfferPrice?: number;
  adminNotes?: string;
}

/**
 * Accept a submission item
 */
export async function acceptItem(input: AcceptItemInput): Promise<ApiResponse<null>> {
  try {
    await acceptSubmissionItem(input);

    return {
      success: true,
      data: null,
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ACCEPT_ITEM_ERROR',
        message: error instanceof ValidationError ? error.message : 'Failed to accept item',
      },
    };
  }
}

export interface RejectItemInput {
  submissionItemId: string;
  adminNotes?: string;
}

/**
 * Reject a submission item
 */
export async function rejectItem(input: RejectItemInput): Promise<ApiResponse<null>> {
  try {
    await rejectSubmissionItem(input);

    return {
      success: true,
      data: null,
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'REJECT_ITEM_ERROR',
        message: error instanceof ValidationError ? error.message : 'Failed to reject item',
      },
    };
  }
}

export interface CounterOfferInput {
  submissionItemId: string;
  newPrice: number;
  adminNotes?: string;
}

/**
 * Send counter-offer for a submission item
 */
export async function counterOffer(input: CounterOfferInput): Promise<ApiResponse<null>> {
  try {
    await counterOfferSubmissionItem(input);

    return {
      success: true,
      data: null,
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'COUNTER_OFFER_ERROR',
        message: error instanceof ValidationError ? error.message : 'Failed to send counter-offer',
      },
    };
  }
}

export interface InspectItemInput {
  submissionItemId: string;
  finalConditionMedia: string;
  finalConditionSleeve: string;
  adminNotes?: string;
}

/**
 * Inspect a received submission item and update condition
 */
export async function inspectItem(input: InspectItemInput): Promise<ApiResponse<null>> {
  try {
    await inspectSubmissionItem(input);

    return {
      success: true,
      data: null,
    };
  } catch (error: any) {
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
export async function finalizeItem(submissionItemId: string): Promise<ApiResponse<{ lotNumber: string }>> {
  try {
    const lotNumber = await finalizeSubmissionItem({ submissionItemId });

    return {
      success: true,
      data: { lotNumber },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'FINALIZE_ITEM_ERROR',
        message: error instanceof ValidationError ? error.message : 'Failed to finalize item',
      },
    };
  }
}

export interface AcceptAllItemsInput {
  submissionId: string;
  adminNotes?: string;
}

/**
 * Accept all pending items in a submission
 */
export async function acceptAllItems(input: AcceptAllItemsInput): Promise<ApiResponse<{ acceptedCount: number }>> {
  try {
    const acceptedCount = await acceptAllSubmissionItems(input);

    return {
      success: true,
      data: { acceptedCount },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ACCEPT_ALL_ERROR',
        message: error instanceof ValidationError ? error.message : 'Failed to accept all items',
      },
    };
  }
}

export interface RejectAllItemsInput {
  submissionId: string;
  adminNotes?: string;
}

/**
 * Reject all pending items in a submission
 */
export async function rejectAllItems(input: RejectAllItemsInput): Promise<ApiResponse<{ rejectedCount: number }>> {
  try {
    const rejectedCount = await rejectAllSubmissionItems(input);

    return {
      success: true,
      data: { rejectedCount },
    };
  } catch (error: any) {
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
export async function getSubmissionMetrics(): Promise<ApiResponse<any>> {
  try {
    const metrics = await getAdminSubmissionMetrics();

    return {
      success: true,
      data: metrics,
    };
  } catch (error: any) {
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
export async function recordCounterOfferResponse(
  submissionItemId: string,
  response: 'accepted' | 'rejected'
): Promise<ApiResponse<null>> {
  try {
    if (response !== 'accepted' && response !== 'rejected') {
      throw new ValidationError('Response must be "accepted" or "rejected"');
    }

    await recordSellerCounterOfferResponse(submissionItemId, response);

    return {
      success: true,
      data: null,
    };
  } catch (error: any) {
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
export async function listInventory(
  status?: string,
  channel?: string,
  releaseId?: string,
  minPrice?: number,
  maxPrice?: number,
  limit?: number,
  offset?: number
): Promise<ApiResponse<any>> {
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
  } catch (error: any) {
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
export async function getInventoryDetail(
  identifier: string,
  byLotNumber: boolean = false
): Promise<ApiResponse<any>> {
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
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'GET_INVENTORY_ERROR',
        message: 'Failed to get inventory lot',
      },
    };
  }
}

export interface UpdateInventoryInput {
  lotId?: string;
  id?: string;
  listPrice?: number;
  status?: string;
  internalNotes?: string;
  channel?: string;
}

/**
 * Update inventory lot
 */
export async function updateInventory(input: UpdateInventoryInput): Promise<ApiResponse<null>> {
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
    });

    return {
      success: true,
      data: null,
    };
  } catch (error: any) {
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
 * Bulk update inventory lots
 */
export interface BulkUpdateInventoryInput {
  lotIds: string[];
  updates: {
    status?: string;
    channel?: string;
    priceUpdate?: {
      type: 'set' | 'increase_amount' | 'increase_percent' | 'decrease_amount' | 'decrease_percent';
      value: number;
    };
  };
}

export async function bulkUpdateInventory(input: BulkUpdateInventoryInput): Promise<ApiResponse<any>> {
  try {
    const { bulkUpdateInventoryLots } = await import('../services/inventory-management');
    const result = await bulkUpdateInventoryLots(input.lotIds, input.updates);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
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
export async function getInventoryMetricsRoute(): Promise<ApiResponse<any>> {
  try {
    const metrics = await getInventoryMetrics();

    return {
      success: true,
      data: metrics,
    };
  } catch (error: any) {
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
export async function listBuyerOrders(
  status?: string,
  paymentStatus?: string,
  limit?: number,
  offset?: number
): Promise<ApiResponse<any>> {
  try {
    const { prisma } = await import('../db/client');

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;

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
  } catch (error: any) {
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
export async function getBuyerOrderDetail(orderId: string): Promise<ApiResponse<any>> {
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
  } catch (error: any) {
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
export async function getSalesReconciliation(
  startDate?: string,
  endDate?: string,
  limit?: number,
  offset?: number
): Promise<ApiResponse<any>> {
  try {
    const { prisma } = await import('../db/client');

    const whereClause: any = {
      status: 'sold',
    };

    if (startDate || endDate) {
      whereClause.updatedAt = {};
      if (startDate) whereClause.updatedAt.gte = new Date(startDate);
      if (endDate) whereClause.updatedAt.lte = new Date(endDate);
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
  } catch (error: any) {
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
export async function acceptSubmissionAndCreateInventory(submissionId: string): Promise<ApiResponse<any>> {
  try {
    const { prisma } = await import('../db/client');
    const { createInventoryLotFromSubmissionItem } = await import('../services/inventory-management');

    // Find the submission
    const submission = await prisma.sellerSubmission.findUnique({
      where: { id: submissionId },
      include: {
        items: {
          include: {
            release: true,
          },
        },
      },
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

    // Update submission status
    await prisma.sellerSubmission.update({
      where: { id: submissionId },
      data: { status: 'accepted' },
    });

    // Create inventory for each item
    const createdLots = [];
    const errors = [];
    for (const item of submission.items) {
      try {
        const lotId = await createInventoryLotFromSubmissionItem(item);
        createdLots.push(lotId);
      } catch (err: any) {
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
  } catch (error: any) {
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
export async function rejectSubmission(submissionId: string): Promise<ApiResponse<null>> {
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
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'REJECT_SUBMISSION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reject submission',
      },
    };
  }
}
