Name: tbd

## Product vision
One centralized catalog powers two customer-facing sites (“Sell to Us” and “Buy from Us”) plus an internal admin console. The business buys used vinyl from collectors, then lists selected inventory on its storefront. Admins govern acquisition and sale pricing through configurable policies that reference third-party market data and condition grades.

## Primary roles & surfaces
- **Admin (core employee)**: maintains catalog metadata, defines global and per-release pricing strategies, triages incoming seller submissions, and pushes inventory live. Works exclusively in the admin console.
- **Seller (record owner)**: uses the “sell to us” site to receive instant offers, describe condition, and submit a lot for review. Receives follow-up communications off-platform (email/SMS) once admin accepts.
- **Buyer (store customer)**: browses the “buy from us” storefront (standard ecommerce flow with cart, checkout, etc.) and is unaware of the sourcing process.

## System overview
```
Seller Site <-> API <-> Catalog DB <-> Admin Console <-> API <-> Storefront
                             ^
                      Pricing Engine
```
- **Catalog DB**: single source of truth for releases, condition, offer price, list price, and state (submitted, vetted, live, sold).
- **Pricing engine**: service or module that fetches Discogs/eBay stats, applies policies, and outputs offer/list prices per condition tier.
- **Admin console**: UI for policy configuration, catalog edits, queue management, and manual overrides.
- **Seller site**: lightweight search + instant quote flow; writes seller submission records.
- **Storefront**: ecommerce front end showing list price, stock count, and condition.

## Pricing strategy
Admin-configurable pricing templates drive both buying offers and selling list prices.

### Data inputs
- **External market sources**: Discogs and eBay APIs (or cached datasets) provide low/median/high sale prices over a configurable time window (default 90 days). Missing data flags records for manual review.
- **Condition curves**: global table mapping condition tiers (Mint, NM, VG+, VG, VG-, G) to percentage adjustments (e.g., Mint = 110% of NM baseline, VG = 60%).
- **Channel-specific multipliers**: administrators can create policies per acquisition channel (web submissions vs. store walk-ins) or per genre/label.

### Offer (buy) calculation
```
market_stat = choose(low|median|high, source=Discogs|eBay|hybrid)
base_offer = market_stat * percentage (e.g., 55%)
condition_adjusted_offer = base_offer * condition_curve[media]*media_weight
                           + base_offer * condition_curve[sleeve]*sleeve_weight
rounded_offer = round_to_increment(condition_adjusted_offer, $0.25)
```
- Hybrid mode averages Discogs/eBay stats or uses fallback order (Discogs -> eBay -> manual prompt).
- Admin can impose min/max caps or profit targets (e.g., target 40% gross margin on resale).
- Offers expire after N days; expiry duration is policy-controlled.

### Listing (sell) calculation
```
market_stat_sell = choose(low|median|high, source=Discogs|eBay|hybrid)
list_price_suggestion = market_stat_sell * percentage (e.g., 125%)
condition_adjusted_list = list_price_suggestion * condition_curve[media]
admin_override (optional): absolute value or +/- adjustment
```
- List price suggestions consider current inventory costs to avoid selling below acquisition price.
- Admin can define markdown schedules (e.g., -10% after 30 days unsold).

## Catalog & submission data model (high level)
- **Release**: id, title, artist, label, catalog_number, barcode, release_year, genre, cover_art_url.
- **Market snapshot**: release_id, source, stat_low, stat_median, stat_high, fetched_at.
- **Pricing policy**: id, name, scope (global/genre/release), buy_formula, sell_formula, condition_curve.
- **Seller submission**: submission_id, seller_contact, status, created_at, expires_at.
- **Submission item**: submission_id, release_id, quantity, seller_condition_media, seller_condition_sleeve, auto_offer_price.
- **Inventory lot**: lot_id, release_id, condition_media, condition_sleeve, cost_basis, list_price, channel, status (draft/live/sold).

## Detailed flows

