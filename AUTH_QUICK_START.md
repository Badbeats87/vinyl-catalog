# Authentication Quick Start Guide

This guide shows how to test the newly implemented authentication system.

## Starting the Server

```bash
npm install  # Install dependencies if not already done
npm run build  # Compile TypeScript
npm run dev   # Start development server
```

Server will start on `http://localhost:3000`

## Getting an Authentication Token

All protected routes require an authentication token. Use the login endpoint to get one.

### Login as Admin
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "role": "admin"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin",
    "email": "admin@company.com",
    "role": "admin"
  }
}
```

### Login as Seller
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "role": "seller"
  }'
```

### Login as Buyer
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "role": "buyer"
  }'
```

## Using Your Token

Save the token from the login response, then include it in all subsequent API requests:

### Example: Get Admin Submissions (Admin Only)
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3000/api/admin/submissions \
  -H "Authorization: Bearer $TOKEN"
```

### Example: List Inventory as Admin
```bash
curl -X GET "http://localhost:3000/api/admin/inventory?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Testing Authorization (Role Checks)

### This WILL work (correct role)
```bash
ADMIN_TOKEN="..."  # From admin login

curl -X GET http://localhost:3000/api/admin/submissions \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Response: 200 OK with data
```

### This WILL NOT work (wrong role)
```bash
SELLER_TOKEN="..."  # From seller login

curl -X GET http://localhost:3000/api/admin/submissions \
  -H "Authorization: Bearer $SELLER_TOKEN"

# Response: 403 Forbidden
# {
#   "success": false,
#   "error": {
#     "code": "FORBIDDEN",
#     "message": "Admin access required..."
#   }
# }
```

### This WILL NOT work (missing auth header)
```bash
curl -X GET http://localhost:3000/api/admin/submissions

# Response: 401 Unauthorized
# {
#   "success": false,
#   "error": {
#     "code": "UNAUTHORIZED",
#     "message": "Missing or invalid Authorization header..."
#   }
# }
```

## Common Endpoints to Test

### Publicly Accessible (No Auth Required)
```bash
# Health check
curl http://localhost:3000/health
```

### Admin-Only Endpoints
```bash
# Get submissions queue
curl -X GET http://localhost:3000/api/admin/submissions \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get inventory list
curl -X GET http://localhost:3000/api/admin/inventory \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Accept a submission item
curl -X POST http://localhost:3000/api/admin/submissions/item/accept \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionItemId": "item-id",
    "offerPrice": 25.50
  }'
```

### Seller-Only Endpoints
```bash
# Search catalog
curl -X GET "http://localhost:3000/api/seller/catalog?q=pink%20floyd" \
  -H "Authorization: Bearer $SELLER_TOKEN"

# Generate quotes
curl -X POST http://localhost:3000/api/seller/quotes \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "releaseId": "release-1",
        "quantity": 1,
        "conditionMedia": "NM",
        "conditionSleeve": "VG+"
      }
    ]
  }'

# Submit seller offer
curl -X POST http://localhost:3000/api/seller/submit \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "phone": "555-1234",
    "items": [
      {
        "releaseId": "release-1",
        "quantity": 1,
        "conditionMedia": "NM",
        "conditionSleeve": "VG+"
      }
    ]
  }'
```

### Buyer-Only Endpoints
```bash
# Browse inventory
curl -X GET "http://localhost:3000/api/buyer/browse?limit=20" \
  -H "Authorization: Bearer $BUYER_TOKEN"

# Get product details
curl -X GET "http://localhost:3000/api/buyer/product/lot-123" \
  -H "Authorization: Bearer $BUYER_TOKEN"

# Get cart
curl -X GET "http://localhost:3000/api/buyer/cart/buyer-123" \
  -H "Authorization: Bearer $BUYER_TOKEN"

# Add to cart
curl -X POST "http://localhost:3000/api/buyer/cart/buyer-123/items" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lotId": "lot-456",
    "quantity": 1
  }'
```

## Token Format

Tokens are currently base64-encoded JSON (development only). Production will use proper JWT with RS256.

**Development token structure:**
```json
{
  "userId": "admin",
  "email": "admin@company.com",
  "role": "admin",
  "iat": 1700000000000
}
```

## Development Impersonation (Advanced)

In development mode, admins can impersonate other users using a header:

```bash
ADMIN_TOKEN="..."

# Impersonate a seller
curl -X GET http://localhost:3000/api/seller/catalog \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Impersonate-User: seller:seller@example.com:seller"

# Format: userId:email:role
```

This is useful for testing different user flows as an administrator.

## Troubleshooting

### "Invalid or expired authentication token"
- Make sure you're including the full token from the login response
- Tokens expire after 24 hours (development setting)
- Get a new token with another login request

### "Admin access required"
- You're using a token from a user with the wrong role
- Make sure you logged in with `"role": "admin"`

### "Missing or invalid Authorization header"
- Make sure the header is exactly: `Authorization: Bearer TOKEN`
- It's case-sensitive
- Don't forget "Bearer " (with space) before the token

### CORS errors
- Ensure the `CORS_ORIGIN` environment variable is set correctly in `.env`
- Default: `http://localhost:3000`

## Next Steps

Once you've verified authentication is working:

1. **Test protected endpoints** with the correct role tokens
2. **Test role violations** - try accessing admin endpoints with seller token
3. **Test expired tokens** - wait 24 hours (or manually expire in code for testing)
4. **Check logs** - verify `console.log` output shows authentication attempts

See `CRITICAL_FIXES_IMPLEMENTED.md` for information on:
- Production deployment requirements
- Switching to proper JWT
- OAuth2 integration
- Email and PayPal implementation
