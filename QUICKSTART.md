# Quick Start Guide - Platform-002

Get the vinyl catalog database up and running in 5 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (running)
- npm or yarn

## 5-Minute Setup

### Step 1: Install Dependencies (1 min)

```bash
npm install
```

### Step 2: Configure Database (1 min)

```bash
# Copy environment template
cp .env.example .env

# Create database
createdb vinyl_catalog
```

Edit `.env` and update `DATABASE_URL`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/vinyl_catalog"
```

### Step 3: Set Up Database (2 min)

```bash
# Create schema
npm run db:migrate:dev

# Seed with sample data
npm run db:seed
```

When prompted during migration, name it `init`.

### Step 4: Verify Installation (1 min)

```bash
# Test with admin CLI
npm run admin

# Or run tests
npm test
```

✅ **Done!** Your catalog database is ready.

## Common Commands

```bash
# Admin interface (create/edit releases & policies)
npm run admin

# View database (GUI)
npm run db:studio

# Run tests
npm test

# Check test coverage
npm run test:coverage

# Generate Prisma client
npm run db:generate

# Build TypeScript
npm build
```

## What You Have

- ✅ 8 database tables with proper relationships
- ✅ 6 condition tiers (Mint, NM, VG+, VG, VG-, G)
- ✅ 4 sample pricing policies
- ✅ 4 sample vinyl records
- ✅ CRUD services for releases & policies
- ✅ Interactive admin CLI tool
- ✅ Full test suite (30+ tests)

## Example: Create a Release via CLI

```bash
npm run admin

# Select: 1 (Manage Releases)
# Select: 1 (Create Release)
# Fill in: Title, Artist, Label, etc.
# ✓ Release created!
```

## Example: Create a Pricing Policy via CLI

```bash
npm run admin

# Select: 2 (Manage Pricing Policies)
# Select: 1 (Create Policy)
# Fill in: Name, Scope, Buy %, Sell %, etc.
# ✓ Policy created!
```

## Example: Run Tests

```bash
npm test

# Output:
# ✓ src/services/__tests__/releases.test.ts (12)
# ✓ src/services/__tests__/pricing-policies.test.ts (18)
# Test Files  2 passed (2)
#     Tests  30 passed (30)
```

## Next Steps

### For Development

1. Read `DATABASE.md` for schema details
2. Read `TESTING.md` for how to write tests
3. Explore `src/services/` for CRUD functions
4. Use `npm run db:studio` to browse data

### For API Development

Platform-003 will add:
- Discogs/eBay price fetching
- Pricing calculation engine
- Quote API endpoint

### For Admin Console

Admin CLI (`npm run admin`) is a basic prototype. Next phases will add:
- Web-based admin dashboard
- Submission queue management
- Inventory management UI

## Troubleshooting

**"Cannot connect to database"**
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run: `createdb vinyl_catalog`

**"Migration already applied"**
- Database already exists with migrations
- Run: `npm run db:migrate` to catch up

**"Tests fail with connection error"**
- Create test database: `createdb vinyl_catalog_test`
- See TESTING.md for .env.test setup

**"Port 5432 already in use"**
- PostgreSQL is already running (good!)
- Or change DATABASE_URL to different port

## File Structure

```
src/
├── db/
│   └── seed.ts           # Sample data script
├── services/
│   ├── releases.ts       # Release CRUD (10 functions)
│   ├── pricing-policies.ts # Policy CRUD (12 functions)
│   └── __tests__/        # Test suites
├── cli/
│   └── admin.ts          # Interactive CLI tool
└── index.ts              # Placeholder for API

prisma/
├── schema.prisma         # Database schema (8 models)
└── migrations/           # Migration history
```

## Key Concepts

### Releases
Core vinyl records in the catalog. Search by artist/title/barcode.

### Pricing Policies
Rules for calculating buy offers and sell prices. Can be global, genre-specific, or release-specific.

### Condition Tiers
Standard vinyl grades: Mint → NM → VG+ → VG → VG- → Good

### Seller Submissions
Incoming offers from sellers. Line items reference releases.

### Inventory Lots
Records ready for storefront. Track cost basis, list price, status.

## Example: Programmatic Use

```typescript
import { createRelease, searchReleases } from './src/services/releases.js';
import { createPricingPolicy, getPolicyForGenre } from './src/services/pricing-policies.js';

// Create a release
const release = await createRelease({
  title: 'Dark Side of the Moon',
  artist: 'Pink Floyd',
  genre: 'Rock',
});

// Search releases
const results = await searchReleases('Pink Floyd');

// Create a pricing policy
const policy = await createPricingPolicy({
  name: 'Rock Collection Policy',
  scope: 'genre',
  scopeValue: 'Rock',
  buyPercentage: 0.60,
  sellPercentage: 1.30,
});

// Get policy for a genre
const rockPolicy = await getPolicyForGenre('Rock');
```

## More Information

- `DATABASE.md` - Complete database documentation
- `TESTING.md` - Testing guide and best practices
- `IMPLEMENTATION_SUMMARY.md` - Full implementation details
- `prisma/schema.prisma` - Schema definition
- `src/services/` - Service function signatures

---

**Ready to build!** Start with the admin CLI (`npm run admin`) or dive into the code.
