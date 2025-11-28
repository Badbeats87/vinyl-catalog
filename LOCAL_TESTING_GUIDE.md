# Local Testing Guide - End User Perspective

This guide shows how to test the entire platform locally as different user types (Seller, Admin, Buyer).

## Prerequisites

Make sure you have:
- Node.js 18+ installed
- PostgreSQL running locally
- The app built and running

## Setup

### 1. Install & Build

```bash
cd /Users/invision/site-oul
npm install
npm run build
```

### 2. Database Setup

```bash
# Create database (if not exists)
createdb vinyl_catalog

# Run migrations
npm run db:migrate:dev

# Seed with test data
npm run db:seed
```

### 3. Start the Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

---

## Testing Flow

### **Phase 1: Get Authentication Tokens**

Open your terminal and get tokens for each user type:

#### Admin Token
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "role": "admin"
  }' | jq -r '.token')

echo "Admin Token: $ADMIN_TOKEN"
```

#### Seller Token
```bash
SELLER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "role": "seller"
  }' | jq -r '.token')

echo "Seller Token: $SELLER_TOKEN"
```

#### Buyer Token
```bash
BUYER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "role": "buyer"
  }' | jq -r '.token')

echo "Buyer Token: $BUYER_TOKEN"
```

Save these tokens - you'll use them for the rest of testing.

---

## **Testing as a SELLER**

Sellers browse the catalog and submit records they want to sell.

### 1. Search the Catalog

Find records to sell:

```bash
curl -X GET "http://localhost:3000/api/seller/catalog?q=pink%20floyd" \
  -H "Authorization: Bearer $SELLER_TOKEN" | jq
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "releases": [
      {
        "id": "release-123",
        "title": "The Dark Side of the Moon",
        "artist": "Pink Floyd",
        "label": "Harvest",
        "catalogNumber": "SHVL 804",
        "releaseYear": 1973
      }
    ]
  }
}
```

### 2. Get Condition Options

See available condition grades:

```bash
curl -X GET http://localhost:3000/api/seller/conditions \
  -H "Authorization: Bearer $SELLER_TOKEN" | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conditions": [
      { "code": "M", "label": "Mint", "description": "Perfect condition" },
      { "code": "NM", "label": "Near Mint", "description": "Nearly perfect" },
      { "code": "VG+", "label": "Very Good Plus" },
      { "code": "VG", "label": "Very Good" },
      { "code": "VG-", "label": "Very Good Minus" },
      { "code": "G", "label": "Good" }
    ]
  }
}
```

### 3. Get Instant Quote

Get a price quote for a record:

```bash
curl -X POST http://localhost:3000/api/seller/quotes \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "releaseId": "release-123",
        "quantity": 1,
        "conditionMedia": "NM",
        "conditionSleeve": "VG+"
      }
    ]
  }' | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "releaseId": "release-123",
        "quantity": 1,
        "conditionMedia": "NM",
        "conditionSleeve": "VG+",
        "offerPrice": 18.50,
        "policyVersion": "default-v1",
        "expiresAt": "2024-12-05T12:00:00Z"
      }
    ],
    "totalOffer": 18.50
  }
}
```

### 4. Submit Records for Sale

Submit a batch of records:

```bash
curl -X POST http://localhost:3000/api/seller/submit \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "phone": "555-1234",
    "items": [
      {
        "releaseId": "release-123",
        "quantity": 1,
        "conditionMedia": "NM",
        "conditionSleeve": "VG+",
        "notes": "Original pressing, minor cover wear"
      }
    ]
  }' | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissionId": "sub-456",
    "submissionNumber": "SUB-2024-0001",
    "status": "pending_review",
    "items": [
      {
        "submissionItemId": "subitem-789",
        "releaseId": "release-123",
        "status": "pending_review",
        "offerPrice": 18.50
      }
    ],
    "totalOffer": 18.50,
    "createdAt": "2024-12-04T12:00:00Z"
  }
}
```

**Save the submission ID** - you'll use it to check status.

### 5. Check Submission Status

Track your submission:

```bash
# Using submission number from response above
curl -X GET "http://localhost:3000/api/seller/submission/SUB-2024-0001" \
  -H "Authorization: Bearer $SELLER_TOKEN" | jq
```

Or get all submissions:

```bash
curl -X GET "http://localhost:3000/api/seller/submissions?email=seller@example.com" \
  -H "Authorization: Bearer $SELLER_TOKEN" | jq
