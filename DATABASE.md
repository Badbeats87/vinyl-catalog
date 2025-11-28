# Database Setup & Management

## Overview

This project uses PostgreSQL with Prisma as the ORM. The database schema implements the complete catalog & policy data model for the vinyl record buying/selling platform.

## Schema Overview (ERD)

### Core Tables

#### Release
- **Purpose**: Core catalog metadata for each vinyl release
- **Fields**:
  - `id` (CUID, primary key)
  - `title`, `artist`, `label`, `catalogNumber`, `barcode`
  - `releaseYear`, `genre`, `coverArtUrl`
  - `createdAt`, `updatedAt`
- **Indexes**: barcode, (artist, title), genre, full-text search on artist+title
- **Relationships**:
  - 1:N with MarketSnapshot
  - 1:N with SubmissionItem
  - 1:N with InventoryLot

#### MarketSnapshot
- **Purpose**: Cached pricing data from Discogs/eBay for each release
- **Fields**:
  - `id` (CUID)
  - `releaseId` (FK)
  - `source` ("discogs" | "ebay")
  - `statLow`, `statMedian`, `statHigh` (nullable floats)
  - `fetchedAt`, `createdAt`, `updatedAt`
- **Indexes**: (releaseId, source) unique constraint, releaseId, source, fetchedAt
- **Relationships**:
  - N:1 with Release (cascade delete)

#### ConditionTier
- **Purpose**: Reference data for vinyl condition grades (immutable)
- **Fields**:
  - `id` (CUID)
  - `name` unique ("Mint", "NM", "VG+", "VG", "VG-", "G")
  - `order` unique (1-6 for sorting)
  - `mediaAdjustment`, `sleeveAdjustment` (float multipliers)
  - `createdAt`, `updatedAt`
- **Indexes**: name, order
- **Relationships**: None (read-only reference table)

#### PricingPolicy
- **Purpose**: Admin-configurable rules for calculating buy/sell prices
- **Fields**:
  - `id` (CUID)
  - `name`, `description`
  - `scope` ("global" | "genre" | "release")
  - `scopeValue` (genre name or release_id if scope-specific)
  - **Buy Formula**: `buyMarketSource`, `buyMarketStat`, `buyPercentage`, `buyMinCap`, `buyMaxCap`, `offerExpiryDays`
  - **Sell Formula**: `sellMarketSource`, `sellMarketStat`, `sellPercentage`, `sellMinCap`, `sellMaxCap`
  - **Condition Curve**: `applyConditionAdjustment`, `mediaWeight`, `sleeveWeight`
  - **Misc**: `roundingIncrement`, `requiresManualReview`, `profitMarginTarget`, `version`, `isActive`
  - `createdAt`, `updatedAt`
- **Indexes**: (scope, scopeValue), isActive
- **Relationships**: None (reference table)

#### SellerSubmission
- **Purpose**: Incoming offers from sellers to buy records
- **Fields**:
  - `id` (CUID)
  - `submissionNumber` unique (human-readable ID)
  - `sellerEmail`, `sellerPhone`
  - `status` ("pending_review" | "accepted" | "rejected" | "counter_offered" | "payment_sent" | "expired")
  - `notes`, `photosUrl` (JSON array)
  - `expectedPayout`, `actualPayout`
  - `createdAt`, `updatedAt`, `expiresAt`
- **Indexes**: status, sellerEmail, createdAt, expiresAt
- **Relationships**:
  - 1:N with SubmissionItem (cascade delete)

#### SubmissionItem
- **Purpose**: Line items in a seller submission
- **Fields**:
  - `id` (CUID)
  - `submissionId` (FK)
  - `releaseId` (FK)
  - `quantity`, `sellerConditionMedia`, `sellerConditionSleeve`
  - `autoOfferPrice`, `itemNotes`
  - `status` ("pending" | "accepted" | "rejected" | "counter_offered" | "received_and_inspected" | "finalized")
  - `finalConditionMedia`, `finalConditionSleeve`, `finalOfferPrice`
  - `createdAt`, `updatedAt`
- **Indexes**: submissionId, releaseId, status
- **Relationships**:
  - N:1 with SellerSubmission (cascade delete)
  - N:1 with Release (restrict delete)

#### InventoryLot
- **Purpose**: Inventory ready for sale on storefront
- **Fields**:
  - `id` (CUID)
  - `lotNumber` unique (human-readable ID)
  - `releaseId` (FK)
  - `conditionMedia`, `conditionSleeve`
  - `costBasis`, `listPrice`
  - `channel` ("web" | "store_walkIn" | etc.)
  - `status` ("draft" | "live" | "reserved" | "sold" | "returned" | "damaged")
  - `quantity`, `availableQuantity`
  - `internalNotes`
  - `createdAt`, `updatedAt`, `listedAt`
