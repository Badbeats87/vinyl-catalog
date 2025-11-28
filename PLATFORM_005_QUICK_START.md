# Platform-005 Quick Start Guide

## Overview

Platform-005 provides a complete admin interface for managing seller submissions. This guide shows how to use the APIs in your application.

## Basic Usage

### 1. Import the Admin Routes

```typescript
import * as adminRoutes from './api/admin-routes';
import * as adminSubmissions from './services/admin-submissions';
import * as inventoryMgmt from './services/inventory-management';
```

### 2. List Submissions

```typescript
// List all pending submissions
const result = await adminRoutes.listSubmissions(
  'pending_review',  // status
  undefined,         // sellerEmail
  undefined,         // startDate
  undefined,         // endDate
  undefined,         // minValue
  undefined,         // maxValue
  20,                // limit
  0                  // offset
);

if (result.success) {
  console.log('Submissions:', result.data.submissions);
  console.log('Total:', result.data.total);
}
```

### 3. Get Submission Detail

```typescript
const detail = await adminRoutes.getSubmissionDetail('sub_123');

if (detail.success) {
  const submission = detail.data;
  console.log('Submission Number:', submission.submissionNumber);
  console.log('Items:', submission.items);
  console.log('History:', submission.history);
}
```

### 4. Accept an Item

```typescript
const result = await adminRoutes.acceptItem({
  submissionItemId: 'item_456',
  finalConditionMedia: 'NM',
  finalConditionSleeve: 'NM',
  finalOfferPrice: 25.00,
  adminNotes: 'Item in excellent condition'
});

if (result.success) {
  console.log('Item accepted successfully');
}
```

### 5. Send Counter-Offer

```typescript
const result = await adminRoutes.counterOffer({
  submissionItemId: 'item_789',
  newPrice: 18.50,
  adminNotes: 'Market rate adjusted based on current trends'
});

if (result.success) {
  console.log('Counter-offer sent, seller notified via email');
}
```

### 6. Inspect Item After Receipt

```typescript
const result = await adminRoutes.inspectItem({
  submissionItemId: 'item_100',
  finalConditionMedia: 'VG+',
  finalConditionSleeve: 'VG',
  adminNotes: 'Minor crease on sleeve, media still excellent'
});

if (result.success) {
  console.log('Item inspection recorded');
}
```

### 7. Finalize Item to Inventory

```typescript
const result = await adminRoutes.finalizeItem('item_100');

if (result.success) {
  console.log('Item finalized, lot created:', result.data.lotNumber);
  // Example lot number: LOT-20251128-ABC12
}
```

### 8. Accept All Items at Once

```typescript
const result = await adminRoutes.acceptAllItems({
  submissionId: 'sub_123',
  adminNotes: 'Batch approved - all items in good condition'
});

if (result.success) {
  console.log(`Accepted ${result.data.acceptedCount} items`);
}
```

### 9. Get Dashboard Metrics

```typescript
const metrics = await adminRoutes.getSubmissionMetrics();

if (metrics.success) {
  const data = metrics.data;
  console.log('Total submissions:', data.totalSubmissions);
  console.log('By status:', data.submissionsByStatus);
  console.log('Total expected payout:', data.totalExpectedPayout);
}
```

### 10. Manage Inventory

#### List Inventory Lots
```typescript
const result = await adminRoutes.listInventory(
  'draft',   // status
  'web',     // channel
  undefined, // releaseId
  undefined, // minPrice
  undefined, // maxPrice
  20,        // limit
  0          // offset
);

if (result.success) {
  console.log('Inventory lots:', result.data.lots);
}
```

#### Update Inventory Lot
```typescript
const result = await adminRoutes.updateInventory({
  lotId: 'lot_123',
  status: 'live',
  listPrice: 29.99,
  internalNotes: 'Listed for sale on website'
});

if (result.success) {
  console.log('Lot updated successfully');
}
```

## Advanced Workflows

