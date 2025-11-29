import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get admin dashboard stats
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    // Total inventory value (live listings)
    const liveInventory = await prisma.inventoryLot.findMany({
      where: { status: 'live' },
      select: { listPrice: true, quantity: true },
    });
    const inventoryValue = liveInventory.reduce((sum, lot) => sum + (lot.listPrice * lot.quantity), 0);

    // Records added this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const addedThisWeek = await prisma.release.count({
      where: { createdAt: { gte: weekAgo } },
    });

    // Sales in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSales = await prisma.salesHistory.findMany({
      where: { soldAt: { gte: thirtyDaysAgo } },
    });

    const totalSalesRevenue = recentSales.reduce((sum, sale) => sum + sale.totalSalePrice, 0);
    const totalCost = recentSales.reduce((sum, sale) => sum + (sale.costBasis * sale.quantity), 0);
    const averageProfitMargin = recentSales.length > 0
      ? recentSales.reduce((sum, sale) => sum + sale.profitMargin, 0) / recentSales.length
      : 0;

    // Recent sales history
    const salesHistory = await prisma.salesHistory.findMany({
      take: 10,
      orderBy: { soldAt: 'desc' },
      include: {
        release: { select: { title: true, artist: true } },
      },
    });

    // Price changes (audit logs from last 7 days)
    const priceChanges = await prisma.pricingCalculationAudit.findMany({
      where: { createdAt: { gte: weekAgo } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        release: { select: { title: true, artist: true } },
        policy: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      stats: {
        inventoryValue: Math.round(inventoryValue * 100) / 100,
        addedThisWeek,
        recentSalesCount: recentSales.length,
        salesRevenue: Math.round(totalSalesRevenue * 100) / 100,
        salesCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round((totalSalesRevenue - totalCost) * 100) / 100,
        averageProfitMargin: Math.round(averageProfitMargin * 10000) / 100,
      },
      salesHistory,
      priceChanges,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Get detailed sales history
router.get('/sales-history', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const sales = await prisma.salesHistory.findMany({
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { soldAt: 'desc' },
      include: {
        release: { select: { id: true, title: true, artist: true } },
      },
    });

    const total = await prisma.salesHistory.count();

    res.json({
      success: true,
      sales,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Get inventory statistics
router.get('/inventory-stats', async (_req: Request, res: Response) => {
  try {
    const lots = await prisma.inventoryLot.findMany({
      select: {
        status: true,
        listPrice: true,
        quantity: true,
        channel: true,
        release: { select: { genre: true } },
      },
    });

    const statsByStatus = {
      draft: 0,
      live: 0,
      reserved: 0,
      sold: 0,
      other: 0,
    };

    const statsByChannel: any = {};
    const valueByGenre: any = {};

    lots.forEach((lot) => {
      const value = lot.listPrice * lot.quantity;

      // By status
      if (statsByStatus.hasOwnProperty(lot.status)) {
        statsByStatus[lot.status as keyof typeof statsByStatus] += value;
      } else {
        statsByStatus.other += value;
      }

      // By channel
      if (!statsByChannel[lot.channel]) {
        statsByChannel[lot.channel] = 0;
      }
      statsByChannel[lot.channel] += value;

      // By genre
      if (lot.release?.genre) {
        if (!valueByGenre[lot.release.genre]) {
          valueByGenre[lot.release.genre] = 0;
        }
        valueByGenre[lot.release.genre] += value;
      }
    });

    res.json({
      success: true,
      statsByStatus,
      statsByChannel,
      valueByGenre,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