- **Indexes**: releaseId, status, channel, listPrice
- **Relationships**:
  - N:1 with Release (restrict delete)

## Setup Instructions

### Prerequisites

- Node.js 18+ or higher
- PostgreSQL 14+
- npm or yarn

### 1. Database Configuration

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/vinyl_catalog"
```

Ensure PostgreSQL is running and the database exists:

```bash
createdb vinyl_catalog
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Run Migrations

First time setup:

```bash
npm run db:migrate:dev
```

This will:
- Create all tables with indexes and constraints
- Apply any pending migrations
- Allow you to name the first migration (e.g., "init")

For production deployments:

```bash
npm run db:migrate
```

### 5. Seed Reference Data

```bash
npm run db:seed
```

This will:
- Create all 6 condition tiers (Mint, NM, VG+, VG, VG-, G)
- Create default global pricing policy
- Create 3 alternative pricing policies for testing
- Create 4 sample releases for testing

## Migration Workflow

### Creating New Migrations

After modifying `prisma/schema.prisma`:

```bash
npm run db:migrate:dev
```

You'll be prompted to name the migration, e.g.:

```
✔ Enter a name for this migration: add_discount_field
```

This creates a new migration file in `prisma/migrations/{timestamp}-{name}/migration.sql`.

### Reviewing Migrations

View all applied migrations:

```bash
ls prisma/migrations/
```

Each migration folder contains:
- `migration.sql` - The actual SQL executed
- `migration_lock.toml` - Lock file (do not edit)

### Reverting Migrations (Development Only)

```bash
npm run db:migrate:dev
# Select "Reset" when prompted (only available in dev mode)
```

This resets the database to a blank state and re-applies all migrations.

## Data Model Notes

### Condition Tiers

The system uses 6 standard vinyl condition grades:
1. **Mint (M)**: Unplayed, still sealed. Adjustment: 115%
2. **Near Mint (NM)**: Barely played. Adjustment: 100% (baseline)
3. **Very Good Plus (VG+)**: Minimal signs of play. Adjustment: 85%
4. **Very Good (VG)**: Surface noise and light scratches. Adjustment: 60%
5. **Very Good Minus (VG-)**: More obvious signs of play. Adjustment: 45%
6. **Good (G)**: Heavy wear but still plays. Adjustment: 30%

Each condition has separate adjustments for media (vinyl) and sleeve (packaging).

### Pricing Formula

For **buy offers**:
```
adjusted_offer = market_stat * buy_percentage * condition_adjustment
rounded_offer = round_to_nearest(adjusted_offer, rounding_increment)
final_offer = clamp(rounded_offer, buy_min_cap, buy_max_cap)
```

For **sell prices**:
```
adjusted_list = market_stat * sell_percentage * condition_adjustment
rounded_list = round_to_nearest(adjusted_list, rounding_increment)
final_list = clamp(rounded_list, sell_min_cap, sell_max_cap)
```

Condition adjustment combines media and sleeve:
```
adjustment = (media_tier * media_weight) + (sleeve_tier * sleeve_weight)
```

### Policy Versioning

Each pricing policy has a `version` field to track history. When a policy is modified:
1. Keep the existing record with its version number
2. Create a new record with `version + 1`
3. Log which version was used for each quote calculation (Platform-003 responsibility)

## Querying the Database

### Prisma Studio (GUI)

```bash
npm run db:studio
```

Opens a web interface to browse and edit all data.

### Direct Queries

Examples using Prisma Client (see `src/` for implementation):

```typescript
// Get all releases by genre
const releases = await prisma.release.findMany({
  where: { genre: 'Jazz' }
});

// Get active pricing policies
const policies = await prisma.pricingPolicy.findMany({
  where: { isActive: true }
});

// Get pending submissions with items
const submissions = await prisma.sellerSubmission.findMany({
  where: { status: 'pending_review' },
  include: { items: true }
});
```

## Backup & Recovery

### Backup PostgreSQL

```bash
pg_dump vinyl_catalog > backup.sql
```

### Restore PostgreSQL

```bash
createdb vinyl_catalog_restored
psql vinyl_catalog_restored < backup.sql
```

## Testing

See `TESTING.md` for how to set up test databases and run the test suite.

## Troubleshooting

### Migration Issues

**Error: "PrismaClientInitializationError"**
- Ensure DATABASE_URL is correct and PostgreSQL is running
- Run `npm run db:migrate:dev` to check connection

**Error: "Migration already applied"**
- Prisma's migration lock prevents duplicate execution
- Check that you're on the same database

### Seeding Issues

**Error: "Unique constraint violated"**
- The seed data may have already been applied
- Reset the database: `npm run db:migrate:dev` and select "Reset"

## Next Steps

- Implement CRUD services (Platform-002 tasks 4-5)
- Build pricing engine to use market snapshots (Platform-003)
- Create seller submission and admin intake flows (Platform-004, Platform-005)