### Complete Admin Workflow

```typescript
// 1. Get pending submissions
const subs = await adminRoutes.listSubmissions('pending_review');

// 2. Process each submission
for (const submission of subs.data.submissions) {
  // 3. Get detail
  const detail = await adminRoutes.getSubmissionDetail(submission.id);

  // 4. Process each item
  for (const item of detail.data.items) {
    if (item.autoOfferPrice > 25) {
      // Accept high-value items
      await adminRoutes.acceptItem({
        submissionItemId: item.id
      });
    } else if (item.autoOfferPrice > 10) {
      // Counter-offer mid-range items
      await adminRoutes.counterOffer({
        submissionItemId: item.id,
        newPrice: item.autoOfferPrice * 1.1 // 10% increase
      });
    } else {
      // Reject low-value items
      await adminRoutes.rejectItem({
        submissionItemId: item.id,
        adminNotes: 'Below minimum threshold'
      });
    }
  }
}
```

### Counter-Offer with Seller Response

```typescript
// 1. Send counter-offer
await adminRoutes.counterOffer({
  submissionItemId: 'item_123',
  newPrice: 20.00,
  adminNotes: 'Adjusted to market rate'
});

// 2. Wait for seller response (from seller API)
// 3. When seller responds, record it
await adminRoutes.recordCounterOfferResponse('item_123', 'accepted');

// 4. Now item is in 'accepted' status
// 5. Later, inspect the item
await adminRoutes.inspectItem({
  submissionItemId: 'item_123',
  finalConditionMedia: 'NM',
  finalConditionSleeve: 'NM'
});

// 6. Finalize to inventory
const { lotNumber } = await adminRoutes.finalizeItem('item_123');
console.log('Created inventory lot:', lotNumber);
```

### Batch Processing by Value

```typescript
// Get high-value submissions for review
const highValue = await adminRoutes.listSubmissions(
  'pending_review',
  undefined,
  undefined,
  undefined,
  100,  // minValue
  1000, // maxValue
  50
);

// Get low-value for quick batch processing
const lowValue = await adminRoutes.listSubmissions(
  'pending_review',
  undefined,
  undefined,
  undefined,
  0,    // minValue
  20,   // maxValue
  50
);

// Batch accept low-value items
for (const sub of lowValue.data.submissions) {
  await adminRoutes.acceptAllItems({
    submissionId: sub.id,
    adminNotes: 'Low-value batch auto-approved'
  });
}

// Flag high-value for manual review
for (const sub of highValue.data.submissions) {
  console.log(`HIGH VALUE SUBMISSION: ${sub.submissionNumber} - $${sub.expectedPayout}`);
}
```

## Data Structure Reference

### SubmissionSummary (from list)
```typescript
{
  id: string;                  // Internal ID
  submissionNumber: string;    // Human-readable (SUB-xxx)
  sellerEmail: string;
  sellerPhone?: string;
  status: string;              // pending_review, accepted, rejected, etc.
  expectedPayout: number;
  actualPayout?: number;
  itemCount: number;           // How many items
  createdAt: Date;
  expiresAt: Date;
}
```

### SubmissionDetail (from get detail)
```typescript
{
  id: string;
  submissionNumber: string;
  sellerEmail: string;
  sellerPhone?: string;
  status: string;
  expectedPayout: number;
  actualPayout?: number;
  notes?: string;
  createdAt: Date;
  expiresAt: Date;

  items: [{
    id: string;
    releaseId: string;
    title: string;
    artist: string;
    quantity: number;
    sellerConditionMedia: string;
    sellerConditionSleeve: string;
    autoOfferPrice: number;
    finalOfferPrice?: number;
    finalConditionMedia?: string;
    finalConditionSleeve?: string;
    status: string;              // pending, accepted, rejected, counter_offered, etc.
    itemNotes?: string;
  }];

  history: [{
    id: string;
    actionType: string;          // accepted, rejected, counter_offered, etc.
    adminNotes?: string;
    adjustedPrice?: number;
    sellerResponse?: string;      // pending, accepted, rejected
    createdAt: Date;
  }];
}
```