### Seller submission / admin buying
1. Seller lands on “Sell to Us” site and authenticates via email magic link or continues as guest with later confirmation step.
2. Seller searches catalog by artist/title/barcode; auto-complete hits the existing database.
3. Upon selection, site fetches price quote using current buy policy (condition defaults to NM until seller inputs actual condition).
4. Seller specifies media & sleeve condition, quantity, and optional notes/photos; quote updates live.
5. Seller adds item to virtual selling list (cart analogue). Repeat search/add flow for multiple records.
6. Before submission, site summarizes expected payout, payout method, and policy disclaimers (e.g., subject to inspection).
7. Seller submits; system creates `seller_submission` with status `pending_review` and sends confirmation email.
8. Admin console shows queue sorted by submission date or potential value. Admin can:
   - **Accept** entire submission (auto-generate purchase order, send instructions/shipping label).
   - **Counter** individual line items (adjust offer) and request seller confirmation.
   - **Reject** items or entire submission with canned reasons.
9. Once items are physically received and inspected, admin finalizes condition, updates cost basis, and converts accepted items into inventory lots ready for pricing/listing.

### Admin inventory prep / selling
1. Admin adds or confirms release metadata (either via seller submission or manually).
2. System suggests list price via sell policy; admin reviews margins (list price vs. cost basis) and may override.
3. Admin adds merchandising data (description, store tags, photos) and marks inventory lot as `live`.
4. Storefront pulls all `live` lots, grouped by release and condition. Multiple copies show available quantity.
5. Once a buyer completes checkout, storefront marks the lot as reserved. Inventory sync prevents overselling.
6. Fulfillment workflow (shipping notification, tracking) occurs outside this doc’s scope but should integrate order statuses back into the lot record.

### Buyer storefront flow
1. Buyer browses catalog, filters by genre, price, condition, or new arrivals.
2. PDP shows condition, audio notes, pricing history, and a badge if price recently dropped.
3. Buyer adds to cart and checks out through standard ecommerce stack (payment provider TBD).
4. After purchase, system triggers order confirmation email and updates inventory lot to `sold`.

## Edge cases & operational considerations
- **Missing external data**: Flag releases lacking Discogs/eBay stats for manual pricing; seller site should display “Needs manual review” instead of instant quote.
- **Duplicate submissions**: Detect identical seller lots within a cooldown window to avoid repeated quotes abuse.
- **Condition disputes**: If received condition is lower than declared, admin can auto-reprice using same policy and request seller approval before finalizing.
- **Regional pricing**: Consider currency conversion if sellers/buyers operate outside base currency; store converted amounts alongside USD baseline.
- **Tax and compliance**: Capture seller tax info if payouts exceed thresholds; storefront must handle sales tax/VAT rules per region.
- **Notifications**: Email/SMS templates for submission received, quote adjustments, acceptance, payment sent, and buyer order statuses.
- **Audit trail**: Log policy versions applied to each quote/list price for traceability.

## Open questions for dev kickoff
| Priority | Question | Why it matters |
| --- | --- | --- |
| P0 | What third-party integrations (Discogs, eBay, shipping labels, payments) already exist or need procurement? | Blocks API design, infrastructure estimates, and legal/vendor onboarding. |
| P0 | How will payouts be issued (ACH, PayPal, store credit) and who provides KYC/AML checks? | Determines compliance scope, database fields, and payout provider integrations. |
| P1 | Should sellers authenticate or can they fully transact as guests? | Impacts auth stack choice, data retention, quote retrieval, and notification logic. |
| P1 | Do admins need bulk import/export tools for catalog and pricing policies? | Informs build vs. buy decisions for data management and affects early backlog sizing. |
| P2 | Are there SLAs for responding to submissions or auto-expiring unreviewed requests? | Guides automation, notification cadence, and queue prioritization logic. |

## Implementation backlog

