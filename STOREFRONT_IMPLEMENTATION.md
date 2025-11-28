# Buyer Storefront & Checkout Implementation Guide

## Overview

This document describes the complete implementation of the buyer-facing storefront, shopping cart, and checkout flow with PayPal integration. The implementation follows a BFF (Backend-for-Frontend) pattern and maintains the existing admin seller-submission infrastructure.

## Architecture

### Technology Stack
- **Database**: PostgreSQL with Prisma ORM
- **Runtime**: Node.js + TypeScript
- **Payment**: PayPal Commerce Platform
- **Services**: Business logic layer
- **APIs**: Route functions (ready for Express/Fastify HTTP server)

### Key Design Principles
1. **Atomic Transactions**: Inventory reservations are guaranteed atomic
2. **Configurable Channels**: Inventory visibility controlled by channel configuration
3. **Separation of Concerns**: Buyer and Admin flows are completely independent
4. **Email Notifications**: All state changes trigger buyer/admin notifications

---

## Database Schema Changes

### New Tables

#### Buyer
Represents a customer purchasing vinyl records.

```sql
Buyer {
  id: String @id
  email: String @unique
  name: String?
  phone: String?
  shippingAddress: JSON?  -- {street, city, state, zip, country}
  billingAddress: JSON?
  notifications: Boolean @default(true)
  createdAt: DateTime
  updatedAt: DateTime

  Relations:
  - carts: ShoppingCart[]
  - orders: BuyerOrder[]
}
```

#### ShoppingCart
Active shopping cart for a buyer.

```sql
ShoppingCart {
  id: String @id
  buyerId: String (FK -> Buyer)
  status: String -- "active", "abandoned", "checked_out"

  subtotal: Float @default(0)
  tax: Float @default(0)
  shipping: Float @default(0)
  total: Float @default(0)

  createdAt: DateTime
  updatedAt: DateTime
  abandonedAt: DateTime?

  Relations:
  - items: CartItem[]
}
```

#### CartItem
Line item in shopping cart.

```sql
CartItem {
  id: String @id
  cartId: String (FK -> ShoppingCart)
  lotId: String (FK -> InventoryLot)

  pricePerUnit: Float      -- captured at add time
  quantity: Int
  lineTotal: Float         -- computed

  createdAt: DateTime
  updatedAt: DateTime

  Constraints:
  - unique: [cartId, lotId]  -- one entry per lot per cart
}
```

#### BuyerOrder
Completed order ready for payment/fulfillment.

```sql
BuyerOrder {
  id: String @id
  orderNumber: String @unique  -- ORD-TIMESTAMP-RANDOM
  buyerId: String (FK -> Buyer)

  status: String -- "pending_payment", "paid", "shipment_pending", "shipped", "delivered", "cancelled"

  subtotal: Float
  tax: Float
  shipping: Float
  total: Float

  paymentMethod: String      -- "paypal"
  paypalOrderId: String?     -- PayPal order ID for tracking
  paymentStatus: String?     -- "pending", "authorized", "captured", "failed", "refunded"

  shippingAddress: JSON      -- {street, city, state, zip, country, name, phone}
  trackingNumber: String?

  createdAt: DateTime
  updatedAt: DateTime
  paidAt: DateTime?
  shippedAt: DateTime?
  deliveredAt: DateTime?

  Relations:
  - items: OrderItem[]
}
```

#### OrderItem
Line item in completed order.

```sql
OrderItem {
  id: String @id
  orderId: String (FK -> BuyerOrder)
  lotId: String (FK -> InventoryLot)

  pricePerUnit: Float      -- captured at purchase time
  quantity: Int
  lineTotal: Float

  createdAt: DateTime
}
```

#### ChannelConfig
Controls visibility and sellability of inventory channels.

```sql
ChannelConfig {
  id: String @id
  channel: String @unique  -- "web", "store_walkIn", etc.
  displayName: String      -- user-friendly name
  isPublic: Boolean @default(false)    -- visible to buyers
  isSellable: Boolean @default(true)   -- can items be purchased

  createdAt: DateTime
  updatedAt: DateTime
}
```

