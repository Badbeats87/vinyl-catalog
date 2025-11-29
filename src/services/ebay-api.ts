/**
 * eBay API Integration Service
 * Handles eBay API authentication and market data retrieval
 */

interface EbayTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface EbaySearchResult {
  itemSummaries?: Array<{
    title: string;
    price?: {
      value: string;
      currency: string;
    };
    itemId?: string;
    condition?: string;
    sellingStatus?: {
      currentSellingPrice?: {
        value: string;
        currency: string;
      };
    };
  }>;
}

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

const EBAY_SANDBOX_API_URL = 'https://api.sandbox.ebay.com';
const EBAY_PROD_API_URL = 'https://api.ebay.com';

// eBay credentials must be provided via environment variables
const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID;
const EBAY_ENVIRONMENT = process.env.EBAY_ENVIRONMENT || 'sandbox';

const API_URL = EBAY_ENVIRONMENT === 'production' ? EBAY_PROD_API_URL : EBAY_SANDBOX_API_URL;

/**
 * Get OAuth2 access token from eBay
 */
async function getEbayAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedAccessToken && tokenExpiryTime > Date.now()) {
    return cachedAccessToken;
  }

  try {
    const auth = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64');

    const response = await fetch(`${API_URL}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[eBay] Token request failed: ${response.status} - ${error}`);
      throw new Error(`eBay authentication failed: ${response.status}`);
    }

    const data = (await response.json()) as EbayTokenResponse;
    cachedAccessToken = data.access_token;
    tokenExpiryTime = Date.now() + (data.expires_in * 1000);

    console.log(`[eBay] New access token obtained, expires in ${data.expires_in}s`);
    return data.access_token;
  } catch (err) {
    console.error(`[eBay] Failed to get access token:`, err);
    throw err;
  }
}

/**
 * Search eBay for records by title and artist
 */
export async function searchEbayRecords(
  title: string,
  artist: string,
  limit: number = 5
): Promise<Array<{ price: number; source: string }>> {
  try {
    const accessToken = await getEbayAccessToken();

    // Try multiple search strategies, starting with the most specific
    const searchQueries = [
      `${artist} ${title}`, // Full artist and title
      `${title}`, // Just title
      title.split(' ').slice(0, 3).join(' '), // First 3 words of title
    ];

    // Remove special characters and asterisks that eBay might not handle well
    const cleanedQueries = searchQueries.map(q =>
      q
        .replace(/\*+/g, '') // Remove asterisks
        .replace(/[®™©]/g, '') // Remove trademark symbols
        .trim()
    );

    for (const query of cleanedQueries) {
      if (!query) continue;

      const searchUrl = new URL(`${API_URL}/buy/browse/v1/item_summary/search`);
      searchUrl.searchParams.append('q', query);
      searchUrl.searchParams.append('limit', limit.toString());
      searchUrl.searchParams.append('sort', 'price'); // Sort by price ascending

      console.log(`[eBay] Searching for: "${query}"`);

      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[eBay] Search request failed: ${response.status} - ${errorText}`);
        continue;
      }

      const data = (await response.json()) as EbaySearchResult;

      // Debug: Log the full response to understand what eBay is returning
      console.log(`[eBay] Full response for "${query}":`, JSON.stringify(data, null, 2));

      if (!data.itemSummaries || data.itemSummaries.length === 0) {
        console.log(`[eBay] No listings found for: "${query}"`);
        continue;
      }

      // Extract prices from results
      const prices = data.itemSummaries
        .filter(item => item.price?.value)
        .map(item => {
          const priceStr = item.price?.value || '0';
          const price = parseFloat(priceStr);
          return {
            price,
            source: 'ebay',
            title: item.title,
            condition: item.condition,
          };
        });

      if (prices.length > 0) {
        console.log(
          `[eBay] Found ${prices.length} listings. Prices: ${prices.map(p => `$${p.price}`).join(', ')}`
        );
        return prices;
      }
    }

    console.log(`[eBay] No listings found after trying all search strategies for "${title}"`);
    return [];
  } catch (err) {
    console.error(`[eBay] Search failed for "${title}" by ${artist}:`, err);
    return [];
  }
}

/**
 * Get eBay market data (low, median, high prices)
 */
export async function getEbayMarketData(title: string, artist: string) {
  try {
    const prices = await searchEbayRecords(title, artist, 10);

    if (prices.length === 0) {
      console.log(`[eBay] No market data available for "${title}"`);
      return null;
    }

    // Sort prices
    const sortedPrices = prices.map(p => p.price).sort((a, b) => a - b);

    // Calculate statistics
    const low = sortedPrices[0];
    const high = sortedPrices[sortedPrices.length - 1];
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];

    console.log(
      `[eBay] Market data - Low: $${low}, Median: $${median}, High: $${high}`
    );

    return {
      source: 'ebay',
      statLow: low,
      statMedian: median,
      statHigh: high,
    };
  } catch (err) {
    console.error(`[eBay] Failed to get market data:`, err);
    return null;
  }
}
