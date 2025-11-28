# Platform-005: Admin Submission Queue & Intake

## Overview

Platform-005 implements a comprehensive admin interface for managing seller submissions, from initial review through inventory creation. This guide covers the architecture, API endpoints, and implementation details.

## Architecture

### Database Schema

#### SubmissionHistory Model
New audit log model tracking all admin actions on submissions:

```prisma
model SubmissionHistory {
  id              String   @id @default(cuid())
  submissionId    String
  submission      SellerSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  submissionItemId String?
  submissionItem  SubmissionItem? @relation(fields: [submissionItemId], references: [id], onDelete: Cascade)

  actionType      String   @db.VarChar(50)  // "accepted", "rejected", "counter_offered", "received_and_inspected", "finalized"
  adminNotes      String?  @db.Text

  // For condition updates
  finalConditionMedia String? @db.VarChar(50)
  finalConditionSleeve String? @db.VarChar(50)

  // For price adjustments
  adjustedPrice   Float?

  // For counter-offer tracking
  sellerResponse  String?  @db.VarChar(50)  // "pending", "accepted", "rejected"
  sellerResponseAt DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Service Layer

#### admin-submissions.ts
Core service handling all admin operations:

**Key Functions:**

1. **listAdminSubmissions(filters)** - List submissions with filtering
   - Filters: status, sellerEmail, startDate, endDate, minValue, maxValue
   - Returns: paginated list with summary metrics

2. **getAdminSubmissionDetail(submissionId)** - Get full submission detail
   - Includes: items with conditions, history of all actions
   - Returns: complete submission data for admin UI

3. **acceptSubmissionItem(input)** - Accept a single item
   - Updates item status to "accepted"
   - Optionally updates condition and price
   - Creates audit history entry

4. **rejectSubmissionItem(input)** - Reject a single item
   - Updates item status to "rejected"
   - Logs rejection reason

5. **counterOfferSubmissionItem(input)** - Send counter-offer
   - Updates item status to "counter_offered"
   - Sets new price
   - Sends email notification to seller

6. **inspectSubmissionItem(input)** - Mark item as received and inspected
   - Only works on "accepted" items
   - Updates final condition after physical inspection
   - Creates inspection history

7. **finalizeSubmissionItem(input)** - Complete inspection and create inventory
   - Updates item status to "finalized"
   - Creates InventoryLot entry with cost basis
   - Returns lot number

8. **acceptAllSubmissionItems(input)** - Accept all pending items at once

9. **rejectAllSubmissionItems(input)** - Reject all pending items at once

10. **getAdminSubmissionMetrics()** - Dashboard metrics
    - Total submissions by status
    - Total expected/actual payout
    - Item status breakdown

11. **recordSellerCounterOfferResponse(itemId, response)** - Record seller's counter-offer decision
    - Updates history with seller response

#### inventory-management.ts
Service for inventory lot management:

**Key Functions:**

1. **createInventoryLot(input)** - Create new inventory lot
   - Generates unique lot number (LOT-YYYYMMDD-XXXXX)
   - Sets initial status to "draft"
   - Returns lot number

2. **createInventoryLotFromSubmissionItem(item)** - Create lot from finalized submission
   - Uses finalOfferPrice as costBasis
   - Sets condition from final inspection
   - Links to original submission

3. **listInventoryLots(filters)** - List inventory with filtering
   - Filters: status, channel, releaseId, price range
   - Returns: paginated list

4. **getInventoryLot(identifier, byLotNumber)** - Get lot details
   - Can look up by ID or lot number

5. **updateInventoryLot(lotId, updates)** - Update lot fields
   - Can update: listPrice, status, internalNotes, channel
   - Automatically sets listedAt when transitioning to "live"

6. **getInventoryMetrics()** - Dashboard metrics
   - Total lots by status
   - Total inventory value
   - Total cost basis

### API Routes

#### admin-routes.ts
HTTP-style API wrapper for admin operations:

**Response Format (all endpoints):**
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

## API Endpoints

### Submission Management

#### 1. List Submissions
```
GET /admin/submissions
Query Parameters:
  - status: "pending_review" | "accepted" | "rejected" | "counter_offered" | "payment_sent" | "expired"
  - sellerEmail: string (partial match)
  - startDate: ISO date string
  - endDate: ISO date string
  - minValue: number
  - maxValue: number
  - limit: number (default: 20, max: 100)
  - offset: number (default: 0)

Response:
{
  success: true,
  data: {
    submissions: [{
      id: string,
      submissionNumber: string,
      sellerEmail: string,
      sellerPhone?: string,
      status: string,
      expectedPayout: number,
      actualPayout?: number,
      itemCount: number,
      createdAt: ISO datetime,
      expiresAt: ISO datetime
    }],
    total: number
  }
}
```

#### 2. Get Submission Detail
```
GET /admin/submissions/:submissionId

