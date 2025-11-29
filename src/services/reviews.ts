import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ReviewData {
  rating: number;
  title: string;
  content: string;
  conditionRating: number;
  photos?: string[];
}

export interface ReviewResponse {
  id: string;
  buyerId: string;
  buyerName?: string;
  orderId: string;
  releaseId: string;
  releaseTitle: string;
  releaseArtist: string;
  rating: number;
  title: string;
  content: string;
  conditionRating: number;
  photos: string[];
  status: string;
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

export interface ReleaseReviewStats {
  releaseId: string;
  releaseTitle: string;
  releaseArtist: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number;
  };
  approvedReviews: ReviewResponse[];
}

/**
 * Create a review for an order
 */
export async function createReview(
  buyerId: string,
  orderId: string,
  releaseId: string,
  data: ReviewData
): Promise<ReviewResponse> {
  // Validate rating is between 1-5
  if (data.rating < 1 || data.rating > 5 || !Number.isInteger(data.rating)) {
    throw new Error('Rating must be an integer between 1 and 5');
  }

  // Validate condition rating
  if (
    data.conditionRating < 1 ||
    data.conditionRating > 5 ||
    !Number.isInteger(data.conditionRating)
  ) {
    throw new Error('Condition rating must be an integer between 1 and 5');
  }

  // Verify order belongs to buyer
  const order = await prisma.buyerOrder.findUnique({
    where: { id: orderId },
    include: { items: { where: { lot: { releaseId } } } },
  });

  if (!order || order.buyerId !== buyerId) {
    throw new Error('Order not found or unauthorized');
  }

  if (order.items.length === 0) {
    throw new Error('Release not found in this order');
  }

  // Check if review already exists
  const existingReview = await prisma.review.findUnique({
    where: {
      orderId_releaseId: {
        orderId,
        releaseId,
      },
    },
  });

  if (existingReview) {
    throw new Error('Review already exists for this order');
  }

  // Get release info
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { id: true, title: true, artist: true },
  });

  if (!release) {
    throw new Error('Release not found');
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      buyerId,
      orderId,
      releaseId,
      rating: data.rating,
      title: data.title,
      content: data.content,
      conditionRating: data.conditionRating,
      photos:
        data.photos && data.photos.length > 0
          ? {
              createMany: {
                data: data.photos.map((url) => ({ photoUrl: url })),
              },
            }
          : undefined,
    },
    include: {
      photos: true,
      buyer: { select: { id: true, name: true } },
    },
  });

  return formatReview(review as any, release as any, true);
}

/**
 * Get reviews for a release
 */
export async function getReviewsForRelease(
  releaseId: string,
  includeUnapproved = false
): Promise<ReleaseReviewStats> {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { id: true, title: true, artist: true },
  });

  if (!release) {
    throw new Error('Release not found');
  }

  const where = {
    releaseId,
    ...(includeUnapproved ? {} : { status: 'approved' }),
  };

  const reviews = await prisma.review.findMany({
    where,
    include: {
      photos: true,
      buyer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate stats
  const approvedCount = reviews.filter((r) => r.status === 'approved').length;
  const ratings = reviews
    .filter((r) => r.status === 'approved')
    .map((r) => r.rating);
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : 0;

  // Rating distribution
  const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((rating) => {
    ratingDistribution[rating]++;
  });

  const formattedReviews = reviews
    .filter((r) => r.status === 'approved')
    .map((r) => formatReview(r as any, release as any, true));

  return {
    releaseId: release.id,
    releaseTitle: release.title,
    releaseArtist: release.artist,
    averageRating,
    totalReviews: approvedCount,
    ratingDistribution,
    approvedReviews: formattedReviews,
  };
}

/**
 * Get reviews by a buyer
 */
export async function getReviewsByBuyer(buyerId: string): Promise<ReviewResponse[]> {
  const reviews = await prisma.review.findMany({
    where: { buyerId },
    include: {
      photos: true,
      buyer: { select: { id: true, name: true } },
      release: { select: { id: true, title: true, artist: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reviews.map((r) =>
    formatReview(r as any, r.release as any, true)
  );
}

/**
 * Update review status (approve/reject)
 */
export async function updateReviewStatus(
  reviewId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<ReviewResponse> {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : null,
    },
    include: {
      photos: true,
      buyer: { select: { id: true, name: true } },
      release: { select: { id: true, title: true, artist: true } },
    },
  });

  return formatReview(review as any, review.release as any, true);
}

/**
 * Add admin response to review
 */
export async function addAdminResponse(
  reviewId: string,
  response: string
): Promise<ReviewResponse> {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      adminResponse: response,
      respondedAt: new Date(),
    },
    include: {
      photos: true,
      buyer: { select: { id: true, name: true } },
      release: { select: { id: true, title: true, artist: true } },
    },
  });

  return formatReview(review as any, review.release as any, true);
}

/**
 * Get pending reviews for admin
 */
export async function getPendingReviews(limit = 50): Promise<ReviewResponse[]> {
  const reviews = await prisma.review.findMany({
    where: { status: 'pending' },
    include: {
      photos: true,
      buyer: { select: { id: true, name: true } },
      release: { select: { id: true, title: true, artist: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  return reviews.map((r) =>
    formatReview(r as any, r.release as any, true)
  );
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string): Promise<boolean> {
  await prisma.review.delete({
    where: { id: reviewId },
  });

  return true;
}

/**
 * Format review for API response
 */
function formatReview(
  review: any,
  release: any,
  verifiedPurchase: boolean
): ReviewResponse {
  return {
    id: review.id,
    buyerId: review.buyerId,
    buyerName: review.buyer?.name,
    orderId: review.orderId,
    releaseId: review.releaseId,
    releaseTitle: release.title,
    releaseArtist: release.artist,
    rating: review.rating,
    title: review.title,
    content: review.content,
    conditionRating: review.conditionRating,
    photos: review.photos?.map((p: any) => p.photoUrl) || [],
    status: review.status,
    adminResponse: review.adminResponse,
    respondedAt: review.respondedAt?.toISOString(),
    createdAt: review.createdAt.toISOString(),
    verifiedPurchase,
  };
}
