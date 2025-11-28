# Quick Reference Card

## Quick Start (Copy & Paste)

### 1. Setup
```bash
cd /Users/invision/site-oul
npm install
npm run build
npm run db:migrate:dev
npm run db:seed
npm run dev
```

### 2. Get Tokens (in another terminal)
```bash
# Admin
ADMIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","role":"admin"}' | jq -r '.token')

# Seller
SELLER=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@example.com","role":"seller"}' | jq -r '.token')

# Buyer
BUYER=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@example.com","role":"buyer"}' | jq -r '.token')

echo "Admin: $ADMIN"
echo "Seller: $SELLER"
echo "Buyer: $BUYER"
```

---

## Common Commands

### Seller Actions
```bash
# Search catalog
curl "http://localhost:3000/api/seller/catalog?q=pink%20floyd" \
  -H "Authorization: Bearer $SELLER"

# Get quote
curl -X POST http://localhost:3000/api/seller/quotes \
  -H "Authorization: Bearer $SELLER" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "releaseId": "release-123",
      "quantity": 1,
      "conditionMedia": "NM",
      "conditionSleeve": "VG+"
    }]
  }'

# Submit offer
curl -X POST http://localhost:3000/api/seller/submit \
  -H "Authorization: Bearer $SELLER" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "phone": "555-1234",
    "items": [{
      "releaseId": "release-123",
      "quantity": 1,
      "conditionMedia": "NM",
      "conditionSleeve": "VG+"
    }]
  }'
```

### Admin Actions
```bash
# View submissions queue
curl "http://localhost:3000/api/admin/submissions?status=pending_review" \
  -H "Authorization: Bearer $ADMIN"

# Accept item
curl -X POST http://localhost:3000/api/admin/submissions/item/accept \
  -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionItemId": "subitem-123",
    "offerPrice": 18.50
  }'

# Finalize (create inventory)
curl -X POST http://localhost:3000/api/admin/submissions/item/finalize \
  -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionItemId": "subitem-123",
    "costBasis": 18.50,
    "listPrice": 32.99,
    "channel": "web_submission"
  }'

# Make inventory live
curl -X PUT http://localhost:3000/api/admin/inventory \
  -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "lotId": "lot-123",
    "status": "live",
    "listPrice": 32.99
  }'
```

### Buyer Actions
```bash
# Browse inventory
curl "http://localhost:3000/api/buyer/browse?limit=20" \
  -H "Authorization: Bearer $BUYER"

# Search products
curl "http://localhost:3000/api/buyer/search?q=pink%20floyd" \
  -H "Authorization: Bearer $BUYER"

# Add to cart
curl -X POST http://localhost:3000/api/buyer/cart/buyer-123/items \
  -H "Authorization: Bearer $BUYER" \
  -H "Content-Type: application/json" \
  -d '{
    "lotId": "lot-123",
    "quantity": 1
  }'

# Create order
curl -X POST http://localhost:3000/api/buyer/orders \
  -H "Authorization: Bearer $BUYER" \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "buyer-123",
    "shippingAddress": {
      "street": "123 Main",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701",
      "country": "US"
    }
  }'
```

---

## API Endpoints

### Public (No Auth)
- `POST /api/auth/login` - Get token
- `GET /health` - Health check

### Admin Only (require Bearer token + admin role)
- `GET /api/admin/submissions` - Queue
- `GET /api/admin/submissions/:id` - Details
- `POST /api/admin/submissions/item/accept` - Accept
- `POST /api/admin/submissions/item/reject` - Reject
- `POST /api/admin/submissions/item/counter-offer` - Counter
- `POST /api/admin/submissions/item/finalize` - Create lot
- `GET /api/admin/inventory` - List
- `PUT /api/admin/inventory` - Update
- `GET /api/admin/orders` - Orders

### Seller Only
- `GET /api/seller/catalog` - Search
- `POST /api/seller/quotes` - Quote
- `POST /api/seller/submit` - Submit
- `GET /api/seller/submissions` - My submissions
- `GET /api/seller/conditions` - Conditions

### Buyer Only
- `GET /api/buyer/browse` - Browse inventory
- `GET /api/buyer/search` - Search
- `GET /api/buyer/product/:id` - Product details
- `GET /api/buyer/cart/:id` - Cart
- `POST /api/buyer/cart/:id/items` - Add to cart
- `DELETE /api/buyer/cart/:id` - Clear cart
- `POST /api/buyer/orders` - Create order
- `GET /api/buyer/orders` - My orders

