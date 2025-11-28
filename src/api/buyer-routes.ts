import { prisma } from '../db/client';
import { ValidationError } from '../validation/inputs';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BrowseInventoryFilter {
  releaseId?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  conditionMedia?: string;
  channel?: string;
  limit?: number;
  offset?: number;
}

export interface InventoryLotView {
  id: string;
  lotNumber: string;
  releaseId: string;
  release: {
    id: string;
    title: string;
    artist: string;
    genre: string | null;
    coverArtUrl: string | null;
  };
  conditionMedia: string;
  conditionSleeve: string;
  listPrice: number;
  quantity: number;
  availableQuantity: number;
}

export interface InventoryGrouped {
  releaseId: string;
  release: {
    id: string;
    title: string;
    artist: string;
    genre: string | null;
    coverArtUrl: string | null;
  };
  lots: InventoryLotView[];
}

export interface BrowseInventoryResponse {
  groups: InventoryGrouped[];
  total: number;
}

export interface ProductDetailResponse {
  id: string;
  lotNumber: string;
  releaseId: string;
  release: {
    id: string;
    title: string;
    artist: string;
    label: string | null;
    catalogNumber: string | null;
    releaseYear: number | null;
    genre: string | null;
    coverArtUrl: string | null;
  };
  conditionMedia: string;
  conditionSleeve: string;
  listPrice: number;
  quantity: number;
  availableQuantity: number;
  channel: string;
  status: string;
  listedAt: Date | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function validateBrowseFilters(filters: BrowseInventoryFilter): void {
  if (filters.limit !== undefined) {
    if (filters.limit < 1 || filters.limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
  }

  if (filters.offset !== undefined && filters.offset < 0) {
    throw new ValidationError('Offset must be non-negative');
  }

  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    throw new ValidationError('Minimum price cannot exceed maximum price');
  }

  if (filters.minPrice !== undefined && filters.minPrice < 0) {
    throw new ValidationError('Minimum price must be non-negative');
  }

  if (filters.maxPrice !== undefined && filters.maxPrice < 0) {
    throw new ValidationError('Maximum price must be non-negative');
  }
}

// ============================================================================
// BROWSE & SEARCH ENDPOINTS
// ============================================================================

/**
 * Browse live inventory lots grouped by release and condition.
 * Returns lots from all public/sellable channels.
 */
export async function browseInventory(
  filters: BrowseInventoryFilter
): Promise<BrowseInventoryResponse> {
  validateBrowseFilters(filters);

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  // Get public channel IDs that are sellable
  const publicChannels = await prisma.channelConfig.findMany({
    where: {
      isPublic: true,
      isSellable: true,
    },
  });

  const channelList = publicChannels.map((c) => c.channel);

  // Build query filters
  const whereClause: any = {
    status: 'live',
    availableQuantity: { gt: 0 },
    channel: { in: channelList },
  };

  if (filters.releaseId) {
    whereClause.releaseId = filters.releaseId;
  }

  if (filters.conditionMedia) {
    whereClause.conditionMedia = filters.conditionMedia;
  }

  if (filters.minPrice || filters.maxPrice) {
    whereClause.listPrice = {};
    if (filters.minPrice) {
      whereClause.listPrice.gte = filters.minPrice;
    }
    if (filters.maxPrice) {
      whereClause.listPrice.lte = filters.maxPrice;
    }
  }

  // Get total count
  const totalLots = await prisma.inventoryLot.count({ where: whereClause });

  // Fetch lots with release details
  const lots = await prisma.inventoryLot.findMany({
    where: whereClause,
    include: {
      release: {
        select: {
          id: true,
          title: true,
          artist: true,
          genre: true,
          coverArtUrl: true,
        },
      },
    },
    orderBy: [{ releaseId: 'asc' }, { conditionMedia: 'asc' }],
    take: limit,
    skip: offset,
  });

  // Apply genre filter after fetch (if needed, since genre is on Release)
  let filteredLots = lots;
  if (filters.genre) {
    filteredLots = lots.filter(
      (lot) => lot.release.genre?.toLowerCase() === filters.genre?.toLowerCase()
    );
  }

  // Group by release
  const grouped: Record<string, InventoryGrouped> = {};
  for (const lot of filteredLots) {
    const releaseKey = lot.releaseId;
    if (!grouped[releaseKey]) {
      grouped[releaseKey] = {
        releaseId: lot.releaseId,
        release: lot.release,
        lots: [],
      };
    }

    grouped[releaseKey].lots.push({
      id: lot.id,
      lotNumber: lot.lotNumber,
      releaseId: lot.releaseId,
      release: lot.release,
      conditionMedia: lot.conditionMedia,
      conditionSleeve: lot.conditionSleeve,
      listPrice: lot.listPrice,
      quantity: lot.quantity,
      availableQuantity: lot.availableQuantity,
    });
  }

  return {
    groups: Object.values(grouped),
    total: totalLots,
  };
}

/**
 * Get detailed product information for a specific inventory lot.
 */
export async function getProductDetail(
  lotId: string
): Promise<ProductDetailResponse> {
  if (!lotId) {
    throw new ValidationError('Lot ID is required');
  }

  const lot = await prisma.inventoryLot.findUnique({
    where: { id: lotId },
    include: {
      release: {
        select: {
          id: true,
          title: true,
          artist: true,
          label: true,
          catalogNumber: true,
          releaseYear: true,
          genre: true,
          coverArtUrl: true,
        },
      },
    },
  });

  if (!lot) {
    throw new ValidationError('Lot not found');
  }

  // Check if lot is available for purchase
  if (lot.status !== 'live' || lot.availableQuantity <= 0) {
    throw new ValidationError('This item is no longer available for purchase');
  }

  return {
    id: lot.id,
    lotNumber: lot.lotNumber,
    releaseId: lot.releaseId,
    release: lot.release,
    conditionMedia: lot.conditionMedia,
    conditionSleeve: lot.conditionSleeve,
    listPrice: lot.listPrice,
    quantity: lot.quantity,
    availableQuantity: lot.availableQuantity,
    channel: lot.channel,
    status: lot.status,
    listedAt: lot.listedAt,
  };
}

/**
 * Search inventory by release title or artist.
 */
export interface SearchInventoryInput {
  query: string;
  limit?: number;
  offset?: number;
}

export async function searchInventory(
  input: SearchInventoryInput
): Promise<BrowseInventoryResponse> {
  if (!input.query || input.query.trim().length === 0) {
    throw new ValidationError('Search query is required');
  }

  const limit = input.limit || 20;
  const offset = input.offset || 0;

  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }

