import { prisma, disconnectPrisma } from './client.js';

async function main() {
  console.log('Starting database seed...');

  // 1. Seed condition tiers
  console.log('Seeding condition tiers...');

  const conditionTiers = [
    { name: 'Mint', order: 1, mediaAdjustment: 1.15, sleeveAdjustment: 1.15 },
    { name: 'NM', order: 2, mediaAdjustment: 1.0, sleeveAdjustment: 1.0 },
    { name: 'VG+', order: 3, mediaAdjustment: 0.85, sleeveAdjustment: 0.85 },
    { name: 'VG', order: 4, mediaAdjustment: 0.60, sleeveAdjustment: 0.60 },
    { name: 'VG-', order: 5, mediaAdjustment: 0.45, sleeveAdjustment: 0.45 },
    { name: 'G', order: 6, mediaAdjustment: 0.30, sleeveAdjustment: 0.30 },
  ];

  for (const tier of conditionTiers) {
    await prisma.conditionTier.upsert({
      where: { name: tier.name },
      update: {},
      create: tier,
    });
  }
  console.log(`✓ Created ${conditionTiers.length} condition tiers`);

  // 2. Seed default global pricing policy
  console.log('Seeding default global pricing policy...');

  await prisma.pricingPolicy.upsert({
    where: { id: 'default-global-policy' },
    update: {},
    create: {
      id: 'default-global-policy',
      name: 'Default Global Policy',
      description: 'Standard pricing policy applied to all releases unless overridden',
      scope: 'global',
      scopeValue: null,

      buyMarketSource: 'discogs',
      buyMarketStat: 'median',
      buyPercentage: 0.55,
      buyMinCap: 0.50,
      buyMaxCap: 500.0,
      offerExpiryDays: 7,

      sellMarketSource: 'discogs',
      sellMarketStat: 'median',
      sellPercentage: 1.25,
      sellMinCap: 1.99,
      sellMaxCap: null,

      applyConditionAdjustment: true,
      mediaWeight: 0.5,
      sleeveWeight: 0.5,

      roundingIncrement: 0.25,
      requiresManualReview: false,
      profitMarginTarget: 0.40,
      isActive: true,
    },
  });
  console.log('✓ Created default global pricing policy');

  // 3. Seed alternative policies for different use cases
  console.log('Seeding alternative pricing policies...');

  const policies = [
    {
      name: 'High-Value Bulk Policy',
      description: 'For large collections with average value >$20/item',
      scope: 'global',
      scopeValue: null,
      buyPercentage: 0.60,
      buyMinCap: 5.0,
      sellPercentage: 1.20,
      profitMarginTarget: 0.35,
    },
    {
      name: 'Rare/Collectible Policy',
      description: 'For scarce releases requiring careful pricing',
      scope: 'global',
      scopeValue: null,
      buyPercentage: 0.50,
      buyMarketStat: 'high',
      sellPercentage: 1.35,
      sellMarketStat: 'high',
      requiresManualReview: true,
      profitMarginTarget: 0.45,
    },
    {
      name: 'DJ/Used Policy',
      description: 'For worn records with lower condition expectations',
      scope: 'global',
      scopeValue: null,
      buyPercentage: 0.45,
      buyMinCap: 0.25,
      sellPercentage: 1.10,
      sellMinCap: 0.99,
      profitMarginTarget: 0.30,
    },
  ];

  for (const policy of policies) {
    await prisma.pricingPolicy.create({
      data: {
        name: policy.name,
        description: policy.description,
        scope: policy.scope,
        scopeValue: policy.scopeValue || null,
        buyPercentage: policy.buyPercentage,
        buyMinCap: policy.buyMinCap,
        sellPercentage: policy.sellPercentage,
        requiresManualReview: policy.requiresManualReview || false,
        profitMarginTarget: policy.profitMarginTarget,
        isActive: true,
      },
    });
  }
  console.log(`✓ Created ${policies.length} additional pricing policies`);

  // 4. Seed sample releases for testing
  console.log('Seeding sample releases...');

  const sampleReleases = [
    {
      title: 'The Dark Side of the Moon',
      artist: 'Pink Floyd',
      label: 'Harvest Records',
      catalogNumber: 'SHVL 804',
      barcode: '5099912345678',
      releaseYear: 1973,
      genre: 'Progressive Rock',
      coverArtUrl: 'https://example.com/cover1.jpg',
    },
    {
      title: 'Abbey Road',
      artist: 'The Beatles',
      label: 'Apple Records',
      catalogNumber: 'PCS 7088',
      barcode: '5099912345679',
      releaseYear: 1969,
      genre: 'Rock',
      coverArtUrl: 'https://example.com/cover2.jpg',
    },
    {
      title: 'Rumours',
      artist: 'Fleetwood Mac',
      label: 'Warner Bros. Records',
      catalogNumber: 'K56344',
      barcode: '5099912345680',
      releaseYear: 1977,
      genre: 'Rock',
      coverArtUrl: 'https://example.com/cover3.jpg',
    },
    {
      title: 'Kind of Blue',
      artist: 'Miles Davis',
      label: 'Columbia Records',
      catalogNumber: 'CL 1355',
      barcode: '5099912345681',
      releaseYear: 1959,
      genre: 'Jazz',
      coverArtUrl: 'https://example.com/cover4.jpg',
    },
  ];

  for (const release of sampleReleases) {
    await prisma.release.create({
      data: release,
    });
  }
  console.log(`✓ Created ${sampleReleases.length} sample releases`);

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