### Modified Tables

#### InventoryLot
Added relationships to cart items and orders.

```sql
-- Added:
cartItems: CartItem[]
orders: OrderItem[]
```

---

## API Layer

### Buyer Routes (`src/api/buyer-routes.ts`)

#### Browse & Search

**1. Browse Inventory**
```typescript
browseInventory(filters: BrowseInventoryFilter): Promise<BrowseInventoryResponse>

Filters:
- releaseId?: string
- genre?: string
- minPrice?: number
- maxPrice?: number
- conditionMedia?: string
- channel?: string
- limit?: number (1-100, default 20)
- offset?: number

Response:
{
  groups: [
    {
      releaseId: string
      release: { id, title, artist, genre, coverArtUrl }
      lots: [
        {
          id, lotNumber, release, conditionMedia, conditionSleeve,
          listPrice, quantity, availableQuantity
        }
      ]
    }
  ]
  total: number
}
```

Returns live inventory grouped by release and condition, only from public/sellable channels.

**2. Get Product Detail**
```typescript
getProductDetail(lotId: string): Promise<ProductDetailResponse>

Response:
{
  id, lotNumber, releaseId, release,
  conditionMedia, conditionSleeve, listPrice,
  quantity, availableQuantity, channel, status, listedAt
}
```

Shows detailed product information. Throws error if item not available for purchase.

**3. Search Inventory**
```typescript
searchInventory(input: { query: string; limit?: number; offset?: number }): Promise<BrowseInventoryResponse>
```

Fuzzy search by release title or artist.

### Checkout Routes (`src/api/buyer-checkout-routes.ts`)

#### Shopping Cart

**1. Get or Create Cart**
```typescript
getOrCreateCart(buyerId: string): Promise<ShoppingCartData>
```

Returns active cart or creates new one.

**2. Add to Cart**
```typescript
addToCart(input: AddToCartInput): Promise<ShoppingCartData>

Input:
{
  buyerId: string
  lotId: string
  quantity: number
}
```

Validates inventory availability. Updates quantity if item already in cart.

**3. Update Cart Item Quantity**
```typescript
updateCartItemQuantity(input: UpdateCartItemInput): Promise<ShoppingCartData>

Input:
{
  buyerId: string
  lotId: string
  quantity: number (0 to remove)
}
```

**4. Remove from Cart**
```typescript
removeFromCart(buyerId: string, lotId: string): Promise<ShoppingCartData>
```

**5. Clear Cart**
```typescript
clearCart(buyerId: string): Promise<ShoppingCartData>
```

**6. Get Cart**
```typescript
getCart(buyerId: string): Promise<ShoppingCartData>

Response:
{
  id, buyerId, status, items, subtotal, tax, shipping, total, updatedAt
  items: [
    {
      id, lotId, lotNumber, release, conditionMedia, conditionSleeve,
      pricePerUnit, quantity, lineTotal
    }
  ]
}
```

#### Checkout & Payment

**1. Create Order from Cart**
```typescript
createOrder(input: CheckoutInput): Promise<CheckoutResponse>

Input:
{
  buyerId: string
  shippingAddress: {
    name, phone, street, city, state, zip, country
  }
}

Response:
{
  orderId, orderNumber, buyerId, status,
  subtotal, tax, shipping, total,
  paymentStatus, paypalOrderId,
  items: [ { lotNumber, quantity, pricePerUnit, lineTotal } ]
}
```

Creates order from cart, marks cart as checked_out. Does NOT charge payment yet.

**2. Prepare PayPal Order**
```typescript
preparePayPalOrder(orderId: string): Promise<{
  orderNumber: string
  total: number
  currency: string  // "USD"
  items: [ { name, quantity, unitAmount } ]
}>
```

Returns data needed to create PayPal payment.

**3. Capture Payment**
```typescript
capturePayment(input: CapturePaymentInput): Promise<CapturePaymentResponse>

Input:
{
  orderId: string
  paypalOrderId: string
}

Response:
{
  orderId, paymentStatus: "captured", paidAt: DateTime
}
```

