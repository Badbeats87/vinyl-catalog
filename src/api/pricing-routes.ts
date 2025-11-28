import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all pricing policies
router.get('/policies', async (req: Request, res: Response) => {
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
router.get('/policy/active', async (req: Request, res: Response) => {
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
router.post('/policies', async (req: Request, res: Response) => {
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

    const policy = await prisma.pricingPolicy.create({
      data: {
        name,
        description,
        scope: 'global',
        buyMarketSource: buyMarketSource || 'discogs',
        buyMarketStat: buyMarketStat || 'median',
        buyPercentage: buyPercentage || 0.55,
        sellMarketSource: sellMarketSource || 'discogs',
        sellMarketStat: sellMarketStat || 'median',
        sellPercentage: sellPercentage || 1.25,
        applyConditionAdjustment: applyConditionAdjustment !== false,
        roundingIncrement: roundingIncrement || 0.25,
        isActive: false,
      },
    });

    res.json({ success: true, message: 'Policy created', policy });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Update pricing policy
router.put('/policies/:id', async (req: Request, res: Response) => {
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

    const policy = await prisma.pricingPolicy.update({
      where: { id },
      data: {
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
        version: { increment: 1 },
      },
    });

    res.json({ success: true, message: 'Policy updated', policy });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Calculate price using a policy
router.post('/calculate', async (req: Request, res: Response) => {
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
      return res.status(404).json({ success: false, error: 'Policy not found' });
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

export default router;
