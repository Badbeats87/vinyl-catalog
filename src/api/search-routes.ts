import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Search Discogs API for vinyl releases
router.post('/discogs', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.json({ success: false, error: 'Search query required' });
    }

    // Mock Discogs search results - returns results based on query
    const discogsDatabase: Record<string, any[]> = {
      'pink floyd': [
        {
          id: 'disc-1',
          title: 'Dark Side of the Moon',
          artist: 'Pink Floyd',
          year: 1973,
          label: 'Harvest',
          price: 45.99,
          condition: 'VG+',
          imageUrl: 'https://via.placeholder.com/100?text=DSOTM',
        },
        {
          id: 'disc-3',
          title: 'The Wall',
          artist: 'Pink Floyd',
          year: 1979,
          label: 'Harvest',
          price: 52.00,
          condition: 'VG',
          imageUrl: 'https://via.placeholder.com/100?text=The+Wall',
        },
      ],
      'westside gunn': [
        {
          id: 'disc-4',
          title: 'Pray for Paris',
          artist: 'Westside Gunn',
          year: 2020,
          label: 'Griselda',
          price: 35.99,
          condition: 'NM',
          imageUrl: 'https://via.placeholder.com/100?text=Pray+for+Paris',
        },
        {
          id: 'disc-5',
          title: 'Adolf Satan',
          artist: 'Westside Gunn',
          year: 2021,
          label: 'Griselda',
          price: 32.50,
          condition: 'M',
          imageUrl: 'https://via.placeholder.com/100?text=Adolf+Satan',
        },
      ],
      'the beatles': [
        {
          id: 'disc-2',
          title: 'Abbey Road',
          artist: 'The Beatles',
          year: 1969,
          label: 'Apple',
          price: 38.50,
          condition: 'NM',
          imageUrl: 'https://via.placeholder.com/100?text=Abbey+Road',
        },
        {
          id: 'disc-6',
          title: 'The White Album',
          artist: 'The Beatles',
          year: 1968,
          label: 'Apple',
          price: 55.00,
          condition: 'VG+',
          imageUrl: 'https://via.placeholder.com/100?text=White+Album',
        },
      ],
    };

    // Search for matching results (case-insensitive)
    const lowerQuery = query.toLowerCase();
    let mockResults = discogsDatabase[lowerQuery] || [];

    // If no exact match, search by partial match in titles/artists
    if (mockResults.length === 0) {
      mockResults = Object.values(discogsDatabase)
        .flat()
        .filter(
          (item) =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.artist.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 5);
    }

    // If still no results, return empty with message
    if (mockResults.length === 0) {
      mockResults = [];
    }

    res.json({
      success: true,
      source: 'discogs',
      query: query,
      results: mockResults,
      count: mockResults.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Search eBay API for vinyl releases
router.post('/ebay', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.json({ success: false, error: 'Search query required' });
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
        )
        .slice(0, 5);
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
router.post('/import-release', async (req: Request, res: Response) => {
  try {
    const { title, artist, year, label, imageUrl, source } = req.body;

    if (!title || !artist) {
      return res.json({ success: false, error: 'Title and artist required' });
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