### Platform-001: External data & payout integrations spike
1. Inventory current credentials/contracts for Discogs, eBay, payout providers, and shipping label tools.
2. Draft request/response samples for Discogs marketplace stats API; note rate limits and cost.
3. Draft request/response samples for eBay sold-items stats API; capture pagination, filters, auth flow.
4. Compare payout vendors (ACH, PayPal, store credit processor) on API features, KYC needs, and fees.
5. Evaluate shipping label providers (Shippo, EasyPost, carrier direct) with pros/cons for returns workflow.
6. Summarize findings in capability matrix + recommended vendors with backlog dependencies.

### Platform-002: Core catalog & policy schema
1. Define ERD covering release, market_snapshot, pricing_policy, seller_submission, submission_item, inventory_lot.
2. Write DB migrations for all tables, indexes, and foreign keys.
3. Seed reference data (condition tiers, default pricing curves) via migration or fixture.
4. Implement CRUD endpoints/services for release and pricing_policy.
5. Add basic admin console views or CLI scripts to create/edit these records.
6. Add automated tests covering migrations and CRUD validation rules.

### Platform-003: Pricing engine MVP
1. Create service/module skeleton with inputs (release_id, policy, condition) and outputs (offer/list price, policy version).
2. Implement Discogs/eBay data ingestion job that updates market_snapshot table on schedule.
3. Encode condition_curve application, media/sleeve weighting, rounding increments.
4. Add support for policy fallbacks (hybrid averages, manual flag when data missing).
5. Persist audit log referencing policy id and snapshot id per calculation.
6. Expose API endpoint for quote requests returning breakdown metadata.
7. Write unit tests for formula permutations and fallback behavior.

### Platform-004: Seller site search & quote flow
1. Build catalog search API with fuzzy matching on artist/title/barcode.
2. Implement frontend search UI with autocomplete suggestions.
3. Connect quote endpoint to display live offer based on selected item/condition.
4. Add condition selection UI for media and sleeve plus quantity input.
5. Create selling list cart allowing add/remove/update entries.
6. Build submission review step summarizing payout + policy disclaimers.
7. Implement submission POST endpoint persisting seller_submission + submission_items.
8. Send confirmation email (or stub) after submission, storing status `pending_review`.
9. Capture seller contact info and consent for notifications.

### Platform-005: Admin submission queue & intake
1. Build API endpoint to list submissions with filters (status, value, date).
2. Create admin UI table showing submission summary metrics.
3. Implement detail view for a submission with per-line items, notes, photos.
4. Add actions: accept all, reject all, counter offer per item with new price.
5. Wire counter flow to notify seller and await confirmation status.
6. Add ability to mark items as received/inspected and adjust condition.
7. Convert accepted items into inventory_lot entries with cost basis.
8. Log decision history and internal notes for auditing.

### Platform-006: Storefront inventory listing
1. Expose API endpoint returning live inventory lots grouped by release and condition.
2. Implement storefront listing/browse UI with filters (genre, condition, price).
3. Build PDP showing condition badges, photos, list price, and quantity.
4. Add cart/checkout integration using existing ecommerce stack (or stub).
5. Ensure purchase flow reserves lot and decrements quantity atomically.
6. Update lot status to sold/reserved and propagate to admin console.
7. Store order references for each sold lot for reconciliation.

### Platform-007: Notifications & expiry jobs
1. Define notification templates for submission received, accepted, rejected, counter, payment sent, order confirmation.
2. Integrate email/SMS provider with environment config.
3. Trigger appropriate template hooks from seller/admin/storefront workflows.
4. Implement background job to expire stale submissions/offers and notify sellers.
5. Add logging + retries for failed notification deliveries.
6. Instrument metrics/dashboards for notification success and queue backlog.

---

## Platform-001 Spike: Integration Research & Findings

### 1. Market Data Integrations

#### Discogs API

**Authentication & Access**
- Requires API key registration (free tier available)
- Two authentication methods: unauthenticated (25 req/min) or authenticated OAuth token (60 req/min)
- User-Agent header required; personal use tokens available without commercial licensing

**Rate Limits**
- **Authenticated**: 60 requests per minute
- **Unauthenticated**: 25 requests per minute
- Rate window: moving 60-second window; resets after 60s of inactivity
- Response headers include rate limit tracking:
  - `X-Discogs-Ratelimit`: total requests per minute
  - `X-Discogs-Ratelimit-Used`: requests made in current window
  - `X-Discogs-Ratelimit-Remaining`: remaining requests in current window

