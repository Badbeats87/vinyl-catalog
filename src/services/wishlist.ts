import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WishlistItemResponse {
  id: string;
  releaseId: string;
  title: string;
  artist: string;
  coverArtUrl: string | null;
  addedAt: string;
}

export interface WishlistResponse {
  id: string;
  buyerId: string;
  items: WishlistItemResponse[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get or create buyer's wishlist
 */
export async function getOrCreateWishlist(buyerId: string): Promise<any> {
  let wishlist = await prisma.wishlist.findUnique({
    where: { buyerId },
  });

  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: {
        buyerId,
      },
    });
  }

  return wishlist;
}

/**
 * Get wishlist with items
 */
export async function getWishlistWithItems(
  buyerId: string
): Promise<WishlistResponse> {
  const wishlist = await getOrCreateWishlist(buyerId);

  const items = await prisma.wishlistItem.findMany({
    where: { wishlistId: wishlist.id },
    include: {
      release: {
        select: {
          id: true,
          title: true,
          artist: true,
          coverArtUrl: true,
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  });

  const formattedItems = items.map((item: any) => ({
    id: item.id,
    releaseId: item.release.id,
    title: item.release.title,
    artist: item.release.artist,
    coverArtUrl: item.release.coverArtUrl,
    addedAt: item.addedAt.toISOString(),
  }));

  return {
    id: wishlist.id,
    buyerId: wishlist.buyerId,
    items: formattedItems,
    itemCount: formattedItems.length,
    createdAt: wishlist.createdAt.toISOString(),
    updatedAt: wishlist.updatedAt.toISOString(),
  };
}

/**
 * Add item to wishlist
 */
export async function addToWishlist(
  buyerId: string,
  releaseId: string
): Promise<WishlistItemResponse> {
  const wishlist = await getOrCreateWishlist(buyerId);

  // Check if item already in wishlist
  const existing = await prisma.wishlistItem.findUnique({
    where: {
      wishlistId_releaseId: {
        wishlistId: wishlist.id,
        releaseId,
      },
    },
  });

  if (existing) {
    // Return existing item
    const release = await prisma.release.findUnique({
      where: { id: releaseId },
      select: {
        id: true,
        title: true,
        artist: true,
        coverArtUrl: true,
      },
    });

    if (!release) {
      throw new Error('Release not found');
    }

    return {
      id: existing.id,
      releaseId: release.id,
      title: release.title,
      artist: release.artist,
      coverArtUrl: release.coverArtUrl,
      addedAt: existing.addedAt.toISOString(),
    };
  }

  // Verify release exists
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: {
      id: true,
      title: true,
      artist: true,
      coverArtUrl: true,
    },
  });

  if (!release) {
    throw new Error('Release not found');
  }

  // Add to wishlist
  const item = await prisma.wishlistItem.create({
    data: {
      wishlistId: wishlist.id,
      releaseId,
    },
  });

  return {
    id: item.id,
    releaseId: release.id,
    title: release.title,
    artist: release.artist,
    coverArtUrl: release.coverArtUrl,
    addedAt: item.addedAt.toISOString(),
  };
}

/**
 * Remove item from wishlist
 */
export async function removeFromWishlist(
  buyerId: string,
  wishlistItemId: string
): Promise<boolean> {
  // Verify the item belongs to the buyer's wishlist
  const wishlistItem = await prisma.wishlistItem.findUnique({
    where: { id: wishlistItemId },
    include: { wishlist: true },
  });

  if (!wishlistItem || wishlistItem.wishlist.buyerId !== buyerId) {
    throw new Error('Wishlist item not found or unauthorized');
  }

  await prisma.wishlistItem.delete({
    where: { id: wishlistItemId },
  });

  return true;
}

/**
 * Remove all items from wishlist (clear wishlist)
 */
export async function clearWishlist(buyerId: string): Promise<number> {
  const wishlist = await getOrCreateWishlist(buyerId);

  const result = await prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id },
  });

  return result.count;
}

/**
 * Check if release is in wishlist
 */
export async function isInWishlist(
  buyerId: string,
  releaseId: string
): Promise<boolean> {
  const wishlist = await getOrCreateWishlist(buyerId);

  const item = await prisma.wishlistItem.findUnique({
    where: {
      wishlistId_releaseId: {
        wishlistId: wishlist.id,
        releaseId,
      },
    },
  });

  return !!item;
}

/**
 * Get wishlist item count
 */
export async function getWishlistItemCount(buyerId: string): Promise<number> {
  const wishlist = await getOrCreateWishlist(buyerId);

  const count = await prisma.wishlistItem.count({
    where: { wishlistId: wishlist.id },
  });

  return count;
}