**ATOMIC OPERATION**: Marks order as paid AND atomically reserves all inventory:
- For each item in order:
  - Decrement lot's `availableQuantity`
  - Update lot status to "reserved" (or "sold" if qty reaches 0)

**4. Get Order**
```typescript
getOrder(orderId: string): Promise<CheckoutResponse>
```

**5. Get Buyer Orders**
```typescript
getBuyerOrders(buyerId: string, limit?: number, offset?: number): Promise<{
  orders: CheckoutResponse[]
  total: number
}>
```

#### Buyer Account

**1. Get or Create Buyer**
```typescript
getOrCreateBuyer(input: CreateBuyerInput): Promise<BuyerProfile>

Input:
{
  email: string
  name?: string
  phone?: string
}
```

Creates buyer if doesn't exist (idempotent).

**2. Get Buyer Profile**
```typescript
getBuyerProfile(buyerId: string): Promise<BuyerProfile>
```

**3. Update Buyer Profile**
```typescript
updateBuyer(input: UpdateBuyerInput): Promise<BuyerProfile>

Input:
{
  buyerId: string
  name?: string
  phone?: string
  shippingAddress?: Record<string, any>
  billingAddress?: Record<string, any>
  notifications?: boolean
}
```

**4. Set Shipping Address**
```typescript
setShippingAddress(input: ShippingAddressInput): Promise<BuyerProfile>

Input:
{
  buyerId: string
  name, phone, street, city, state, zip, country
}
```

---

## Service Layer

### Shopping Cart Service (`src/services/shopping-cart.ts`)

Handles all cart operations:
- Create/get active cart
- Add/update/remove items
- Calculate totals (subtotal, tax, shipping)
- Validate inventory availability

**Key Functions:**
- `getOrCreateCart(buyerId)` - Cart initialization
- `addToCart(input)` - Add item with qty validation
- `removeFromCart(buyerId, lotId)` - Remove item
- `updateCartItemQuantity(input)` - Update qty or delete if 0
- `clearCart(buyerId)` - Empty cart
- `recalculateCartTotals(cartId)` - Recompute pricing

**Pricing Calculation:**
```
subtotal = sum(item.pricePerUnit * item.quantity for each item)
tax = subtotal * 0.1  -- 10% flat rate (customize as needed)
shipping = 5.00 (flat if items, 0 if empty)
total = subtotal + tax + shipping
```

### Checkout Service (`src/services/checkout.ts`)

Handles order creation and payment capture:
- Create orders from carts
- Generate unique order numbers
- Prepare PayPal order data
- Capture payments with atomic inventory reservation
- Retrieve order history

**Key Functions:**
- `createOrderFromCart(input)` - Create order from active cart
- `preparePayPalOrder(orderId)` - Build PayPal payload
- `capturePayment(input)` - Charge + atomically reserve inventory
- `getOrder(orderId)` - Retrieve order details
- `getBuyerOrders(input)` - Get order history

**Atomic Payment Capture Process:**
```typescript
await prisma.$transaction(async (tx) => {
  // For each OrderItem:
  for (const item of order.items) {
    const lot = await tx.inventoryLot.findUnique(...)

    // Verify sufficient qty available
    if (item.quantity > lot.availableQuantity) {
      throw ValidationError("Insufficient inventory")
    }

    // Decrement and update status
    await tx.inventoryLot.update({
      availableQuantity: lot.availableQuantity - item.quantity
      status: newAvailableQty === 0 ? "sold" : "reserved"
    })
  }
})
```

### Buyer Accounts Service (`src/services/buyer-accounts.ts`)

Manages buyer profiles:
- Create/get buyer
- Update profile
- Manage addresses

**Key Functions:**
- `getOrCreateBuyer(input)` - Create or retrieve buyer
- `getBuyerById(buyerId)` - Get profile
- `getBuyerByEmail(email)` - Get profile by email
- `updateBuyer(input)` - Update profile fields
- `setShippingAddress(input)` - Set shipping address

---

## Admin APIs

### Admin Routes Extensions (`src/api/admin-routes.ts`)

#### Order Management