Response:
{
  success: true,
  data: {
    id: string,
    submissionNumber: string,
    sellerEmail: string,
    sellerPhone?: string,
    status: string,
    expectedPayout: number,
    actualPayout?: number,
    notes?: string,
    createdAt: ISO datetime,
    expiresAt: ISO datetime,
    items: [{
      id: string,
      releaseId: string,
      title: string,
      artist: string,
      quantity: number,
      sellerConditionMedia: string,
      sellerConditionSleeve: string,
      autoOfferPrice: number,
      finalOfferPrice?: number,
      finalConditionMedia?: string,
      finalConditionSleeve?: string,
      status: string,
      itemNotes?: string
    }],
    history: [{
      id: string,
      actionType: string,
      adminNotes?: string,
      adjustedPrice?: number,
      sellerResponse?: string,
      createdAt: ISO datetime
    }]
  }
}
```

#### 3. Accept Submission Item
```
POST /admin/submissions/items/accept

Request Body:
{
  submissionItemId: string,
  finalConditionMedia?: string,
  finalConditionSleeve?: string,
  finalOfferPrice?: number,
  adminNotes?: string
}

Response:
{
  success: true,
  data: null
}
```

#### 4. Reject Submission Item
```
POST /admin/submissions/items/reject

Request Body:
{
  submissionItemId: string,
  adminNotes?: string
}

Response:
{
  success: true,
  data: null
}
```

#### 5. Counter-Offer Submission Item
```
POST /admin/submissions/items/counter-offer

Request Body:
{
  submissionItemId: string,
  newPrice: number,
  adminNotes?: string
}

Response:
{
  success: true,
  data: null
}
```

#### 6. Inspect Submission Item
```
POST /admin/submissions/items/inspect

Request Body:
{
  submissionItemId: string,
  finalConditionMedia: string,
  finalConditionSleeve: string,
  adminNotes?: string
}

Response:
{
  success: true,
  data: null
}
```

#### 7. Finalize Submission Item
```
POST /admin/submissions/items/finalize

Request Body:
{
  submissionItemId: string
}

Response:
{
  success: true,
  data: {
    lotNumber: string
  }
}
```

#### 8. Accept All Items in Submission
```
POST /admin/submissions/accept-all

Request Body:
{
  submissionId: string,
  adminNotes?: string
}

Response:
{
  success: true,
  data: {
    acceptedCount: number
  }
}
```

#### 9. Reject All Items in Submission
```
POST /admin/submissions/reject-all

Request Body:
{
  submissionId: string,
  adminNotes?: string
}

Response:
{
  success: true,
  data: {
    rejectedCount: number
  }
}
```

#### 10. Get Submission Metrics
```
GET /admin/submissions/metrics

Response:
{
  success: true,
  data: {
    totalSubmissions: number,
    submissionsByStatus: [{
      status: string,
      count: number
    }],
    totalExpectedPayout: number,
    itemsByStatus: [{
      status: string,
      count: number
    }]
  }
}
```

#### 11. Record Counter-Offer Response
```
POST /admin/submissions/items/counter-offer-response

Request Body:
{
  submissionItemId: string,
  response: "accepted" | "rejected"
}

Response:
{
  success: true,
  data: null
}
```

### Inventory Management

#### 12. List Inventory Lots
```
GET /admin/inventory
Query Parameters:
  - status: "draft" | "live" | "reserved" | "sold" | "returned" | "damaged"
  - channel: string
  - releaseId: string
  - minPrice: number
  - maxPrice: number
  - limit: number (default: 20, max: 100)
  - offset: number (default: 0)

Response:
{
  success: true,
  data: {
    lots: [{
      id: string,
      lotNumber: string,
      release: {
        id: string,
        title: string,
        artist: string,
        barcode?: string
      },
      conditionMedia: string,
      conditionSleeve: string,
      costBasis: number,
      listPrice: number,
      status: string,
      quantity: number,
      availableQuantity: number,
      channel: string,
      createdAt: ISO datetime,
      listedAt?: ISO datetime
    }],
    total: number
  }
}
```

#### 13. Get Inventory Lot Detail
```
GET /admin/inventory/:identifier?byLotNumber=true|false

Response:
{
  success: true,
  data: {
    id: string,
    lotNumber: string,
    release: {...},
    conditionMedia: string,
    conditionSleeve: string,
    costBasis: number,
    listPrice: number,
    status: string,
    quantity: number,
    availableQuantity: number,
    channel: string,
    internalNotes?: string,
    createdAt: ISO datetime,
    updatedAt: ISO datetime,
    listedAt?: ISO datetime
  }
}
```

#### 14. Update Inventory Lot
```
PUT /admin/inventory/:lotId

Request Body:
{
  listPrice?: number,
  status?: string,
  internalNotes?: string,
  channel?: string
}

Response:
{
  success: true,
  data: null
}
```

#### 15. Get Inventory Metrics
```
GET /admin/inventory/metrics

