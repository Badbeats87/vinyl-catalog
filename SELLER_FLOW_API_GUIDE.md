# Seller Flow API Integration Guide

Quick reference for integrating the seller submission flow into your frontend.

## Endpoints Overview

| Operation | Endpoint | Method | Purpose |
|-----------|----------|--------|---------|
| Search | `/api/seller/search` | POST | Find releases in catalog |
| Quote | `/api/seller/quotes` | POST | Calculate buy offers |
| Submit | `/api/seller/submit` | POST | Create seller submission |
| Track | `/api/seller/submission/:number` | GET | View submission status |
| History | `/api/seller/submissions/:email` | GET | List seller's submissions |
| Conditions | `/api/seller/conditions` | GET | Get condition grades |

## Step-by-Step Integration

### Step 1: Display Condition Options

On page load, fetch available condition grades:

```typescript
async function loadConditions() {
  const res = await fetch('/api/seller/conditions', { method: 'GET' });
  const response = await res.json();

  if (response.success) {
    // response.data is array of conditions
    // Use to populate dropdowns:
    // [{ id, name, order, mediaAdjustment, sleeveAdjustment }]
    return response.data;
  }
}

// Later in dropdown:
{conditions.map(c => (
  <option key={c.id} value={c.name}>
    {c.name}
  </option>
))}
```

### Step 2: Implement Search

As user types in search box:

```typescript
let searchTimeout;

async function handleSearchChange(query) {
  clearTimeout(searchTimeout);

  if (query.length < 2) {
    setResults([]);
    return;
  }

  searchTimeout = setTimeout(async () => {
    const res = await fetch('/api/seller/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 20 })
    });

    const response = await res.json();
    if (response.success) {
      setResults(response.data); // Sorted by matchScore
    } else {
      showError(response.error.message);
    }
  }, 300); // Debounce 300ms
}
```

### Step 3: Build Shopping Cart

Store selected items with conditions:

```typescript
interface CartItem {
  releaseId: string;
  quantity: number;
  conditionMedia: string;
  conditionSleeve: string;
  // For display:
  title: string;
  artist: string;
}

const [cart, setCart] = useState<CartItem[]>([]);

function addToCart(release, quantity, mediaCondition, sleeveCondition) {
  const item = {
    releaseId: release.releaseId,
    quantity,
    conditionMedia: mediaCondition,
    conditionSleeve: sleeveCondition,
    title: release.title,
    artist: release.artist
  };
  setCart([...cart, item]);
}

function updateCartItem(index, changes) {
  const updated = [...cart];
  updated[index] = { ...updated[index], ...changes };
  setCart(updated);
}

function removeFromCart(index) {
  setCart(cart.filter((_, i) => i !== index));
}
```

### Step 4: Get Live Quote

Before showing review, fetch current quotes:

```typescript
async function getQuote() {
  const res = await fetch('/api/seller/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cart.map(item => ({
        releaseId: item.releaseId,
        quantity: item.quantity,
        conditionMedia: item.conditionMedia,
        conditionSleeve: item.conditionSleeve
      }))
    })
  });

  const response = await res.json();
  if (response.success) {
    setQuote(response.data); // { quotes: [], totalPayout: number }

    // Display to user:
    // - Each quote with per-item offer
    // - Total payout
    // - Offer expiry date (7 days from now)
  } else {
    showError(`Quote failed: ${response.error.message}`);
  }
}
```

### Step 5: Collect Seller Information

Create form for seller details:

```typescript
interface SellerInfo {
  email: string;
  phone?: string;
  consent: boolean;
}

function SellerInfoForm() {
  const [info, setInfo] = useState<SellerInfo>({
    email: '',
    phone: '',
    consent: false
  });

  const isValid = info.email && info.consent;

  return (
    <form>
      <input
        type="email"
        placeholder="Your email"
        value={info.email}
        onChange={e => setInfo({...info, email: e.target.value})}
        required
      />

      <input
        type="tel"
        placeholder="Phone (optional)"
        value={info.phone}
        onChange={e => setInfo({...info, phone: e.target.value})}
      />

      <label>
        <input
          type="checkbox"
          checked={info.consent}
          onChange={e => setInfo({...info, consent: e.target.checked})}
          required
        />
        I consent to receive email notifications about my submission
      </label>

      <button disabled={!isValid} onClick={() => handleSubmit(info)}>
        Submit Offer
      </button>
    </form>
  );
}
```

### Step 6: Submit Seller Offer

On form submit:

```typescript
async function handleSubmit(sellerInfo: SellerInfo) {
  const res = await fetch('/api/seller/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sellerEmail: sellerInfo.email,
      sellerPhone: sellerInfo.phone,
      items: cart.map(item => ({
        releaseId: item.releaseId,
        quantity: item.quantity,
        conditionMedia: item.conditionMedia,
        conditionSleeve: item.conditionSleeve
      })),
      sellerConsent: sellerInfo.consent,
      offerExpiryDays: 7
    })
  });

  const response = await res.json();
  if (response.success) {
    // Show success page with submission details
    showSuccessPage({
      submissionNumber: response.data.submissionNumber,
      expectedPayout: response.data.expectedPayout,
      expiresAt: response.data.expiresAt
    });

    // Clear cart
    setCart([]);

  } else {
    showError(`Submission failed: ${response.error.message}`);
  }
}
```

### Step 7: Track Submission

Show confirmation page where seller can track:

```typescript
function SubmissionConfirmation({ submissionNumber }) {
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    async function loadSubmission() {
      const res = await fetch(`/api/seller/submission/${submissionNumber}`);
      const response = await res.json();

      if (response.success) {
        setSubmission(response.data);
      }
    }

    loadSubmission();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadSubmission, 30000);
    return () => clearInterval(interval);
  }, [submissionNumber]);

  if (!submission) return <div>Loading...</div>;

  return (
    <div>
      <h2>Submission {submission.submissionNumber}</h2>
      <p>Status: {submission.status}</p>
      <p>Expected Payout: ${submission.expectedPayout.toFixed(2)}</p>
      <p>Expires: {new Date(submission.expiresAt).toLocaleDateString()}</p>

      <h3>Items</h3>
      {submission.items.map(item => (
        <div key={item.itemId}>
          <p>{item.artist} - {item.title}</p>
          <p>Condition: {item.conditionMedia} / {item.conditionSleeve}</p>
          <p>Qty: {item.quantity}</p>
          <p>Offer: ${item.totalOffer.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

### Optional: Seller History

Let sellers view all submissions:

```typescript
async function loadSellerHistory(email) {
  const res = await fetch(`/api/seller/submissions/${encodeURIComponent(email)}`);
  const response = await res.json();

  if (response.success) {
    // response.data.submissions is array of submissions
    // response.data.total is total count
    return response.data;
  }
}

// Support pagination:
const page = 1;
const limit = 10;
const res = await fetch(
  `/api/seller/submissions/${email}?limit=${limit}&offset=${(page-1)*limit}`
);
```

## Error Handling

All endpoints return structured errors. Handle them:

```typescript
async function apiCall(endpoint, options) {
  try {
    const res = await fetch(endpoint, options);
    const response = await res.json();

    if (!response.success) {
      const error = response.error;

      // Handle specific errors
      switch (error.code) {
        case 'INVALID_INPUT':
          showValidationError(error.message);
          break;
        case 'NOT_FOUND':
          showNotFoundError(error.message);
          break;
        case 'VALIDATION_ERROR':
          showFormError(error.message);
          break;
        default:
          showError(`Error: ${error.message}`);
      }

      return null;
    }

    return response.data;

  } catch (error) {
    showError('Network error. Please try again.');
    console.error(error);
    return null;
  }
}
```

## Sample Page Flow

```
┌─────────────────┐
│  Landing Page   │
│  Load conditions│
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│  Search Box      │
│  Display results │ ◄── Debounced search as user types
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Shopping Cart   │
│  - Item list     │
│  - Add/Remove    │
│  - Edit qty/cond │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Review & Quote  │ ◄── Fetch live quote
│  - Each item     │
│  - Total offer   │
│  - Expiry date   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Seller Info     │
│  - Email         │
│  - Phone (opt)   │
│  - Consent box   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Confirmation    │ ◄── Submit offer
│  - Sub# display  │
│  - Track link    │
└──────────────────┘
```

## Styling Tips

### Search Results
- Show match score as percentage or visual indicator
- Highlight matching fields (artist/title/barcode)
- Display cover art if available
- Show release year and genre

### Cart Items
- Card layout for each item
- Condition badges with color coding (Mint=green, VG=yellow, etc.)
- Editable quantity with +/- buttons
- Quick price display
- Remove button with confirm

### Quote Review
- Itemized table view
- Per-item breakdown available on click/hover
- Clear total with bold styling
- Expiry countdown timer

### Confirmation
- Large submission number for easy reference
- QR code to track (optional)
- Email confirmation note
- Print-friendly styles

## Performance Notes

1. **Debounce Search**: Add 300ms delay to avoid excessive requests
2. **Cache Conditions**: Load once at page start, reuse throughout
3. **Lazy Load Images**: Only load cover art when needed
4. **Batch Requests**: Consider combining related requests
5. **Rate Limiting**: Respect API rate limits (if implemented)

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Email validation fails | Check regex accepts all valid formats |
| Quote doesn't update | Re-fetch after cart changes |
| Submission never completes | Check email service logs |
| Search returns no results | Suggest spelling check |
| High latency on search | Add client-side caching |

---

**For detailed implementation, see `PLATFORM_004_IMPLEMENTATION.md`**
