import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();
const DISCOGS_API_TOKEN = process.env.DISCOGS_API_TOKEN;
const DISCOGS_API_URL = 'https://api.discogs.com';

// Search Discogs API for vinyl releases
router.post('/discogs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, page = 1 } = req.body;
    if (!query) {
      res.json({ success: false, error: 'Search query required' });
      return;
    }

    // Search real Discogs API with vinyl format filter
    const response = await axios.get(`${DISCOGS_API_URL}/database/search`, {
      params: {
        q: query,
        token: DISCOGS_API_TOKEN,
        format: 'Vinyl',
        per_page: 100,
        page: page,
        type: 'release',
      },
      headers: {
        'User-Agent': 'VinylCatalogApp/1.0',
      },
    });

    // Transform Discogs results to our format with marketplace pricing
    const results = await Promise.all(
      response.data.results.map(async (item: any) => {
        // Better artist/title parsing
        const titleParts = item.title?.split(' - ') || [];
        let artist = 'Various Artists';
        let albumTitle = item.title || 'Unknown';

        if (titleParts.length >= 2) {
          artist = titleParts[0].trim();
          albumTitle = titleParts.slice(1).join(' - ').trim();
        } else if (item.artists && item.artists.length > 0) {
          artist = item.artists[0].name || titleParts[0] || 'Various Artists';
        }

        // Fetch real marketplace pricing from Discogs
        let price = null;

        try {
          const statsResponse = await axios.get(
            `${DISCOGS_API_URL}/marketplace/stats/${item.id}`,
            {
              params: { token: DISCOGS_API_TOKEN, curr_abbr: 'USD' },
              headers: { 'User-Agent': 'VinylCatalogApp/1.0' },
            }
          );

          // Discogs returns lowest_price as an object with value and currency
          if (statsResponse.data?.lowest_price) {
            const lowestValue = statsResponse.data.lowest_price.value || statsResponse.data.lowest_price;
            const lowestPrice = parseFloat(lowestValue);
            if (!isNaN(lowestPrice) && lowestPrice > 0) {
              price = parseFloat(lowestPrice.toFixed(2));
            }
          }
        } catch (err: any) {
          // Marketplace pricing not available - record has no active listings
        }

        // If no marketplace data, set price to null (don't show made-up prices)
        // This makes it clear when real pricing is unavailable
        if (!price) {
          price = null;
        }

        // Build concise notes from available data
        const noteParts = [];
        if (item.country) noteParts.push(item.country);
        if (item.format_quantity) noteParts.push(`${item.format_quantity} LP${item.format_quantity > 1 ? 's' : ''}`);
        const notes = noteParts.length > 0 ? noteParts.join(' • ') : 'Vinyl record';

        return {
          id: `disc-${item.id}`,
          discogsId: item.id,
          title: albumTitle,
          artist: artist,
          year: item.year ? parseInt(item.year) : null,
          label: Array.isArray(item.label) ? item.label[0] : item.label || 'Unknown Label',
          price: price,
          condition: price ? null : null,
          imageUrl: item.cover_image || item.thumb || null,
          genre: Array.isArray(item.genre) ? item.genre.join(', ') : (item.genre || 'Various'),
          format: Array.isArray(item.format) ? item.format.join(', ') : item.format || 'Vinyl LP',
          rpm: item.format && Array.isArray(item.format) && item.format.some((f: string) => f.includes('33')) ? 33 : 45,
          pressType: 'Release',
          catalog: item.catno || '',
          notes: notes,
          masterId: item.master_id,
          resourceUrl: item.resource_url,
        };
      })
    );

    res.json({
      success: true,
      source: 'discogs',
      query: query,
      results: results,
      count: results.length,
      pagination: {
        page: page,
        perPage: 100,
        total: response.data.pagination?.items || results.length,
        pages: response.data.pagination?.pages || 1,
      },
    });
  } catch (err: any) {
    console.error('Discogs API error:', err.message);
    res.status(500).json({
      success: false,
      error: `Discogs API error: ${err.message}`
    });
  }
});