**Pricing & Costs**
- **API access**: Completely free; no paid tier or rate limit increases available
- Image downloads require authentication but no additional cost
- Data dump downloads available for self-hosting if higher request volumes needed

**Marketplace Statistics Endpoint**
- Endpoint: `GET /marketplace/stats/{release_id}`
- Returns: `num_for_sale`, `lowest_price`, and average stats for a release
- Response includes current market snapshot for pricing data
- Supports filtering by release ID and marketplace status

**Sample Request/Response**
```
GET /marketplace/stats/1234567 HTTP/1.1
Host: api.discogs.com
Authorization: Discogs token=YOUR_TOKEN
User-Agent: MyApp/1.0 +http://myapp.com

Response (200 OK):
{
  "lowest_price": "29.99",
  "lowest_price_shipping": "4.99",
  "num_for_sale": 42,
  "blocked_count": 0,
  "last_sold": {
    "price": "32.50",
    "sold_date": "2025-11-01T15:30:00Z"
  },
  "price_suggestions": {
    "very_good_plus": "28.00",
    "very_good": "24.00",
    "good_plus": "19.00"
  }
}
```

**Integration Notes**
- Ideal for initial data fetch and condition-curve application
- Caching strategy: refresh market snapshots every 6-24 hours depending on volume
- Rate limit allows ~3,600 requests/hour (authenticated), sufficient for 100-1000 releases with periodic updates
- No KYC or payout requirements

---

#### eBay API (Sold Items / Marketplace Insights)

**Authentication Flow**
- OAuth 2.0 authorization code grant flow required
- Scopes needed:
  - `https://api.ebay.com/oauth/api_scope/sell.fulfillment` (read/write orders)
  - `https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly` (read-only)
- All requests require `Authorization: Bearer {access_token}` header
- Access tokens expire and must be refreshed via refresh token

**Pagination & Filtering**
- Query parameters: `limit` (1–200, default 50) and `offset` (0-based index)
- Response includes navigation: `next`, `prev`, `total` fields
- Zero-based indexing: first item has offset=0
- Supports optional filters: date range, item status, seller status

**Pricing Data Endpoint**
- Endpoint: `GET /sell/fulfillment/v1/order` or marketplace insights search
- Returns: completed/sold items with final sale price, sale date, and condition
- Also available: `search` in Marketplace Insights API for aggregated stats
- Pagination allows iterating through large result sets

**Sample Request/Response**
```
GET /sell/fulfillment/v1/order?limit=50&offset=0 HTTP/1.1
Host: api.ebay.com
Authorization: Bearer {access_token}
Content-Type: application/json

Response (200 OK):
{
  "orders": [
    {
      "orderId": "140184596152836-170384957281",
      "orderCreateDate": "2025-11-20T14:32:10.000Z",
      "orderStatus": "COMPLETED",
      "lineItems": [
        {
          "lineItemId": "170384957281",
          "title": "Pink Floyd - Dark Side of the Moon (Vinyl LP)",
          "quantity": 1,
          "lineItemStatus": "SHIPPED",
          "price": {
            "currency": "USD",
            "value": "45.99"
          }
        }
      ]
    }
  ],
  "total": 1250,
  "offset": 0,
  "limit": 50,
  "next": "?offset=50&limit=50"
}
```

**Integration Notes**
- Requires seller account with order history
- Rate limits not explicitly documented; assume standard REST API limits
- Latency: sold items data available ~15 minutes after transaction
- Supports filtering by date range, enabling incremental updates
- Use as secondary pricing source (fallback to Discogs)

**Deprecation Warning**
- Shopping API being deprecated February 5, 2025; use Browse/Marketplace Insights APIs instead

---

### 2. Payout Integrations

#### PayPal Payouts API

