# Testing Guide

## Overview

This project uses **Vitest** for unit and integration testing. Tests validate:
- Database migrations and schema integrity
- CRUD operations for releases and pricing policies
- Input validation and error handling
- Pricing formula correctness (in later phases)

## Setup

### 1. Install Testing Dependencies

Dependencies are included in `package.json`:
- **vitest**: Fast unit test framework
- **@vitest/coverage-v8**: Code coverage reporting

Already installed via `npm install`.

### 2. Configure Test Database

Tests use a separate PostgreSQL database to avoid affecting production data.

Create a `.env.test` file:

```bash
cp .env.example .env.test
```

Update `.env.test`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/vinyl_catalog_test"
NODE_ENV=test
```

Create the test database:

```bash
createdb vinyl_catalog_test
```

### 3. Run Migrations on Test Database

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/vinyl_catalog_test" npm run db:migrate:dev
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test src/services/__tests__/releases.test.ts
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage Report

```bash
npm run test:coverage
```

This generates a coverage report in `coverage/` directory.

## Test Structure

### Test Files

Tests are located alongside the services they test:

```
src/
├── services/
│   ├── releases.ts
│   ├── pricing-policies.ts
│   └── __tests__/
│       ├── releases.test.ts
│       └── pricing-policies.test.ts
```

### Test Anatomy

Each test file follows this pattern:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as serviceModule from '../service';

const prisma = new PrismaClient();

describe('Service Name', () => {
  // Setup
  beforeAll(async () => {
    // Initialize test data or database
  });

  // Cleanup
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Function Name', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = { /* test data */ };

      // Act
      const result = await serviceModule.functionName(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.field).toBe('expected value');
    });
  });
});
```

## Current Test Coverage

### Release Service Tests (`releases.test.ts`)

- ✓ Create release with required fields
- ✓ Create release with optional fields
- ✓ Retrieve release by ID
- ✓ Retrieve release by barcode
- ✓ Update release
- ✓ Delete release
- ✓ Search releases
- ✓ Get releases by genre
- ✓ Count total releases
- ✓ Get releases without pricing data

### Pricing Policy Service Tests (`pricing-policies.test.ts`)

- ✓ Create global policy
- ✓ Create genre-specific policy
- ✓ Create release-specific policy
- ✓ Validate weight constraints (media + sleeve = 1.0)
- ✓ Validate percentage ranges
- ✓ Validate required fields by scope
- ✓ Apply default weights
- ✓ Retrieve policy by ID
- ✓ Get default global policy
- ✓ Get policies by scope
- ✓ Get genre-specific policy (with fallback)
- ✓ Get release-specific policy (with fallback)
- ✓ Update policy (with version increment)
- ✓ Deactivate policy
- ✓ Count active policies
- ✓ Get policy history/versions
- ✓ Delete policy

## Writing New Tests

### Example: Test a New Release Service Function

```typescript
describe('getReleasesWithCondition', () => {
  it('should return releases with specific condition', async () => {
    // Arrange - create test data
    const release = await releaseService.createRelease({
      title: 'Test Album',
      artist: 'Test Artist',
    });

    // Create related inventory lot with condition
    await prisma.inventoryLot.create({
      data: {
        releaseId: release.id,
        conditionMedia: 'NM',
        conditionSleeve: 'VG+',
        costBasis: 10.0,
        listPrice: 25.0,
        channel: 'web',
        status: 'live',
      },
    });

    // Act
    const results = await releaseService.getReleasesWithCondition('NM');

    // Assert
    expect(results).toContainEqual(expect.objectContaining({
      id: release.id,
    }));
  });
});
```

### Best Practices for Tests

1. **Use descriptive test names** - explain what's being tested and expected outcome
2. **Follow AAA pattern** - Arrange, Act, Assert
3. **Test edge cases** - null values, empty arrays, invalid input
4. **Clean up after tests** - use `afterEach` or `afterAll` to clean database
5. **Use meaningful assertions** - `expect(result).toEqual(expected)` vs `expect(result).toBe(true)`
6. **Mock external dependencies** (when added) - don't call real APIs in tests
7. **Test validation** - ensure invalid input is rejected appropriately

## Validation Tests

### Release Validation

- Required fields (title, artist) must be provided
- Optional fields (label, genre, etc.) accept null/undefined
- Barcode should be unique (if enforced)
- Release year should be reasonable (1900-current year)

### Pricing Policy Validation

- Name must be provided and unique
- Scope must be one of: "global", "genre", "release"
- If scope is not "global", scopeValue must be provided
- mediaWeight + sleeveWeight must equal 1.0
- buyPercentage must be between 0.01 and 1.0
- sellPercentage must be between 1.0 and 3.0
- buyMinCap and buyMaxCap must be positive if provided
- sellMinCap and sellMaxCap must be positive if provided
- roundingIncrement must be positive (e.g., 0.25)

## Testing Database Migrations

### Test Migration Integrity

```typescript
describe('Database Migrations', () => {
  it('should create all required tables', async () => {
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    const tableNames = (tables as any[]).map(t => t.table_name);
    expect(tableNames).toContain('Release');
    expect(tableNames).toContain('PricingPolicy');
    expect(tableNames).toContain('SellerSubmission');
    // ... etc
  });

  it('should enforce foreign key constraints', async () => {
    // Try to create submission with invalid release_id
    try {
      await prisma.submissionItem.create({
        data: {
          submissionId: 'invalid-submission',
          releaseId: 'invalid-release-id',
          quantity: 1,
          sellerConditionMedia: 'NM',
          sellerConditionSleeve: 'NM',
          autoOfferPrice: 10.0,
        },
      });
      expect.fail('Should have thrown constraint error');
    } catch (error: any) {
      expect(error.code).toBe('P2003'); // Foreign key constraint
    }
  });
});
```

## Continuous Integration

When setting up CI/CD (GitHub Actions, etc.):

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: vinyl_catalog_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run db:migrate -- --skip-verify
      - run: npm test
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Troubleshooting Tests

### "Cannot find module" Errors

Ensure all imports use the correct relative paths:

```typescript
// Correct (with .js extension for ESM)
import * as releaseService from '../releases.js';

// Incorrect
import * as releaseService from '../releases';
```

### Database Connection Issues

- Verify `.env.test` has correct DATABASE_URL
- Ensure test database exists: `createdb vinyl_catalog_test`
- Check PostgreSQL is running: `psql --version`

### Test Timeouts

Increase timeout for slow tests:

```typescript
it('should handle slow operation', async () => {
  // ...
}, { timeout: 10000 }); // 10 second timeout
```

### Flaky Tests

Tests failing intermittently usually indicate:
- Database state not properly cleaned between tests
- Race conditions with async operations
- Timing-dependent assertions

Solutions:
- Use `beforeEach` / `afterEach` for thorough cleanup
- Await all async operations
- Avoid time-based assertions

## Next Steps

- Add integration tests for API endpoints (Platform-003)
- Add pricing formula validation tests (Platform-003)
- Add submission workflow tests (Platform-004, Platform-005)
- Set up CI/CD pipeline with GitHub Actions
- Achieve 80%+ code coverage target