// Search eBay API for vinyl releases
router.post('/ebay', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query) {
      res.json({ success: false, error: 'Search query required' });
      return;
    }

    // Mock eBay database with query-aware results
    const ebayDatabase: Record<string, any[]> = {
      'pink floyd': [
        {
          id: 'ebay-1',
          title: 'Dark Side of the Moon - Original Press',
          artist: 'Pink Floyd',
          year: 1973,
          label: 'Harvest',
          price: 52.99,
          condition: 'Excellent',
          imageUrl: 'https://via.placeholder.com/100?text=DSOTM',
          genre: 'Progressive Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'SHVL 804',
          notes: 'Includes inserts and poster',
        },
        {
          id: 'ebay-3',
          title: 'Wish You Were Here - Sealed',
          artist: 'Pink Floyd',
          year: 1975,
          label: 'Harvest',
          price: 48.50,
          condition: 'Mint',
          imageUrl: 'https://via.placeholder.com/100?text=WYWH',
          genre: 'Progressive Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'First Pressing',
          catalog: 'SHVL 814',
          notes: 'Still in original shrink wrap',
        },
        {
          id: 'ebay-26',
          title: 'Animals',
          artist: 'Pink Floyd',
          year: 1977,
          label: 'Harvest',
          price: 45.00,
          condition: 'Very Good Plus',
          imageUrl: 'https://via.placeholder.com/100?text=Animals',
          genre: 'Progressive Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'SHVL 815',
          notes: 'Gatefold sleeve with inner sleeve',
        },
      ],
      'michael jackson': [
        {
          id: 'ebay-2',
          title: 'Thriller',
          artist: 'Michael Jackson',
          year: 1982,
          label: 'Epic',
          price: 22.50,
          condition: 'Very Good',
          imageUrl: 'https://via.placeholder.com/100?text=Thriller',
          genre: 'Pop',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'QE 38112',
          notes: 'Includes lyric sheet',
        },
        {
          id: 'ebay-7',
          title: 'Bad - Limited Edition',
          artist: 'Michael Jackson',
          year: 1987,
          label: 'Epic',
          price: 35.00,
          condition: 'Excellent',
          imageUrl: 'https://via.placeholder.com/100?text=Bad',
          genre: 'Pop',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'OE 40600',
          notes: 'Special edition with bonus booklet',
        },
      ],
      'westside gunn': [
        {
          id: 'ebay-8',
          title: 'Pray for Paris - Limited',
          artist: 'Westside Gunn',
          year: 2020,
          label: 'Griselda',
          price: 42.99,
          condition: 'Mint',
          imageUrl: 'https://via.placeholder.com/100?text=Pray+for+Paris+eBay',
          genre: 'Hip Hop',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Limited Edition',
          catalog: 'Griselda 001',
          notes: '500 copies on clear vinyl',
        },
      ],
      'the beatles': [
        {
          id: 'ebay-4',
          title: 'Abbey Road - Original Pressing',
          artist: 'The Beatles',
          year: 1969,
          label: 'Apple',
          price: 55.00,
          condition: 'Excellent',
          imageUrl: 'https://via.placeholder.com/100?text=Abbey+Road',
          genre: 'Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'PCS 7088',
          notes: 'Stereo pressing with all inserts',
        },
        {
          id: 'ebay-5',
          title: 'Sgt. Pepper - Reissue',
          artist: 'The Beatles',
          year: 1967,
          label: 'Parlophone',
          price: 28.99,
          condition: 'Very Good',
          imageUrl: 'https://via.placeholder.com/100?text=Sgt+Pepper',
          genre: 'Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Reissue',
          catalog: 'PCS 7027',
          notes: 'Includes reproduction inserts',
        },
        {
          id: 'ebay-27',
          title: 'The Beatles (White Album)',
          artist: 'The Beatles',
          year: 1968,
          label: 'Apple',
          price: 62.99,
          condition: 'Very Good Plus',
          imageUrl: 'https://via.placeholder.com/100?text=White+Album+eBay',
          genre: 'Rock',
          format: 'Vinyl 2xLP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'PMC 7067-8',
          notes: 'Double album with photos and poster',
        },
      ],
      'queen': [
        {
          id: 'ebay-28',
          title: 'Bohemian Rhapsody',
          artist: 'Queen',
          year: 1975,
          label: 'EMI',
          price: 36.50,
          condition: 'Excellent',
          imageUrl: 'https://via.placeholder.com/100?text=Bohemian+Rhapsody',
          genre: 'Rock Opera',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'EMC 3044',
          notes: 'Classic single album',
        },
      ],
    };

    // Search for matching results (case-insensitive)
    const lowerQuery = query.toLowerCase();
    let mockResults = ebayDatabase[lowerQuery] || [];

    // If no exact match, search by partial match in titles/artists
    if (mockResults.length === 0) {
      mockResults = Object.values(ebayDatabase)
        .flat()
        .filter(
          (item) =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.artist.toLowerCase().includes(lowerQuery)
        );
    }

    res.json({
      success: true,
      source: 'ebay',
      query: query,
      results: mockResults,
      count: mockResults.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Import a release and create/update in database
router.post('/import-release', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, artist, year, label, imageUrl } = req.body;

    if (!title || !artist) {
      res.json({ success: false, error: 'Title and artist required' });
      return;
    }

    // Check if release already exists
    const existing = await prisma.release.findFirst({
      where: {
        title: { mode: 'insensitive', equals: title },
        artist: { mode: 'insensitive', equals: artist },
      },
    });

    let release;
    if (existing) {
      release = existing;
    } else {
      release = await prisma.release.create({
        data: {
          title,
          artist,
          releaseYear: year,
          label,
          coverArtUrl: imageUrl,
        },
      });
    }

    res.json({
      success: true,
      message: existing ? 'Release already exists' : 'Release imported',
      release,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