**Fee Structure**
- **Variable fee**: 2% of transaction amount (typically)
- **ACH transfers (domestic US)**: 0.80% capped at $5
- **Instant withdrawal**: 1.5% (min $0.25, max $15)
- **International wire transfers**: Variable by destination country
- Sender pays fees at transaction time

**Transaction Limits**
- Individual payout: max $20,000 USD
- Total payout per request: Unlimited
- Minimum payout: $0.01

**Authentication**
- OAuth 2.0 with signature-based API (REST preferred)
- Scopes: `https://api.paypal.com/v1/payments/payouts-item`
- Requires Client ID and Secret or OAuth token

**KYC/AML Requirements**
- KYC verification required for payouts exceeding thresholds (typically $20,000/month or cumulative)
- AML checks performed automatically by PayPal
- Tax information (1099-K) issued for qualified transactions

**Sample Request/Response**
```
POST https://api.paypal.com/v1/payments/payouts HTTP/1.1
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "sender_batch_header": {
    "sender_batch_id": "batch_001",
    "email_subject": "Payment confirmation"
  },
  "items": [
    {
      "recipient_type": "EMAIL",
      "amount": {
        "currency": "USD",
        "value": "100.00"
      },
      "description": "Seller payout",
      "receiver": "seller@example.com"
    }
  ]
}

Response (201 Created):
{
  "batch_header": {
    "payout_batch_id": "ABCDEFG123456",
    "batch_status": "PENDING",
    "time_created": "2025-11-21T10:30:00Z"
  }
}
```

---

#### ACH Payout (Direct Bank Transfer)

**Fee Structure**
- ACH: 0.80% capped at $5 per transaction (lowest cost option)
- Settlement time: 1–3 business days
- Requires routing number and account number

**Authentication & Integration**
- Available through PayPal, Stripe, Tipalti, or direct bank processors
- Requires seller bank account verification (micro-deposits or ACH authorization)
- Standard OAuth or API key authentication

**KYC/AML Requirements**
- Bank account ownership verification required
- Tax ID matching (SSN/EIN)
- Address and identity verification
- No additional KYC beyond bank details for amounts <$20K/month

---

#### Store Credit Alternative

**Characteristics**
- No external payout needed; credits issued as in-app balance
- Zero external fees (only internal processing cost)
- Sellers can use credits toward future purchases or request withdrawal later
- Reduces fraud risk and improves cash retention

**Implementation Considerations**
- Requires wallet/credit ledger system
- Policy decision: expiration window for unused credits
- May require regulatory compliance for escrow/trust account setup

---

#### Stripe Payouts

**Fee Structure**
- Standard payout: 0.25% (minimum $0.25)
- Instant payout: 1.5% (minimum $0.50)
- ACH transfers: 1% (minimum $0.25)
- Monthly subscription option for high volume

**Key Advantages**
- Extensive currency support (135+ currencies)
- Integrated with Stripe Payments (single API for charging + paying out)
- Strong compliance and fraud prevention

**KYC Requirements**
- Verification requirements scale with payout volume
- Stripe handles verification automatically for most cases
- Enhanced verification for high-risk jurisdictions

---

#### Tipalti (Global Payouts Platform)

**Fee Structure**
- Per-transaction: typically 1–2% depending on method
- Subscription model: $99–$499/month for high-volume users
- Volume discounts available

**Key Features**
- Supports 190+ countries and multiple payment methods
- Handles KYC, tax forms (W-9, W-8BEN, 1099), and compliance
- API-driven with webhook support for payout status

**Ideal For**
- International sellers requiring diverse payout methods
- Platforms needing consolidated KYC/tax handling
- High-volume payout operations

---

### 3. Shipping Label Integrations

#### Shippo

**Carrier Coverage**
- 85+ integrated carriers globally (USPS, FedEx, UPS, DHL, etc.)
- Multi-carrier rate shopping available

**Key Features**
- Rate comparison and automated carrier selection based on user preference
- Address validation via USPS + third-party services
- Label generation and tracking integration
- **Returns support**: Scan-based return labels (pay-on-use model)
- Webhook-driven order tracking updates