---

## Authentication Header Format

```bash
# Required for all protected routes:
-H "Authorization: Bearer YOUR_TOKEN_HERE"

# Example with curl:
curl http://localhost:3000/api/admin/submissions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Testing Files

- **`LOCAL_TESTING_GUIDE.md`** - Complete end-to-end testing (this file links to it)
- **`AUTH_QUICK_START.md`** - Authentication testing guide
- **`CRITICAL_FIXES_IMPLEMENTED.md`** - What was fixed and why
- **`product.md`** - System architecture & features

---

## Environment Variables

Key `.env` variables:
```bash
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/vinyl_catalog
JWT_SECRET=your_secret_here
CORS_ORIGIN=http://localhost:3000
```

---

## Database Commands

```bash
# Create database
createdb vinyl_catalog

# Run migrations
npm run db:migrate:dev

# Seed test data
npm run db:seed

# Access database
psql vinyl_catalog

# Useful queries:
# \dt                           - List tables
# SELECT * FROM "Release";      - View releases
# SELECT * FROM "SellerSubmission";
# SELECT * FROM "InventoryLot";
# SELECT * FROM "BuyerOrder";
```

---

## Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Missing token | Add `-H "Authorization: Bearer TOKEN"` |
| 403 Forbidden | Wrong role | Use correct role token (admin/seller/buyer) |
| Invalid token | Expired | Get new token with login |
| CORS error | Origin mismatch | Check `CORS_ORIGIN` in `.env` |
| Database error | Not running | Run `npm run db:migrate:dev` |
| Port 3000 in use | App already running | Kill with `lsof -i :3000` then `kill -9 PID` |

---

## HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 500 | Server error |

---

## Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Or on error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## Helpful Tools

Install jq for parsing JSON:
```bash
# macOS
brew install jq

# Usage:
curl http://localhost:3000/api/buyer/browse \
  -H "Authorization: Bearer $TOKEN" | jq '.data.lots[0].title'
```

---

## Full Testing Scenario

```bash
# 1. Get tokens
ADMIN=$(...)   # See "Get Tokens" above
SELLER=$(...)
BUYER=$(...)

# 2. Seller submits
SUB=$(curl -X POST http://localhost:3000/api/seller/submit \
  -H "Authorization: Bearer $SELLER" \
  -H "Content-Type: application/json" \
  -d '...')
SUBITEM=$(echo $SUB | jq -r '.data.items[0].submissionItemId')

# 3. Admin accepts and creates inventory
curl -X POST http://localhost:3000/api/admin/submissions/item/accept \
  -H "Authorization: Bearer $ADMIN" ...
LOT=$(curl -X POST http://localhost:3000/api/admin/submissions/item/finalize \
  -H "Authorization: Bearer $ADMIN" ...)
LOTID=$(echo $LOT | jq -r '.data.lot.lotId')

# 4. Admin makes live
curl -X PUT http://localhost:3000/api/admin/inventory \
  -H "Authorization: Bearer $ADMIN" \
  -d "{\"lotId\": \"$LOTID\", \"status\": \"live\"}"

# 5. Buyer browses and buys
curl "http://localhost:3000/api/buyer/browse" \
  -H "Authorization: Bearer $BUYER"
ORDER=$(curl -X POST http://localhost:3000/api/buyer/orders \
  -H "Authorization: Bearer $BUYER" ...)
```

---

## Debugging

### See server logs
Terminal where `npm run dev` runs shows all requests and errors

### Check database
```bash
psql vinyl_catalog
SELECT * FROM "SellerSubmission" LIMIT 5;
SELECT * FROM "BuyerOrder" LIMIT 5;
```

### Verify token
```bash
echo $ADMIN | jq -R 'split(".") | .[0:2] | map(@base64d) | map(fromjson)'
```

### Test without token
```bash
curl http://localhost:3000/api/admin/submissions
# Should return 401 Unauthorized
```

---

## What's Next?

See `CRITICAL_FIXES_IMPLEMENTED.md` for:
- Production deployment checklist
- Email service setup (SendGrid)
- PayPal integration (payment verification)
- Security considerations
- 'any' type cleanup roadmap

For detailed testing guide, see `LOCAL_TESTING_GUIDE.md`
