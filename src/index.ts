/**
 * Main HTTP Server Entry Point
 * Initializes Express app with all API routes and middleware
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Import middleware
import { authenticate, requireAdmin, requireSeller, requireBuyer, allowImpersonation, AuthenticatedRequest } from './middleware/auth';

// Import all route handlers
import * as authRoutes from './api/auth-routes';
import * as sellerRoutes from './api/seller-routes';
import * as adminRoutes from './api/admin-routes';
import * as buyerRoutes from './api/buyer-routes';
import * as buyerCheckoutRoutes from './api/buyer-checkout-routes';

// Import Router-based routes
import searchRouter from './api/search-routes';
import pricingRouter from './api/pricing-routes';
import analyticsRouter from './api/analytics-routes';

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(data: unknown) {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    return originalSend.call(this, data);
  };

  next();
});

// Impersonation support for development
app.use(allowImpersonation as (req: AuthenticatedRequest, res: Response, next: NextFunction) => void);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTHENTICATION ROUTES (Public)
// ============================================================================

app.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await authRoutes.login(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PRICING API ROUTES (Router-based)
// ============================================================================

app.use('/api/pricing', pricingRouter);

// ============================================================================
// SEARCH API ROUTES (Router-based)
// ============================================================================

app.use('/api/search', searchRouter);

// ============================================================================
// ANALYTICS API ROUTES (Router-based)
// ============================================================================

app.use('/api/analytics', analyticsRouter);

// ============================================================================
// SELLER API ROUTES (Protected - Seller Only)
// ============================================================================

app.get('/api/seller/catalog', authenticate, requireSeller, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string || '';
    const response = await sellerRoutes.searchCatalog({
      query,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/seller/quotes', authenticate, requireSeller, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await sellerRoutes.generateQuotes(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/seller/submit', authenticate, requireSeller, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await sellerRoutes.submitSellerOffer(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/seller/listings', authenticate, requireSeller, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.email || 'unknown@demo.com';
    const response = await sellerRoutes.createListing(req.body, userId);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/seller/submission/:submissionNumber', authenticate, requireSeller, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await sellerRoutes.getSubmission({
      submissionNumber: req.params.submissionNumber,
    });
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/seller/submissions', authenticate, requireSeller, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await sellerRoutes.getSellerSubmissions({
      email: req.query.email as string || '',
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    });
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/seller/conditions', authenticate, requireSeller, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await sellerRoutes.getConditionOptions();
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ADMIN API ROUTES (Protected - Admin Only)
// ============================================================================

app.get('/api/admin/submissions', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const response = await adminRoutes.listSubmissions(
      req.query.status as string,
      req.query.sellerEmail as string,
      req.query.startDate as string,
      req.query.endDate as string,
      req.query.minValue ? parseInt(req.query.minValue as string) : undefined,
      req.query.maxValue ? parseInt(req.query.maxValue as string) : undefined,
      limit,
      offset
    );
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/submissions/:submissionId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.getSubmissionDetail(req.params.submissionId);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/item/accept', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.acceptItem(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/item/reject', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.rejectItem(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/item/counter-offer', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.counterOffer(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/item/inspect', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.inspectItem(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/item/finalize', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.finalizeItem(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/accept-all', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.acceptAllItems(req.body.submissionId);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/reject-all', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.rejectAllItems(req.body.submissionId);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/submissions/metrics', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.getSubmissionMetrics();
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/counter-offer-response', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.recordCounterOfferResponse(
      req.body.submissionItemId,
      req.body.response
    );
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/accept', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.acceptSubmissionAndCreateInventory(req.body.submissionId);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/submissions/reject', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.rejectSubmission(req.body.submissionId);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/inventory', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const response = await adminRoutes.listInventory(
      req.query.status as string,
      req.query.channel as string,
      req.query.releaseId as string,
      undefined,
      limit,
      offset
    );
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/inventory/:identifier', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const byLotNumber = req.query.byLotNumber === 'true';
    const response = await adminRoutes.getInventoryDetail(req.params.identifier, byLotNumber);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/inventory', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.updateInventory(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/inventory/metrics', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.getInventoryMetricsRoute();
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/inventory/bulk-update', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.bulkUpdateInventory(req.body);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/orders', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const response = await adminRoutes.listBuyerOrders(
      req.query.status as string,
      req.query.paymentStatus as string,
      limit,
      offset
    );
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/orders/:orderId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminRoutes.getBuyerOrderDetail(req.params.orderId);
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/reconciliation', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const response = await adminRoutes.getSalesReconciliation(
      req.query.startDate as string,
      req.query.endDate as string,
      limit,
      offset
    );
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BUYER API ROUTES
// ============================================================================

app.get('/api/buyer/browse', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: buyerRoutes.BrowseInventoryFilter = {};
    if (req.query.releaseId) filters.releaseId = req.query.releaseId as string;
    if (req.query.genre) filters.genre = req.query.genre as string;
    if (req.query.minPrice) filters.minPrice = parseInt(req.query.minPrice as string);
    if (req.query.maxPrice) filters.maxPrice = parseInt(req.query.maxPrice as string);
    if (req.query.conditionMedia) filters.conditionMedia = req.query.conditionMedia as string;
    if (req.query.channel) filters.channel = req.query.channel as string;
    filters.limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    filters.offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const response = await buyerRoutes.browseInventory(filters);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/buyer/product/:lotId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerRoutes.getProductDetail(req.params.lotId);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/buyer/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string || '';
    const response = await buyerRoutes.searchInventory({
      query,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BUYER CHECKOUT API ROUTES (Protected - Buyer Only)
// ============================================================================

app.get('/api/buyer/cart/:buyerId', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerCheckoutRoutes.getCart(req.params.buyerId);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/buyer/cart/:buyerId/items', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerCheckoutRoutes.addToCart({
      buyerId: req.params.buyerId,
      lotId: req.body.lotId,
      quantity: req.body.quantity,
    });
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.put('/api/buyer/cart/:buyerId/items/:lotId', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerCheckoutRoutes.updateCartItemQuantity({
      buyerId: req.params.buyerId,
      lotId: req.params.lotId,
      quantity: req.body.quantity,
    });
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/buyer/cart/:buyerId/items/:lotId', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerCheckoutRoutes.removeFromCart(
      req.params.buyerId,
      req.params.lotId
    );
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/buyer/cart/:buyerId', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerCheckoutRoutes.clearCart(req.params.buyerId);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/buyer/orders', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerCheckoutRoutes.createOrder({
      buyerId: req.body.buyerId,
      shippingAddress: req.body.shippingAddress,
    });
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/buyer/orders/:orderId', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerCheckoutRoutes.getOrder(req.params.orderId);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/buyer/orders/:orderId/paypal-prepare', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerCheckoutRoutes.preparePayPalOrder(req.params.orderId);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/buyer/orders/:orderId/paypal-capture', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await buyerCheckoutRoutes.capturePayment({
      orderId: req.params.orderId,
      paypalOrderId: req.body.paypalOrderId,
    });
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/buyer/orders', authenticate, requireBuyer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const response = await buyerCheckoutRoutes.getBuyerOrders(
      req.query.buyerId as string || '',
      limit,
      offset
    );
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err: Error & { statusCode?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║    Platform API Server Started        ║
╚════════════════════════════════════════╝

  Server: http://localhost:${PORT}
  Health: http://localhost:${PORT}/health
  Environment: ${process.env.NODE_ENV || 'development'}

  Available API Endpoints:
  ├─ /api/pricing/*         (Pricing quotes & audit logs)
  ├─ /api/seller/*          (Seller submission & catalog)
  ├─ /api/admin/*           (Admin intake & inventory)
  ├─ /api/buyer/*           (Buyer storefront & browse)
  └─ /api/buyer/cart/*      (Shopping cart & checkout)

  Ready to handle requests! 🎵

  `);
});

export default app;