**Returns Workflow**
- Pre-generated return labels with barcode
- Only charge when label is scanned/used
- Customer can print or request email delivery
- Automatic cost allocation on return receipt

**Pricing**
- Pay-per-label model (no subscription required)
- Rates vary by carrier; typical cost $2–$8 per label
- Return labels: discounted rate (~$0.50–$2.00 if scan-based)

**Authentication**
- API token-based (simple key in header)
- No OAuth complexity

**Sample Request/Response**
```
POST https://api.goshippo.com/shipments/ HTTP/1.1
Authorization: ShippoToken {token}
Content-Type: application/json

{
  "address_from": {
    "name": "Store Name",
    "street1": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701",
    "country": "US"
  },
  "address_to": {
    "name": "Customer Name",
    "street1": "456 Oak Ave",
    "city": "Madison",
    "state": "WI",
    "zip": "53703",
    "country": "US"
  },
  "parcels": [
    {
      "length": "12",
      "width": "8",
      "height": "6",
      "distance_unit": "in",
      "weight": "2",
      "mass_unit": "lb"
    }
  ]
}

Response (201 Created):
{
  "object_id": "shipment_xyz",
  "rates": [
    {
      "object_id": "rate_123",
      "provider": "USPS",
      "servicelevel": "Priority Mail",
      "amount": "8.99",
      "currency": "USD",
      "estimated_days": 2
    }
  ]
}
```

---

#### EasyPost

**Carrier Coverage**
- Major carriers (USPS, UPS, FedEx, DHL)
- Fewer options than Shippo but includes international

**Key Features**
- Proprietary algorithm for automatic carrier selection (cost optimization)
- Proprietary address verification (real-time, high accuracy)
- Tracker API for monitoring shipments
- Returns support via return label generation

**Pricing**
- Per-transaction: $0.02–$0.05 per label (lower than Shippo)
- No subscription required
- Discounted rates for volume

**Comparison with Shippo**
| Aspect | Shippo | EasyPost |
| --- | --- | --- |
| Carrier count | 85+ | ~12 major carriers |
| Rate shopping | Manual + auto selection | Automatic optimization |
| Address validation | USPS + third-party | Proprietary |
| Returns workflow | Scan-based labels | Standard return labels |
| Pricing per label | $2–$8 | $0.02–$0.05 (+ per-API-call) |
| Setup complexity | Low | Low |
| International support | Strong | Good |

---

#### Direct Carrier API (FedEx / UPS / USPS)

**Pros**
- Lowest per-label cost (direct negotiated rates)
- Full control over shipping workflows
- No third-party rate markup
- Integration with carrier return/manifest systems

**Cons**
- Higher engineering complexity (separate SDK for each carrier)
- Account setup and credential management per carrier
- Rate shopping requires multiple API calls
- Address validation must be implemented separately
- Support for fewer carriers (typically 3–5 vs. 85+)
- Returns workflow entirely custom-built

**Estimated Cost Savings**
- ~10–30% lower per-label costs vs. Shippo/EasyPost
- Offset by 4–8 weeks integration time per carrier
- Higher maintenance burden for carrier API updates

**Recommendation**
- Use third-party aggregator (Shippo) for MVP, launch with direct APIs later
- Return labels: Shippo's scan-based model is operationally simpler than direct carrier setup

---

### 4. Capability Matrix & Vendor Recommendations

#### Integration Priority & Selection

| Integration | Recommendation | Rationale | Timeline |
| --- | --- | --- | --- |
| **Market Data** | Discogs (primary) + eBay (fallback) | Free access, adequate rate limits, condition-specific data | MVP (Week 1–2) |
| **Payouts** | PayPal (MVP) → ACH or Stripe (V2) | PayPal low setup, ACH lowest cost, Stripe for international | MVP: PayPal; V2: ACH integration |
| **Shipping Labels** | Shippo (MVP) → EasyPost or direct APIs (V2) | 85+ carriers, scan-based returns, minimal engineering | MVP (Week 3–4) |
| **Notifications** | Postmark or Twilio (email/SMS) | Reliable, low cost, webhook/template support | Platform-007 |

