import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all pricing policies
router.get('/policies', async (_req: Request, res: Response) => {
  try {
    const policies = await prisma.pricingPolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, policies });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Get active pricing policy
router.get('/policy/active', async (_req: Request, res: Response) => {
  try {
    const policy = await prisma.pricingPolicy.findFirst({
      where: { isActive: true, scope: 'global' },
    });
    res.json({ success: true, policy });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Create new pricing policy
router.post('/policies', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      buyMarketSource,
      buyMarketStat,
      buyPercentage,
      sellMarketSource,
      sellMarketStat,
      sellPercentage,
      applyConditionAdjustment,
      roundingIncrement,
    } = req.body;

    // Validation
    const errors: string[] = [];

    // Name validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Policy name is required');
    } else if (name.trim().length > 100) {
      errors.push('Policy name must not exceed 100 characters');
    }

    // Percentage validation
    const validatedBuyPercentage = parseFloat(buyPercentage);
    const validatedSellPercentage = parseFloat(sellPercentage);

    if (isNaN(validatedBuyPercentage) || validatedBuyPercentage <= 0 || validatedBuyPercentage > 5) {
      errors.push('Buy percentage must be between 0.01 and 5.00');
    }

    if (isNaN(validatedSellPercentage) || validatedSellPercentage <= 0 || validatedSellPercentage > 5) {
      errors.push('Sell percentage must be between 0.01 and 5.00');
    }

    // Market source validation
    const validMarketSources = ['discogs', 'ebay', 'hybrid'];
    if (buyMarketSource && !validMarketSources.includes(buyMarketSource)) {
      errors.push('Buy market source must be one of: discogs, ebay, hybrid');
    }

    if (sellMarketSource && !validMarketSources.includes(sellMarketSource)) {
      errors.push('Sell market source must be one of: discogs, ebay, hybrid');
    }

    // Market stat validation
    const validMarketStats = ['low', 'median', 'high'];
    if (buyMarketStat && !validMarketStats.includes(buyMarketStat)) {
      errors.push('Buy market stat must be one of: low, median, high');
    }

    if (sellMarketStat && !validMarketStats.includes(sellMarketStat)) {
      errors.push('Sell market stat must be one of: low, median, high');
    }

    // Rounding increment validation
    if (roundingIncrement) {
      const validatedRoundingIncrement = parseFloat(roundingIncrement);
      if (isNaN(validatedRoundingIncrement) || validatedRoundingIncrement <= 0) {
        errors.push('Rounding increment must be a positive number');
      }
    }

    // Return validation errors
    if (errors.length > 0) {
      res.status(400).json({ success: false, error: errors.join('; ') });
      return;
    }

    const policy = await prisma.pricingPolicy.create({
      data: {
        name: name.trim(),
        description,
        scope: 'global',
        buyMarketSource: buyMarketSource || 'discogs',
        buyMarketStat: buyMarketStat || 'median',
        buyPercentage: validatedBuyPercentage,
        sellMarketSource: sellMarketSource || 'discogs',
        sellMarketStat: sellMarketStat || 'median',
        sellPercentage: validatedSellPercentage,
        applyConditionAdjustment: applyConditionAdjustment !== false,
        roundingIncrement: roundingIncrement ? parseFloat(roundingIncrement) : 0.25,
        isActive: false,
      },
    });

    res.json({ success: true, message: 'Policy created', policy });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Update pricing policy
router.put('/policies/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      buyMarketSource,
      buyMarketStat,
      buyPercentage,
      sellMarketSource,
      sellMarketStat,
      sellPercentage,
      applyConditionAdjustment,
      roundingIncrement,
      isActive,
    } = req.body;

    // Validation
    const errors: string[] = [];

    // Name validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Policy name is required');
    } else if (name.trim().length > 100) {
      errors.push('Policy name must not exceed 100 characters');
    }

    // Percentage validation (only if provided)
    if (buyPercentage !== undefined) {
      const validatedBuyPercentage = parseFloat(buyPercentage);
      if (isNaN(validatedBuyPercentage) || validatedBuyPercentage <= 0 || validatedBuyPercentage > 5) {
        errors.push('Buy percentage must be between 0.01 and 5.00');
      }
    }

    if (sellPercentage !== undefined) {
      const validatedSellPercentage = parseFloat(sellPercentage);
      if (isNaN(validatedSellPercentage) || validatedSellPercentage <= 0 || validatedSellPercentage > 5) {
        errors.push('Sell percentage must be between 0.01 and 5.00');
      }
    }

    // Return validation errors
    if (errors.length > 0) {
      res.status(400).json({ success: false, error: errors.join('; ') });
      return;
    }

    const policy = await prisma.pricingPolicy.update({
      where: { id },
      data: {
        name: name.trim(),
        description,
        buyMarketSource,
        buyMarketStat,
        buyPercentage: buyPercentage !== undefined ? parseFloat(buyPercentage) : undefined,
        sellMarketSource,
        sellMarketStat,
        sellPercentage: sellPercentage !== undefined ? parseFloat(sellPercentage) : undefined,
        applyConditionAdjustment,
        roundingIncrement,
        isActive,
        version: { increment: 1 },
      },
    });

    res.json({ success: true, message: 'Policy updated', policy });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Delete pricing policy
router.delete('/policies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const policy = await prisma.pricingPolicy.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Policy deleted', policy });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Calculate price using a policy
router.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      policyId,
      releaseId,
      discogsPrice,
      ebayPrice,
      conditionMedia,
      conditionSleeve,
      calculationType,
    } = req.body;

    const policy = await prisma.pricingPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      res.status(404).json({ success: false, error: 'Policy not found' });
      return;
    }

    // Select market price based on policy
    let basePrice = 0;
    if (policy.buyMarketSource === 'discogs' && discogsPrice) {
      basePrice = discogsPrice;
    } else if (policy.buyMarketSource === 'ebay' && ebayPrice) {
      basePrice = ebayPrice;
    } else if (policy.buyMarketSource === 'hybrid') {
      basePrice = ((discogsPrice || 0) + (ebayPrice || 0)) / 2;
    }

    // Apply percentage
    const percentage = calculationType === 'sell' ? policy.sellPercentage : policy.buyPercentage;
    let calculatedPrice = basePrice * percentage;

    // Round
    calculatedPrice = Math.round(calculatedPrice / policy.roundingIncrement) * policy.roundingIncrement;

    // Log calculation
    const audit = await prisma.pricingCalculationAudit.create({
      data: {
        releaseId,
        policyId,
        calculationType: calculationType || 'buy_offer',
        conditionMedia,
        conditionSleeve,
        marketPrice: basePrice,
        calculatedPrice,
        calculationDetails: JSON.stringify({
          basePrice,
          percentage,
          beforeRounding: basePrice * percentage,
          afterRounding: calculatedPrice,
        }),
      },
    });

    res.json({
      success: true,
      calculatedPrice,
      audit,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Get all condition tiers
router.get('/conditions', async (_req: Request, res: Response) => {
  try {
    const { getConditionTiers } = await import('../api/admin-routes');
    const result = await getConditionTiers();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Get condition discounts for a policy
router.get('/policies/:policyId/discounts', async (req: Request, res: Response) => {
  try {
    const { getPolicyDiscounts } = await import('../api/admin-routes');
    const result = await getPolicyDiscounts(req.params.policyId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Set condition discount for a policy
router.post('/policies/:policyId/discounts/:conditionTierId', async (req: Request, res: Response) => {
  try {
    const { buyDiscountPercentage, sellDiscountPercentage, discountPercentage } = req.body;
    const { setDiscount } = await import('../api/admin-routes');
    // Support both old single-discount format and new buy/sell format
    const buyDiscount = buyDiscountPercentage ?? discountPercentage ?? 0;
    const sellDiscount = sellDiscountPercentage ?? discountPercentage ?? 0;
    const result = await setDiscount(
      req.params.policyId,
      req.params.conditionTierId,
      buyDiscount,
      sellDiscount
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Bulk set condition discounts for a policy
router.post('/policies/:policyId/discounts', async (req: Request, res: Response) => {
  try {
    const { discounts } = req.body;
    const { setDiscounts } = await import('../api/admin-routes');
    const result = await setDiscounts(req.params.policyId, discounts);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
