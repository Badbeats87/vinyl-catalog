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
          genre: 'Progressive Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'SHVL 804',
          notes: 'Gatefold sleeve with poster',
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
          genre: 'Progressive Rock',
          format: 'Vinyl 2xLP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'SHSP 411',
          notes: 'Double album with full poster',
        },
        {
          id: 'disc-21',
          title: 'Wish You Were Here',
          artist: 'Pink Floyd',
          year: 1975,
          label: 'Harvest',
          price: 48.50,
          condition: 'NM',
          imageUrl: 'https://via.placeholder.com/100?text=WYWH',
          genre: 'Progressive Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'SHVL 814',
          notes: 'Reissue with gatefold sleeve',
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
          genre: 'Hip Hop',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Limited Edition',
          catalog: 'Griselda 001',
          notes: '500 copies pressed',
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
          genre: 'Hip Hop',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Standard Edition',
          catalog: 'Griselda 015',
          notes: 'Comes with artwork insert',
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
          genre: 'Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'PCS 7088',
          notes: 'Stereo version with original packaging',
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
          genre: 'Rock',
          format: 'Vinyl 2xLP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'PMC 7067-8',
          notes: 'Double album with poster and photos',
        },
        {
          id: 'disc-22',
          title: 'Sgt. Pepper\'s Lonely Hearts Club Band',
          artist: 'The Beatles',
          year: 1967,
          label: 'Parlophone',
          price: 42.00,
          condition: 'VG',
          imageUrl: 'https://via.placeholder.com/100?text=Sgt+Pepper',
          genre: 'Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'PCS 7027',
          notes: 'Includes printed inner sleeve and inserts',
        },
        {
          id: 'disc-23',
          title: 'Revolver',
          artist: 'The Beatles',
          year: 1966,
          label: 'Parlophone',
          price: 41.00,
          condition: 'VG+',
          imageUrl: 'https://via.placeholder.com/100?text=Revolver',
          genre: 'Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'PCS 7009',
          notes: 'Black label pressing',
        },
      ],
      'david bowie': [
        {
          id: 'disc-24',
          title: 'The Rise and Fall of Ziggy Stardust and the Spiders from Mars',
          artist: 'David Bowie',
          year: 1972,
          label: 'RCA',
          price: 44.50,
          condition: 'VG+',
          imageUrl: 'https://via.placeholder.com/100?text=Ziggy+Stardust',
          genre: 'Glam Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'SF 8287',
          notes: 'Gatefold sleeve with inner sleeve',
        },
      ],
      'led zeppelin': [
        {
          id: 'disc-25',
          title: 'Led Zeppelin IV',
          artist: 'Led Zeppelin',
          year: 1971,
          label: 'Atlantic',
          price: 50.00,
          condition: 'VG',
          imageUrl: 'https://via.placeholder.com/100?text=Zeppelin+IV',
          genre: 'Hard Rock',
          format: 'Vinyl LP',
          rpm: 33,
          pressType: 'Original Pressing',
          catalog: 'SD 19129',
          notes: 'Includes printed sleeve and symbols poster',
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
        );
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