---

#### Open Questions & Dependencies

| Question | Impact | Resolution Path |
| --- | --- | --- |
| Do sellers require account creation or can they transact fully as guests? | Affects payment routing, credential storage, return shipping workflows | Decide on authentication model before payout integration |
| Should the platform support international sellers/payments? | Determines payout provider choice (Stripe/Tipalti for multi-currency) | Clarify market scope; defer to V2 if US-only initially |
| What is the SLA for shipping label generation and return label auto-generation? | Affects job scheduling, async API call patterns | Align with fulfillment SLA (same-day vs. next-day) |
| Will returns processing be automated or manual? | Determines if scan-based return labels (Shippo) suffice or if custom workflow needed | Define returns policy before Platform-006 |
| Are there compliance requirements for KYC beyond standard payout thresholds? | Affects database schema, document storage, verification workflows | Consult legal/finance; encode in payout provider selection |

---

#### Infrastructure & Cost Estimates (Monthly, 100 releases/month acquisition)

| Service | MVP Volume | Estimated Cost | Notes |
| --- | --- | --- | --- |
| Discogs API | ~500 requests | Free | Authenticated tier; $0 |
| eBay API | ~200 requests | Free | Standard tier; $0 |
| PayPal Payouts | 50 sellers × $50 avg payout | ~$50–$75 | 2% fee; 50 payouts/month |
| Shippo Labels | 150 outbound + 30 returns | $300–$500 | $2–$4 avg label; USPS/FedEx mix |
| Email Notifications | ~500 notifications | $10–$20 | Postmark ~$0.02–$0.04 per email |
| **Total** | | **~$360–$595/month** | Scales linearly with volume |

---

### 5. Implementation Roadmap for Platform-001 Completion

#### Immediate (Week 1)
- [ ] Register Discogs API token; test marketplace stats endpoint
- [ ] Register eBay developer account; obtain OAuth credentials and sandbox access
- [ ] Document request/response samples for both APIs
- [ ] Set up environment variable templates for all credentials

#### Short-term (Week 2)
- [ ] Finalize payout vendor selection (PayPal for MVP recommended)
- [ ] Obtain PayPal Payouts API credentials; test in sandbox
- [ ] Design payout schema (recipient type, bank/email, status tracking)
- [ ] Define seller authentication method (influences payout flow)

#### Medium-term (Week 3–4)
- [ ] Evaluate Shippo vs. EasyPost sandbox environments
- [ ] Generate sample shipping label requests/responses
- [ ] Design return label workflow and cost allocation logic
- [ ] Update backlog with carrier integration dependencies

#### Backlog Dependencies
- **Platform-002** (DB schema): Requires finalized payout/shipping vendor choice
- **Platform-003** (Pricing engine): Requires Discogs + eBay sample responses to model data structure
- **Platform-005** (Admin intake): Requires payout provider confirmation flow
- **Platform-006** (Storefront): Requires shipping label provider and fulfillment flow spec

---

### 6. References & Documentation Links

**Market Data APIs:**
- [Discogs API Documentation](https://www.discogs.com/developers)
- [eBay Fulfillment API](https://developer.ebay.com/api-docs/sell/fulfillment/resources/order/methods/getOrders)
- [eBay Marketplace Insights API](https://developer.ebay.com/api-docs/buy/marketplace-insights/resources/item_sales/methods/search)

**Payout Providers:**
- [PayPal Payouts API](https://developer.paypal.com/docs/payouts/standard/reference/fees/)
- [Stripe Payouts Documentation](https://stripe.com/docs/payouts)
- [Tipalti Payout Platform](https://tipalti.com/)

**Shipping Label Providers:**
- [Shippo API Documentation](https://goshippo.com/docs/api/shipments/)
- [EasyPost Shipping API](https://www.easypost.com/api)

**Notification Providers:**
- [Postmark Email API](https://postmarkapp.com/api)
- [Twilio SMS/Email](https://www.twilio.com/)
