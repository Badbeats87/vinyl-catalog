# Platform Quick Start Guide

## Running the Platform

### Development Mode
To run the server with live reloading:

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### Production Mode (Recommended)
The recommended way to run in production is using tsx (same as dev, but without watch):

```bash
tsx src/index.ts
```

Alternatively, to use the compiled JavaScript directly:

```bash
# Build the TypeScript
npm run build

# Run with Node.js
NODE_ENV=production node dist/index.js
```

**Note:** For ESM compatibility in production, ensure you're using Node.js 18+ and that your hosting environment supports ES modules.

## Environment Configuration

Create a `.env` file in the project root:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/vinyl_catalog"
```

## Database Setup

Initialize and seed the database:

```bash
# Run migrations
npm run db:migrate:dev

# Seed sample data
npm run db:seed
```

View the database with Prisma Studio:

```bash
npm run db:studio
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Pricing API
- `POST /api/pricing/quote` - Get pricing quote for a release
- `GET /api/pricing/audit-logs/release/:releaseId` - Audit logs for a release
- `GET /api/pricing/audit-logs/policy/:policyId` - Audit logs for a policy

### Seller API
- `GET /api/seller/catalog?q=<query>` - Search release catalog
- `POST /api/seller/quotes` - Generate quotes for items
- `POST /api/seller/submit` - Submit seller offer
- `GET /api/seller/submission/:submissionNumber` - Get submission details
- `GET /api/seller/submissions?email=<email>` - Get seller's submissions
- `GET /api/seller/conditions` - Get condition tiers

### Admin API
- `GET /api/admin/submissions` - List submissions
- `GET /api/admin/submissions/:submissionId` - Get submission detail
- `POST /api/admin/submissions/item/accept` - Accept item
- `POST /api/admin/submissions/item/reject` - Reject item
- `POST /api/admin/submissions/item/counter-offer` - Counter offer
- `POST /api/admin/submissions/item/inspect` - Mark for inspection
- `POST /api/admin/submissions/item/finalize` - Finalize to inventory lot
- `POST /api/admin/submissions/accept-all` - Accept all items in submission
- `POST /api/admin/submissions/reject-all` - Reject all items in submission
- `GET /api/admin/submissions/metrics` - Admin dashboard metrics
- `POST /api/admin/submissions/counter-offer-response` - Record counter-offer response
- `GET /api/admin/inventory` - List inventory lots
- `GET /api/admin/inventory/:identifier` - Get lot details
- `PUT /api/admin/inventory` - Update lot details
- `GET /api/admin/inventory/metrics` - Inventory metrics
- `GET /api/admin/orders` - List buyer orders
- `GET /api/admin/orders/:orderId` - Get order details
- `GET /api/admin/reconciliation` - Sales reconciliation

### Buyer API
- `GET /api/buyer/browse` - Browse inventory by filters
- `GET /api/buyer/product/:lotId` - Get product details
- `GET /api/buyer/search?q=<query>` - Search inventory

### Buyer Checkout API
- `GET /api/buyer/cart/:buyerId` - Get shopping cart
- `POST /api/buyer/cart/:buyerId/items` - Add item to cart
- `PUT /api/buyer/cart/:buyerId/items/:lotId` - Update cart item quantity
- `DELETE /api/buyer/cart/:buyerId/items/:lotId` - Remove item from cart
- `DELETE /api/buyer/cart/:buyerId` - Clear cart
- `POST /api/buyer/orders` - Create order from cart
- `GET /api/buyer/orders/:orderId` - Get order details
- `POST /api/buyer/orders/:orderId/paypal-prepare` - Prepare PayPal payment
- `POST /api/buyer/orders/:orderId/paypal-capture` - Capture PayPal payment
- `GET /api/buyer/orders` - Get buyer's order history

## Testing

Run tests with:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Linting

Check code quality:

```bash
npm run lint
```

## Available Commands

- `npm run admin` - Admin CLI tool for direct database operations
- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:prod` - Build for production
- `npm run db:migrate` - Deploy database migrations
- `npm run db:migrate:dev` - Create new dev migration
- `npm run db:generate` - Regenerate Prisma client
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio GUI

## Architecture

```
src/
├── index.ts                 # Express server entry point
├── api/                     # Route handlers
│   ├── pricing-routes.ts
│   ├── seller-routes.ts
│   ├── admin-routes.ts
│   ├── buyer-routes.ts
│   └── buyer-checkout-routes.ts
├── services/                # Business logic
├── db/                      # Database setup
├── validation/              # Input validation
├── cli/                     # CLI tools
└── jobs/                    # Background jobs
```

## Deployment

1. Set up environment variables in production
2. Build the project: `npm run build:prod`
3. Run migrations: `npm run db:migrate`
4. Start the server: `npm start`

The API server is ready for integration with your frontend applications!
