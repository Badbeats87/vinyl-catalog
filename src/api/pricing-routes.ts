/**
 * Pricing API Routes
 * Endpoints for requesting pricing quotes and viewing audit logs
 */

import { prisma } from '../db/client';
import { getPricingPolicyById, getPolicyForRelease } from '../services/pricing-policies';
import { getFullPricingQuote, getPricingAuditLogs, getPricingAuditLogsByPolicy } from '../services/pricing';

export interface QuoteRequest {
  releaseId: string;
  policyId?: string; // If not provided, will use policy for the release's genre
  conditionMedia: string;
  conditionSleeve: string;
}

export interface QuoteResponse {
  success: boolean;
  data?: {
    releaseId: string;
    releaseTitle: string;
    releaseArtist: string;
    policyId: string;
    policyName: string;
    policyVersion: number;
    buyOffer: number;
    sellListPrice: number;
    breakdown: {
      buy: BreakdownDetail;
      sell: BreakdownDetail;
    };
    requiresManualReview: boolean;
    auditLogs: {
      buy: string;
      sell: string;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface BreakdownDetail {
  marketSource: string;
  marketStat: string;
  baseMarketPrice: number | null;
  formulaPercentage: number;
  conditionAdjustment: number;
  mediaWeight: number;
  sleeveWeight: number;
  priceBeforeRounding: number;
  roundingIncrement: number;
  finalPrice: number;
  appliedCaps: {
    minCap: number | null;
    maxCap: number | null;
    cappedPrice: number;
  };
}

/**
 * Request a pricing quote for a release
 * Returns both buy offer and sell list price with breakdown
 */
export async function getPricingQuote(request: QuoteRequest): Promise<QuoteResponse> {
  try {
    // Validate release exists
    const release = await prisma.release.findUnique({
      where: { id: request.releaseId },
    });

    if (!release) {
      return {
        success: false,
        error: {
          code: 'RELEASE_NOT_FOUND',
          message: `Release not found: ${request.releaseId}`,
        },
      };
    }

    // Get pricing policy
    let policy;

    if (request.policyId) {
      policy = await getPricingPolicyById(request.policyId);
      if (!policy) {
        return {
          success: false,
          error: {
            code: 'POLICY_NOT_FOUND',
            message: `Pricing policy not found: ${request.policyId}`,
          },
        };
      }
    } else {
      // Use default policy for release
      policy = await getPolicyForRelease(request.releaseId);
      if (!policy) {
        return {
          success: false,
          error: {
            code: 'NO_POLICY_FOUND',
            message: `No pricing policy found for release ${request.releaseId}`,
          },
        };
      }
    }

    // Validate conditions exist
    const mediaCondition = await prisma.conditionTier.findUnique({
      where: { name: request.conditionMedia },
    });

    const sleeveCondition = await prisma.conditionTier.findUnique({
      where: { name: request.conditionSleeve },
    });

    if (!mediaCondition || !sleeveCondition) {
      return {
        success: false,
        error: {
          code: 'INVALID_CONDITION',
          message: `Invalid condition tier(s): media=${request.conditionMedia}, sleeve=${request.conditionSleeve}`,
        },
      };
    }

    // Calculate pricing
    const quote = await getFullPricingQuote(
      request.releaseId,
      policy,
      request.conditionMedia,
      request.conditionSleeve
    );

    return {
      success: true,
      data: {
        releaseId: release.id,
        releaseTitle: release.title,
        releaseArtist: release.artist,
        policyId: policy.id,
        policyName: policy.name,
        policyVersion: policy.version,
        buyOffer: quote.buyOffer,
        sellListPrice: quote.sellListPrice,
        breakdown: {
          buy: quote.breakdown.buy as BreakdownDetail,
          sell: quote.breakdown.sell as BreakdownDetail,
        },
        requiresManualReview: quote.requiresManualReview,
        auditLogs: quote.auditLogs,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
  }
}

/**
 * Get pricing audit logs for a release
 */
export async function getAuditLogsForRelease(
  releaseId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  success: boolean;
  data?: {
    releaseId: string;
    logs: Array<{
      id: string;
      calculationType: string;
      conditionMedia: string;
      conditionSleeve: string;
      marketPrice: number | null;
      calculatedPrice: number;
      policyId: string;
      policyVersion?: number;
      marketSnapshotId: string | null;
      createdAt: Date;
      breakdown?: Record<string, unknown>;
    }>;
    total: number;
    limit: number;
    offset: number;
  };
  error?: {
    code: string;
    message: string;
  };
}> {
  try {
    // Validate release exists
    const release = await prisma.release.findUnique({
      where: { id: releaseId },
    });

    if (!release) {
      return {
        success: false,
        error: {
          code: 'RELEASE_NOT_FOUND',
          message: `Release not found: ${releaseId}`,
        },
      };
    }

    const { logs, total } = await getPricingAuditLogs(releaseId, limit, offset);

    return {
      success: true,
      data: {
        releaseId,
        logs: logs.map((log) => ({
          id: log.id,
          calculationType: log.calculationType,
          conditionMedia: log.conditionMedia,
          conditionSleeve: log.conditionSleeve,
          marketPrice: log.marketPrice,
          calculatedPrice: log.calculatedPrice,
          policyId: log.policyId,
          policyVersion: log.policy?.version,
          marketSnapshotId: log.marketSnapshotId,
          createdAt: log.createdAt,
          breakdown: log.calculationDetails ? JSON.parse(log.calculationDetails) : undefined,
        })),
        total,
        limit,
        offset,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
  }
}

/**
 * Get pricing audit logs for a policy
 */
export async function getAuditLogsForPolicy(
  policyId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  success: boolean;
  data?: {
    policyId: string;
    logs: Array<{
      id: string;
      releaseId: string;
      releaseTitle?: string;
      releaseArtist?: string;
      calculationType: string;
      conditionMedia: string;
      conditionSleeve: string;
      marketPrice: number | null;
      calculatedPrice: number;
      marketSnapshotId: string | null;
      createdAt: Date;
      breakdown?: Record<string, unknown>;
    }>;
    total: number;
    limit: number;
    offset: number;
  };
  error?: {
    code: string;
    message: string;
  };
}> {
  try {
    // Validate policy exists
    const policy = await getPricingPolicyById(policyId);

    if (!policy) {
      return {
        success: false,
        error: {
          code: 'POLICY_NOT_FOUND',
          message: `Pricing policy not found: ${policyId}`,
        },
      };
    }

    const { logs, total } = await getPricingAuditLogsByPolicy(policyId, limit, offset);

    return {
      success: true,
      data: {
        policyId,
        logs: logs.map((log) => ({
          id: log.id,
          releaseId: log.releaseId,
          releaseTitle: log.release?.title,
          releaseArtist: log.release?.artist,
          calculationType: log.calculationType,
          conditionMedia: log.conditionMedia,
          conditionSleeve: log.conditionSleeve,
          marketPrice: log.marketPrice,
          calculatedPrice: log.calculatedPrice,
          marketSnapshotId: log.marketSnapshotId,
          createdAt: log.createdAt,
          breakdown: log.calculationDetails ? JSON.parse(log.calculationDetails) : undefined,
        })),
        total,
        limit,
        offset,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
  }
}