**1. List Buyer Orders**
```typescript
listBuyerOrders(status?: string, paymentStatus?: string, limit?: number, offset?: number)

Returns: { orders: [...], total: number }
```

Shows all buyer orders with buyer and item details.

**2. Get Order Detail**
```typescript
getBuyerOrderDetail(orderId: string)

Returns: Full order with buyer, items, lot, and release info
```

**3. Get Sales Reconciliation**
```typescript
getSalesReconciliation(startDate?: string, endDate?: string, limit?: number, offset?: number)

Returns:
{
  reconciliation: [
    {
      lotNumber, release, conditions,
      costBasis, soldPrice, profit,
      quantity, soldAt,
      orders: [
        {
          orderNumber, buyerEmail, buyerName,
          paidAt, shippedAt, status
        }
      ]
    }
  ]
  total: number
}
```

Provides reconciliation data linking sold lots to buyer orders. Useful for:
- Verifying inventory sales
- Calculating profit margins
- Tracking lot -> order references
- Financial reporting

---

## Email Notifications

### Buyer Order Emails

Updated `src/services/email.ts` to send buyer notifications:

**1. Order Confirmation**
```typescript
sendOrderConfirmation(buyerEmail, orderNumber, total, items)
```

Sent immediately after order is created (before payment).

**2. Order Shipped**
```typescript
sendOrderShipped(buyerEmail, orderNumber, trackingNumber)
```

Sent when order status changes to "shipped".

---

## Integration Flow

### Complete Purchase Flow

```
1. BROWSE
   ├─ GET /browse?genre=jazz&maxPrice=50
   └─ Returns: grouped lots by release/condition

2. VIEW PRODUCT
   ├─ GET /product/{lotId}
   └─ Returns: detailed product info with cover art

3. ADD TO CART
   ├─ POST /cart/add
   ├─ { buyerId, lotId, quantity: 1 }
   └─ Returns: updated cart with totals

4. REVIEW CART
   ├─ GET /cart?buyerId=...
   └─ Returns: items, subtotal, tax, shipping, total

5. CHECKOUT
   ├─ POST /checkout
   ├─ { buyerId, shippingAddress }
   ├─ Cart status → "checked_out"
   └─ Returns: order details + orderNumber

6. REDIRECT TO PAYPAL
   ├─ Frontend calls PayPal with order data from /paypal-order/{orderId}
   └─ User authorizes payment

7. CAPTURE PAYMENT
   ├─ POST /capture-payment
   ├─ { orderId, paypalOrderId }
   ├─ [ATOMIC] Marks order paid + reserves inventory
   ├─ Updates lot status: live → reserved/sold
   └─ Sends order confirmation email

8. ADMIN RECONCILIATION
   ├─ GET /admin/reconciliation
   └─ Shows lot → order links for fulfillment
```

### Inventory Status Lifecycle

```
draft
  ↓
live (when listed for sale)
  ├─ [buyer adds to cart] (no change)
  ├─ [payment captured] → reserved (or sold if qty=0)
  ├─ → sold (all reserved items)
  └─ → returned (RMA process)

Reserved (partially sold)
  └─ When all reserve, becomes sold

Sold (inventory exhausted)
  └─ availableQuantity = 0
```

---

## Database Migration

Run the following to apply schema changes:

```bash
npx prisma migrate dev --name add_buyer_storefront

# Or for production:
npx prisma migrate deploy
```

This creates all new tables: Buyer, ShoppingCart, CartItem, BuyerOrder, OrderItem, ChannelConfig.

---

## Channel Configuration

The ChannelConfig table controls inventory visibility. Example seeding:

```typescript
await prisma.channelConfig.createMany({
  data: [
    {
      channel: "web",
      displayName: "Online Store",
      isPublic: true,
      isSellable: true,
    },
    {
      channel: "store_walkIn",
      displayName: "Walk-in Store",
      isPublic: false,
      isSellable: true,
    },
  ],
})
```

Only lots on public + sellable channels appear in `/browse`.

---

## Testing

