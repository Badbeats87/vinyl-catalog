/**
 * Inventory Management Service
 * Handles inventory lot creation and management
 */
import { prisma } from '../db/client';
import { ValidationError } from '../validation/inputs';
/**
 * Generate a human-readable lot number
 */
function generateLotNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `LOT-${year}${month}${day}-${random}`;
}
/**
 * Create a new inventory lot
 */
export async function createInventoryLot(input) {
    if (!input.releaseId) {
        throw new ValidationError('Release ID is required');
    }
    if (input.costBasis < 0) {
        throw new ValidationError('Cost basis must be non-negative');
    }
    if (input.listPrice <= 0) {
        throw new ValidationError('List price must be positive');
    }
    const release = await prisma.release.findUnique({
        where: { id: input.releaseId },
    });
    if (!release) {
        throw new ValidationError('Release not found');
    }
    const lotNumber = generateLotNumber();
    // Ensure unique lot number
    let attempts = 0;
    while (attempts < 5) {
        const existing = await prisma.inventoryLot.findUnique({
            where: { lotNumber },
        });
        if (!existing)
            break;
        attempts++;
    }
    if (attempts >= 5) {
        throw new ValidationError('Failed to generate unique lot number');
    }
    const lot = await prisma.inventoryLot.create({
        data: {
            lotNumber,
            releaseId: input.releaseId,
            conditionMedia: input.conditionMedia,
            conditionSleeve: input.conditionSleeve,
            costBasis: input.costBasis,
            listPrice: input.listPrice,
            quantity: input.quantity || 1,
            availableQuantity: input.quantity || 1,
            channel: input.channel || 'web',
            internalNotes: input.internalNotes,
            status: 'draft',
        },
    });
    return lot.lotNumber;
}
/**
 * Create inventory lot from a submission item
 * Uses finalized values if available, otherwise falls back to seller-provided values
 */
export async function createInventoryLotFromSubmissionItem(item) {
    if (!item.releaseId) {
        throw new ValidationError('Submission item must have a release');
    }
    // Use final values if set, otherwise use seller values
    const conditionMedia = item.finalConditionMedia || item.sellerConditionMedia;
    const conditionSleeve = item.finalConditionSleeve || item.sellerConditionSleeve;
    const offerPrice = item.finalOfferPrice || item.autoOfferPrice;
    if (!conditionMedia || !conditionSleeve || !offerPrice) {
        throw new ValidationError('Submission item must have condition and price information');
    }
    return createInventoryLot({
        releaseId: item.releaseId,
        conditionMedia,
        conditionSleeve,
        costBasis: offerPrice,
        listPrice: offerPrice, // Initial list price equals cost (pricing strategy can adjust later)
        quantity: item.quantity,
        channel: 'web',
        internalNotes: `Created from submission ${item.submissionId}. Original seller condition: ${item.sellerConditionMedia}/${item.sellerConditionSleeve}`,
    });
}
/**
 * Get an inventory lot by ID or lot number
 */
export async function getInventoryLot(identifier, byLotNumber = false) {
    const lot = await prisma.inventoryLot.findUnique({
        where: byLotNumber ? { lotNumber: identifier } : { id: identifier },
        include: {
            release: true,
        },
    });
    if (!lot) {
        return null;
    }
    return {
        id: lot.id,
        lotNumber: lot.lotNumber,
        release: {
            id: lot.release.id,
            title: lot.release.title,
            artist: lot.release.artist,
            barcode: lot.release.barcode,
        },
        conditionMedia: lot.conditionMedia,
        conditionSleeve: lot.conditionSleeve,
        costBasis: lot.costBasis,
        listPrice: lot.listPrice,
        status: lot.status,
        quantity: lot.quantity,
        availableQuantity: lot.availableQuantity,
        channel: lot.channel,
        internalNotes: lot.internalNotes,
        createdAt: lot.createdAt,
        updatedAt: lot.updatedAt,
        listedAt: lot.listedAt,
    };
}
/**
 * List inventory lots with filtering
 */
export async function listInventoryLots(filters = {}) {
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;
    const where = {};
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.channel) {
        where.channel = filters.channel;
    }
    if (filters.releaseId) {
        where.releaseId = filters.releaseId;
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.listPrice = {};
        if (filters.minPrice !== undefined) {
            where.listPrice.gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
            where.listPrice.lte = filters.maxPrice;
        }
    }
    const lots = await prisma.inventoryLot.findMany({
        where,
        include: {
            release: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });
    const total = await prisma.inventoryLot.count({ where });
    return {
        lots: lots.map(lot => ({
            id: lot.id,
            lotNumber: lot.lotNumber,
            release: {
                id: lot.release.id,
                title: lot.release.title,
                artist: lot.release.artist,
                barcode: lot.release.barcode,
            },
            conditionMedia: lot.conditionMedia,
            conditionSleeve: lot.conditionSleeve,
            costBasis: lot.costBasis,
            listPrice: lot.listPrice,
            status: lot.status,
            quantity: lot.quantity,
            availableQuantity: lot.availableQuantity,
            channel: lot.channel,
            createdAt: lot.createdAt,
            listedAt: lot.listedAt,
        })),
        total,
    };
}
/**
 * Update inventory lot
 */