  if (offset < 0) {
    throw new ValidationError('Offset must be non-negative');
  }

  // Get public channels
  const publicChannels = await prisma.channelConfig.findMany({
    where: { isPublic: true, isSellable: true },
  });
  const channelList = publicChannels.map((c) => c.channel);

  // Search for matching releases by title or artist (case-insensitive)
  const searchLower = input.query.toLowerCase();
  const matchingReleases = await prisma.release.findMany({
    where: {
      OR: [
        { title: { contains: searchLower, mode: 'insensitive' } },
        { artist: { contains: searchLower, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });

  const releaseIds = matchingReleases.map((r) => r.id);

  if (releaseIds.length === 0) {
    return { groups: [], total: 0 };
  }

  // Get total live lots for these releases
  const totalLots = await prisma.inventoryLot.count({
    where: {
      status: 'live',
      availableQuantity: { gt: 0 },
      channel: { in: channelList },
      releaseId: { in: releaseIds },
    },
  });

  // Fetch lots
  const lots = await prisma.inventoryLot.findMany({
    where: {
      status: 'live',
      availableQuantity: { gt: 0 },
      channel: { in: channelList },
      releaseId: { in: releaseIds },
    },
    include: {
      release: {
        select: {
          id: true,
          title: true,
          artist: true,
          genre: true,
          coverArtUrl: true,
        },
      },
    },
    orderBy: [{ releaseId: 'asc' }, { conditionMedia: 'asc' }],
    take: limit,
    skip: offset,
  });

  // Group by release
  const grouped: Record<string, InventoryGrouped> = {};
  for (const lot of lots) {
    const releaseKey = lot.releaseId;
    if (!grouped[releaseKey]) {
      grouped[releaseKey] = {
        releaseId: lot.releaseId,
        release: lot.release,
        lots: [],
      };
    }

    grouped[releaseKey].lots.push({
      id: lot.id,
      lotNumber: lot.lotNumber,
      releaseId: lot.releaseId,
      release: lot.release,
      conditionMedia: lot.conditionMedia,
      conditionSleeve: lot.conditionSleeve,
      listPrice: lot.listPrice,
      quantity: lot.quantity,
      availableQuantity: lot.availableQuantity,
    });
  }

  return {
    groups: Object.values(grouped),
    total: totalLots,
  };
}