### InventoryLot
```typescript
{
  id: string;
  lotNumber: string;            // LOT-YYYYMMDD-XXXXX
  release: {
    id: string;
    title: string;
    artist: string;
    barcode?: string;
  };
  conditionMedia: string;
  conditionSleeve: string;
  costBasis: number;            // What we paid
  listPrice: number;            // Selling price
  status: string;               // draft, live, reserved, sold, etc.
  quantity: number;
  availableQuantity: number;
  channel: string;              // web, store_walkIn, etc.
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  listedAt?: Date;              // When went live
}
```

## Error Handling

All responses follow this format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

Example error handling:

```typescript
const result = await adminRoutes.acceptItem({...});

if (!result.success) {
  // Handle error
  console.error('Error code:', result.error?.code);
  console.error('Error message:', result.error?.message);

  switch (result.error?.code) {
    case 'ACCEPT_ITEM_ERROR':
      // Handle accept error
      break;
    case 'VALIDATION_ERROR':
      // Handle validation error
      break;
    default:
      console.error('Unknown error');
  }
}
```

## Common Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| SUBMISSION_NOT_FOUND | Submission doesn't exist | Check submission ID |
| ACCEPT_ITEM_ERROR | Can't accept item in this state | Check item status |
| COUNTER_OFFER_ERROR | Can't counter-offer | Item must be pending |
| INSPECT_ITEM_ERROR | Can't inspect | Item must be accepted |
| FINALIZE_ITEM_ERROR | Can't finalize | Item must be received_and_inspected |
| LOT_NOT_FOUND | Inventory lot not found | Check lot ID/number |
| UPDATE_INVENTORY_ERROR | Can't update lot | Check field validation |

## Integration with Express

```typescript
import express from 'express';
import * as adminRoutes from './api/admin-routes';

const app = express();
app.use(express.json());

// Admin submissions endpoints
app.get('/api/admin/submissions', async (req, res) => {
  const result = await adminRoutes.listSubmissions(
    req.query.status as string,
    req.query.sellerEmail as string,
    req.query.startDate as string,
    req.query.endDate as string,
    req.query.minValue ? Number(req.query.minValue) : undefined,
    req.query.maxValue ? Number(req.query.maxValue) : undefined,
    req.query.limit ? Number(req.query.limit) : 20,
    req.query.offset ? Number(req.query.offset) : 0
  );
  res.json(result);
});

app.get('/api/admin/submissions/:submissionId', async (req, res) => {
  const result = await adminRoutes.getSubmissionDetail(req.params.submissionId);
  res.json(result);
});

app.post('/api/admin/submissions/items/accept', async (req, res) => {
  const result = await adminRoutes.acceptItem(req.body);
  res.json(result);
});

// ... more routes
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import * as adminSubmissions from '../services/admin-submissions';

describe('Admin Submissions', () => {
  it('should list submissions with filters', async () => {
    const result = await adminSubmissions.listAdminSubmissions({
      status: 'pending_review',
      limit: 20
    });

    expect(result.submissions).toBeDefined();
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('should accept a submission item', async () => {
    // Test would need mock data
    const result = await adminSubmissions.acceptSubmissionItem({
      submissionItemId: 'test_item_id',
      finalOfferPrice: 25.00
    });

    expect(result).toBeDefined();
  });
});
```

## Next Steps

1. **Integrate with Express** - Mount routes in HTTP server
2. **Add Authentication** - Add auth middleware to protect admin routes
3. **Build UI** - Create React/Vue components for admin dashboard
4. **Write Tests** - Add unit and integration tests
5. **Deploy** - Deploy to production with monitoring

See `PLATFORM_005_ADMIN_GUIDE.md` for comprehensive API documentation.