### Cart Operations
```typescript
// Create buyer
const buyer = await getOrCreateBuyer({ email: "buyer@example.com" })

// Get/create cart
const cart = await getOrCreateCart(buyer.id)

// Add item
const updated = await addToCart({
  buyerId: buyer.id,
  lotId: "lot_123",
  quantity: 1
})

// Should show items + calculated totals
expect(updated.items).toHaveLength(1)
expect(updated.subtotal).toBe(49.99)
expect(updated.total).toBeGreaterThan(49.99) // includes tax + shipping
```

### Checkout Flow
```typescript
// Create order from cart
const order = await createOrder({
  buyerId: buyer.id,
  shippingAddress: {
    name: "John Doe",
    phone: "555-1234",
    street: "123 Main St",
    city: "Portland",
    state: "OR",
    zip: "97201",
    country: "US"
  }
})

expect(order.status).toBe("pending_payment")
expect(order.items).toHaveLength(1)

// Simulate PayPal payment
const captured = await capturePayment({
  orderId: order.orderId,
  paypalOrderId: "PAYPAL_ORDER_ID"
})

expect(captured.paymentStatus).toBe("captured")

// Verify lot is now reserved
const lot = await getLot(order.items[0].lotId)
expect(lot.availableQuantity).toBe(0)
expect(lot.status).toBe("sold")
```

### Admin Reconciliation
```typescript
const reconciliation = await getSalesReconciliation()

expect(reconciliation.reconciliation).toHaveLength(1)
const item = reconciliation.reconciliation[0]

expect(item.lotNumber).toBe("LOT-20251128-ABC12")
expect(item.soldPrice).toBe(49.99)
expect(item.profit).toBe(49.99 - item.costBasis)
expect(item.orders).toHaveLength(1)
expect(item.orders[0].orderNumber).toMatch(/^ORD-/)
```

---

## Security Considerations

1. **Input Validation**: All inputs validated before processing
2. **Atomic Transactions**: Inventory operations guaranteed atomic
3. **Quantity Validation**: Prevents overselling with qty checks
4. **Channel Visibility**: Only public channels visible to buyers
5. **PayPal Verification**: In production, verify PayPal orders before capture
6. **Address Validation**: Shipping address required and validated

---

## Future Enhancements

1. **Shipping Integration**
   - EasyPost or Shippo for carrier rates
   - Auto-generate tracking numbers
   - Webhook for shipment updates

2. **PayPal Advanced**
   - Store PayPal billing agreements
   - Saved payment methods
   - PayPal checkout express

3. **Inventory Features**
   - Size-based pricing (weight → shipping cost)
   - Bundle discounts
   - Pre-order handling

4. **Buyer Features**
   - Wishlist/saved items
   - Order tracking dashboard
   - Return/RMA process
   - Buyer review system

5. **Admin Features**
   - Batch order fulfillment
   - Automated shipping labels
   - Sales reports & analytics
   - Inventory forecasting

---

## File Structure

```
/src
├── /api
│   ├── buyer-routes.ts               # Browse/search endpoints
│   ├── buyer-checkout-routes.ts      # Cart/order/account endpoints
│   └── admin-routes.ts               # Extended with order/reconciliation endpoints
│
├── /services
│   ├── shopping-cart.ts              # Cart management
│   ├── checkout.ts                   # Order + payment
│   ├── buyer-accounts.ts             # Buyer profiles
│   └── email.ts                      # Updated with buyer notifications
│
└── /db
    └── schema.prisma                 # Updated with new models
```

---

## Deployment Checklist

- [ ] Run database migration
- [ ] Seed ChannelConfig with appropriate channels
- [ ] Set up PayPal API credentials
- [ ] Configure email service (SendGrid, etc.)
- [ ] Deploy updated services
- [ ] Mount buyer routes in HTTP server
- [ ] Test full purchase flow end-to-end
- [ ] Monitor order creation and payment capture
- [ ] Set up admin dashboard for order management
- [ ] Document PayPal reconciliation process

---

## Questions & Support

For implementation questions, refer to:
- Service function signatures in type comments
- Admin routes for reconciliation patterns
- Email service for notification patterns
- Database schema for data relationships