```

---

## **Testing as an ADMIN**

Admins review seller submissions, manage inventory, and set pricing.

### 1. View Submission Queue

See all seller submissions waiting for review:

```bash
curl -X GET "http://localhost:3000/api/admin/submissions?status=pending_review&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissions": [
      {
        "id": "sub-456",
        "submissionNumber": "SUB-2024-0001",
        "status": "pending_review",
        "sellerEmail": "seller@example.com",
        "totalValue": 18.50,
        "itemCount": 1,
        "createdAt": "2024-12-04T12:00:00Z"
      }
    ],
    "total": 1
  }
}
```

### 2. View Submission Details

See what the seller submitted:

```bash
curl -X GET "http://localhost:3000/api/admin/submissions/sub-456" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submission": {
      "id": "sub-456",
      "submissionNumber": "SUB-2024-0001",
      "sellerEmail": "seller@example.com",
      "items": [
        {
          "submissionItemId": "subitem-789",
          "release": {
            "id": "release-123",
            "title": "The Dark Side of the Moon",
            "artist": "Pink Floyd"
          },
          "quantity": 1,
          "conditionMedia": "NM",
          "conditionSleeve": "VG+",
          "offerPrice": 18.50,
          "status": "pending_review",
          "notes": "Original pressing, minor cover wear"
        }
      ]
    }
  }
}
```

### 3. Accept Submission Item

Approve an item for purchase:

```bash
curl -X POST http://localhost:3000/api/admin/submissions/item/accept \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionItemId": "subitem-789",
    "offerPrice": 18.50
  }' | jq
```

### 4. Counter Offer

Make a different offer:

```bash
curl -X POST http://localhost:3000/api/admin/submissions/item/counter-offer \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionItemId": "subitem-789",
    "counterPrice": 15.00,
    "counterReason": "Condition assessment: sleeve has more wear than listed"
  }' | jq
```

### 5. Reject Item

Decline an item:

```bash
curl -X POST http://localhost:3000/api/admin/submissions/item/reject \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionItemId": "subitem-789",
    "rejectionReason": "Item condition below acceptable standards"
  }' | jq
```

### 6. Inspect Item (After Physical Receipt)

When the item physically arrives, inspect it:

```bash
curl -X POST http://localhost:3000/api/admin/submissions/item/inspect \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionItemId": "subitem-789",
    "conditionMediaActual": "VG",
    "conditionSleeveActual": "VG",
    "notes": "Vinyl has hairline scratch; sleeve has 2-inch tear"
  }' | jq
```

### 7. Finalize Item (Create Inventory Lot)

Convert accepted item into inventory for sale:

```bash
curl -X POST http://localhost:3000/api/admin/submissions/item/finalize \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionItemId": "subitem-789",
    "costBasis": 18.50,
    "listPrice": 32.99,
    "channel": "web_submission"
  }' | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lot": {
      "lotId": "lot-999",
      "releaseId": "release-123",
      "status": "draft",
      "costBasis": 18.50,
      "listPrice": 32.99,
      "conditionMedia": "VG",
      "conditionSleeve": "VG"
    }
  }
}
```

**Save the lotId** - you'll use it for buyer testing.

### 8. View Inventory

See all inventory:

```bash
curl -X GET "http://localhost:3000/api/admin/inventory?status=draft&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### 9. Update Inventory

Mark inventory as "live" (available for sale):

```bash
curl -X PUT http://localhost:3000/api/admin/inventory \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lotId": "lot-999",
    "status": "live",
    "listPrice": 32.99,
    "description": "Original 1973 pressing. Vinyl: VG with light scratches. Sleeve: VG with minor wear."
  }' | jq
```

---

## **Testing as a BUYER**

Buyers browse the storefront and make purchases.

### 1. Browse Inventory

See all available records:

```bash
curl -X GET "http://localhost:3000/api/buyer/browse?limit=20" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lots": [
      {
        "lotId": "lot-999",
        "releaseId": "release-123",
        "title": "The Dark Side of the Moon",
        "artist": "Pink Floyd",
        "listPrice": 32.99,
        "conditionMedia": "VG",
        "conditionSleeve": "VG",
        "quantity": 1,
        "channel": "web_submission"
      }
    ],
    "total": 1
  }
}
```

### 2. Search Products

Find a specific record:

```bash
curl -X GET "http://localhost:3000/api/buyer/search?q=pink%20floyd" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq
```

### 3. View Product Details

See full product information:

```bash
curl -X GET "http://localhost:3000/api/buyer/product/lot-999" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lot": {
      "lotId": "lot-999",
      "releaseId": "release-123",
      "title": "The Dark Side of the Moon",
      "artist": "Pink Floyd",
      "label": "Harvest",
      "releaseYear": 1973,
      "genre": "Rock",
      "listPrice": 32.99,
      "conditionMedia": "VG",
      "conditionSleeve": "VG",
      "description": "Original 1973 pressing. Vinyl: VG with light scratches. Sleeve: VG with minor wear.",
      "quantity": 1,
      "channel": "web_submission"
    }
  }
}
```

### 4. Add to Cart

Add items to your cart:

```bash
BUYER_ID="buyer-456"

curl -X POST "http://localhost:3000/api/buyer/cart/$BUYER_ID/items" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lotId": "lot-999",
    "quantity": 1
  }' | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "buyerId": "buyer-456",
      "items": [
        {
          "lotId": "lot-999",
          "title": "The Dark Side of the Moon",
          "price": 32.99,
          "quantity": 1,
          "subtotal": 32.99
        }
      ],
      "total": 32.99,
      "itemCount": 1
    }
  }
}
```

### 5. View Cart

See what's in your cart:

```bash
curl -X GET "http://localhost:3000/api/buyer/cart/$BUYER_ID" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq
```

### 6. Update Cart Quantity

Change quantity of an item:

```bash
curl -X PUT "http://localhost:3000/api/buyer/cart/$BUYER_ID/items/lot-999" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 2
  }' | jq
```

### 7. Remove from Cart

Remove an item:

```bash
curl -X DELETE "http://localhost:3000/api/buyer/cart/$BUYER_ID/items/lot-999" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq
```

### 8. Create Order

Place an order (checkout):

```bash
curl -X POST http://localhost:3000/api/buyer/orders \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "buyer-456",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701",
      "country": "US"
    }
  }' | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "orderId": "order-789",
      "buyerId": "buyer-456",
      "status": "pending_payment",
      "paymentStatus": "pending",
      "items": [
        {
          "lotId": "lot-999",
          "title": "The Dark Side of the Moon",
          "price": 32.99,
          "quantity": 1,
          "subtotal": 32.99
        }
      ],
      "total": 32.99,
      "shippingAddress": {
        "street": "123 Main St",
        "city": "Springfield",
        "state": "IL",
        "zip": "62701"
      },
      "createdAt": "2024-12-04T12:00:00Z"
    }
  }
}
```

### 9. Prepare PayPal Payment (Development Only)

Get PayPal order details:

```bash
curl -X POST "http://localhost:3000/api/buyer/orders/order-789/paypal-prepare" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paypalOrder": {
      "id": "paypal-order-123",
      "status": "CREATED",
      "links": [
        {
          "rel": "approve",
          "href": "https://www.sandbox.paypal.com/checkoutnow?token=..."
        }
      ]
    }
  }
}
```

### 10. Capture Payment (Simulated)

Complete payment (development stub):

```bash
curl -X POST "http://localhost:3000/api/buyer/orders/order-789/paypal-capture" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paypalOrderId": "paypal-order-123"
  }' | jq
```

### 11. View Order

Check order status:

```bash
curl -X GET "http://localhost:3000/api/buyer/orders/order-789" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq
```

---

## **Complete Testing Workflow**

Here's a full end-to-end test script:

```bash
#!/bin/bash

# Get tokens
echo "=== Getting Tokens ==="
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","role":"admin"}' | jq -r '.token')

SELLER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@example.com","role":"seller"}' | jq -r '.token')

BUYER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@example.com","role":"buyer"}' | jq -r '.token')

BUYER_ID="buyer-456"

echo "Admin: $ADMIN_TOKEN"
echo "Seller: $SELLER_TOKEN"
echo "Buyer: $BUYER_TOKEN"

# Seller: Search and quote
echo -e "\n=== Seller: Search Catalog ==="
RELEASES=$(curl -s -X GET "http://localhost:3000/api/seller/catalog?q=pink" \
  -H "Authorization: Bearer $SELLER_TOKEN" | jq '.data.releases[0]')
RELEASE_ID=$(echo $RELEASES | jq -r '.id')
echo "Found: $RELEASE_ID"

# Seller: Submit
echo -e "\n=== Seller: Submit Offer ==="
SUBMISSION=$(curl -s -X POST http://localhost:3000/api/seller/submit \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"seller@example.com\",
    \"phone\": \"555-1234\",
    \"items\": [{
      \"releaseId\": \"$RELEASE_ID\",
      \"quantity\": 1,
      \"conditionMedia\": \"NM\",
      \"conditionSleeve\": \"VG+\"
    }]
  }")
SUBMISSION_ID=$(echo $SUBMISSION | jq -r '.data.submissionId')
SUB_ITEM_ID=$(echo $SUBMISSION | jq -r '.data.items[0].submissionItemId')
echo "Submission: $SUBMISSION_ID"

# Admin: Accept
echo -e "\n=== Admin: Accept Item ==="
curl -s -X POST http://localhost:3000/api/admin/submissions/item/accept \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"submissionItemId\": \"$SUB_ITEM_ID\",
    \"offerPrice\": 18.50
  }" | jq '.data.status'

# Admin: Finalize (Create Inventory)
echo -e "\n=== Admin: Finalize Item ==="
LOT=$(curl -s -X POST http://localhost:3000/api/admin/submissions/item/finalize \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"submissionItemId\": \"$SUB_ITEM_ID\",
    \"costBasis\": 18.50,
    \"listPrice\": 32.99,
    \"channel\": \"web_submission\"
  }")
LOT_ID=$(echo $LOT | jq -r '.data.lot.lotId')
echo "Lot: $LOT_ID"

# Admin: Make Live
echo -e "\n=== Admin: List Inventory ==="
curl -s -X PUT http://localhost:3000/api/admin/inventory \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lotId\": \"$LOT_ID\",
    \"status\": \"live\",
    \"listPrice\": 32.99
  }" | jq '.data.lot.status'

# Buyer: Browse
echo -e "\n=== Buyer: Browse ==="
curl -s -X GET "http://localhost:3000/api/buyer/browse?limit=5" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq '.data.lots | length'

# Buyer: Add to Cart
echo -e "\n=== Buyer: Add to Cart ==="
curl -s -X POST "http://localhost:3000/api/buyer/cart/$BUYER_ID/items" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lotId\": \"$LOT_ID\",
    \"quantity\": 1
  }" | jq '.data.cart.total'

# Buyer: Checkout
echo -e "\n=== Buyer: Checkout ==="
ORDER=$(curl -s -X POST http://localhost:3000/api/buyer/orders \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"buyerId\": \"$BUYER_ID\",
    \"shippingAddress\": {
      \"street\": \"123 Main St\",
      \"city\": \"Springfield\",
      \"state\": \"IL\",
      \"zip\": \"62701\",
      \"country\": \"US\"
    }
  }")
ORDER_ID=$(echo $ORDER | jq -r '.data.order.orderId')
echo "Order: $ORDER_ID"

echo -e "\n=== TESTING COMPLETE ==="
echo "Seller submitted: $SUBMISSION_ID"
echo "Admin created lot: $LOT_ID"
echo "Buyer placed order: $ORDER_ID"
```

Save this as `test.sh`, then run:

```bash
chmod +x test.sh
./test.sh
```

---

## **Testing Authorization**

Verify that users can't access other roles' endpoints:

```bash
# This should FAIL (seller trying admin endpoint)
curl -X GET http://localhost:3000/api/admin/submissions \
  -H "Authorization: Bearer $SELLER_TOKEN"

# Response: 403 Forbidden
# "Admin access required"

# This should FAIL (missing auth header)
curl -X GET http://localhost:3000/api/admin/submissions

# Response: 401 Unauthorized
# "Missing or invalid Authorization header"
```

---

## **Troubleshooting**

### Database Issues
```bash
# Check if database exists
psql -l | grep vinyl_catalog

# Drop and recreate
dropdb vinyl_catalog
createdb vinyl_catalog
npm run db:migrate:dev
npm run db:seed
```

### Server Won't Start
```bash
# Kill any existing processes
lsof -i :3000
kill -9 <PID>

# Restart
npm run dev
```

### Token Errors
```bash
# Re-generate tokens
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","role":"admin"}' | jq -r '.token')

echo $ADMIN_TOKEN  # Verify not empty
```

### See Server Logs
Server logs appear in the terminal where you ran `npm run dev`:
- Authentication attempts
- Database queries
- API endpoint calls
- Errors

---

## **Next Steps**

1. **Run through the complete workflow** above
2. **Test error cases** (wrong role, missing auth, invalid data)
3. **Check database** to see records created:
   ```bash
   psql vinyl_catalog
   \dt  # List tables
   SELECT * FROM "SellerSubmission";
   SELECT * FROM "InventoryLot";
   SELECT * FROM "BuyerOrder";
   ```

4. **Monitor logs** in the terminal

See `AUTH_QUICK_START.md` for more authentication testing.
See `CRITICAL_FIXES_IMPLEMENTED.md` for production requirements.