Response:
{
  success: true,
  data: {
    totalLots: number,
    lotsByStatus: [{
      status: string,
      count: number
    }],
    totalInventoryValue: number,
    totalCostBasis: number
  }
}
```

## Submission Workflow

### Complete Admin Workflow

```
1. PENDING_REVIEW
   └─> Admin views submission in dashboard
   └─> Admin opens detail view to see all items

2. INITIAL REVIEW
   ├─> ACCEPT_ALL: All items → "accepted" status
   ├─> REJECT_ALL: All items → "rejected" status
   └─> MIXED: Individual item actions:
       ├─> Accept Item: Updates condition/price if needed
       ├─> Reject Item: Item → "rejected"
       └─> Counter-Offer: Item → "counter_offered", seller gets email
           └─> Seller responds
               ├─> Accepted: Item → "accepted"
               └─> Rejected: Item → "rejected"

3. INSPECTION
   ├─> For accepted items
   ├─> Admin inspects physical items
   └─> Inspect Item: Update final condition, item → "received_and_inspected"

4. FINALIZATION
   ├─> For received/inspected items
   └─> Finalize Item: Item → "finalized", creates InventoryLot
       └─> Inventory lot created with:
           - costBasis = finalOfferPrice
           - status = "draft"
           - channel = "web"
           - condition = finalCondition

5. INVENTORY MANAGEMENT
   ├─> Update lot price/status as needed
   ├─> Transition to "live" when ready to sell
   └─> Track through sale cycle
```

## Audit Trail

Every admin action creates a SubmissionHistory entry:

```typescript
interface SubmissionHistory {
  actionType:
    | "accepted"               // Item accepted
    | "rejected"               // Item rejected
    | "counter_offered"        // Counter-offer sent
    | "received_and_inspected" // Item inspected after receipt
    | "finalized"              // Item finalized to inventory

  adminNotes?: string          // Optional notes
  adjustedPrice?: number       // If price was modified
  finalConditionMedia?: string // If condition was updated
  finalConditionSleeve?: string
  sellerResponse?: string      // "pending" | "accepted" | "rejected"
  sellerResponseAt?: DateTime
  createdAt: DateTime
}
```

## Email Notifications

### Automatic Emails Sent

1. **Counter-Offer Notification**
   - Triggered: When admin sends counter-offer
   - Recipient: Seller
   - Content: Item title, new price, total value
   - HTML template with prominent price display

## Implementation Status

### Completed
- [x] Database schema with SubmissionHistory model
- [x] Admin submissions service (filtering, CRUD)
- [x] Inventory management service
- [x] Counter-offer email notifications
- [x] API route handlers (15 endpoints)
- [x] Audit trail logging

### Pending
- [ ] Admin UI React components
- [ ] API HTTP server integration
- [ ] Authentication/authorization middleware
- [ ] Tests for all endpoints
- [ ] Rate limiting and throttling
- [ ] Integration tests with real data

## Usage Examples

### Example 1: Accept All Items
```typescript
const result = await acceptAllItems({
  submissionId: "sub_123",
  adminNotes: "All items checked and approved"
});

// Creates history entries for each item
// All items transition to "accepted" status
```

### Example 2: Counter-Offer Workflow
```typescript
// 1. Send counter-offer
await counterOffer({
  submissionItemId: "item_456",
  newPrice: 15.00,
  adminNotes: "Condition reflects market prices"
});

// 2. Seller receives email with counter-offer
// 3. Seller responds (handled separately)
// 4. Record response
await recordCounterOfferResponse("item_456", "accepted");

// Item status changes to "accepted"
// History entry updated with sellerResponseAt
```

### Example 3: Inspection to Inventory
```typescript
// 1. Item already accepted
// 2. Admin inspects item physically
await inspectItem({
  submissionItemId: "item_789",
  finalConditionMedia: "VG",
  finalConditionSleeve: "VG+",
  adminNotes: "Minor wear on sleeve, media near mint"
});

// 3. Item is "received_and_inspected"
// 4. Finalize to inventory
const { lotNumber } = await finalizeItem("item_789");

// Creates InventoryLot:
// - lotNumber: "LOT-20251128-ABC12"
// - costBasis: finalOfferPrice
// - conditionMedia: "VG"
// - conditionSleeve: "VG+"
```

## Next Steps

1. **Build Admin UI Components**
   - Dashboard with submission metrics
   - Submission list table with filtering
   - Submission detail view
   - Item action buttons (accept/reject/counter)
   - Inspection form
   - Inventory management UI

2. **API Server Integration**
   - Integrate routes into Express/HTTP server
   - Add authentication middleware
   - Add rate limiting

3. **Testing**
   - Unit tests for all services
   - Integration tests for API
   - E2E tests with UI

4. **Seller Response Handling**
   - API endpoint for sellers to respond to counter-offers
   - Email with response link/token
   - Status updates based on seller response