export async function updateInventoryLot(lotId, updates) {
    const lot = await prisma.inventoryLot.findUnique({
        where: { id: lotId },
    });
    if (!lot) {
        throw new ValidationError('Inventory lot not found');
    }
    const data = {};
    if (updates.listPrice !== undefined) {
        if (updates.listPrice <= 0) {
            throw new ValidationError('List price must be positive');
        }
        data.listPrice = updates.listPrice;
    }
    if (updates.status !== undefined) {
        const validStatuses = ['draft', 'live', 'reserved', 'sold', 'returned', 'damaged'];
        if (!validStatuses.includes(updates.status)) {
            throw new ValidationError(`Invalid status: ${updates.status}`);
        }
        data.status = updates.status;
        // If transitioning to live, set listedAt
        if (updates.status === 'live' && lot.status !== 'live') {
            data.listedAt = new Date();
        }
    }
    if (updates.internalNotes !== undefined) {
        data.internalNotes = updates.internalNotes;
    }
    if (updates.channel !== undefined) {
        data.channel = updates.channel;
    }
    data.updatedAt = new Date();
    await prisma.inventoryLot.update({
        where: { id: lotId },
        data,
    });
}
/**
 * Get inventory metrics
 */
export async function getInventoryMetrics() {
    const total = await prisma.inventoryLot.count();
    const statusCounts = await prisma.inventoryLot.groupBy({
        by: ['status'],
        _count: true,
    });
    // Get all lots to calculate value accounting for quantity
    const allLots = await prisma.inventoryLot.findMany({
        select: {
            listPrice: true,
            costBasis: true,
            quantity: true,
            status: true,
        },
    });
    // Calculate totals accounting for quantity
    let totalInventoryValue = 0;
    let totalCostBasis = 0;
    for (const lot of allLots) {
        totalInventoryValue += lot.listPrice * lot.quantity;
        if (lot.status !== 'sold') {
            totalCostBasis += lot.costBasis * lot.quantity;
        }
    }
    return {
        totalLots: total,
        lotsByStatus: statusCounts.map(sc => ({
            status: sc.status,
            count: sc._count,
        })),
        totalInventoryValue,
        totalCostBasis,
    };
}
/**
 * Bulk update inventory lots
 */
export async function bulkUpdateInventoryLots(lotIds, updates) {
    const errors = [];
    let updatedCount = 0;
    // Validate lot IDs exist
    const lots = await prisma.inventoryLot.findMany({
        where: { id: { in: lotIds } },
    });
    if (lots.length !== lotIds.length) {
        const foundIds = new Set(lots.map(l => l.id));
        const missingIds = lotIds.filter(id => !foundIds.has(id));
        errors.push(`Lots not found: ${missingIds.join(', ')}`);
    }
    // Process updates for each lot
    for (const lot of lots) {
        try {
            const updateData = {};
            if (updates.status) {
                updateData.status = updates.status;
            }
            if (updates.channel) {
                updateData.channel = updates.channel;
            }
            if (updates.priceUpdate) {
                let newPrice = lot.listPrice;
                switch (updates.priceUpdate.type) {
                    case 'set':
                        newPrice = updates.priceUpdate.value;
                        break;
                    case 'increase_amount':
                        newPrice = lot.listPrice + updates.priceUpdate.value;
                        break;
                    case 'increase_percent':
                        newPrice = lot.listPrice * (1 + updates.priceUpdate.value / 100);
                        break;
                    case 'decrease_amount':
                        newPrice = lot.listPrice - updates.priceUpdate.value;
                        break;
                    case 'decrease_percent':
                        newPrice = lot.listPrice * (1 - updates.priceUpdate.value / 100);
                        break;
                }
                updateData.listPrice = Math.max(0, newPrice);
            }
            await prisma.inventoryLot.update({
                where: { id: lot.id },
                data: updateData,
            });
            updatedCount++;
        }
        catch (error) {
            errors.push(`Failed to update lot ${lot.lotNumber}: ${error.message}`);
        }
    }
    return { updatedCount, errors };
}
//# sourceMappingURL=inventory-management.js.map