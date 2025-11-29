// CommonJS script to query all inventory lots
const { PrismaClient } = require('@prisma/client');

async function queryAllInventoryLots() {
  const prisma = new PrismaClient();

  try {
    console.log('Querying all inventory lots...\n');

    const inventoryLots = await prisma.inventoryLot.findMany({
      select: {
        id: true,
        lotNumber: true,
        releaseId: true,
        status: true,
        quantity: true,
        availableQuantity: true,
        costBasis: true,
        listPrice: true,
        channel: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${inventoryLots.length} inventory lot(s)\n`);
    console.log('='.repeat(80));
    console.log('ALL INVENTORY LOTS:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(inventoryLots, null, 2));

    return inventoryLots;
  } catch (error) {
    console.error('Error querying inventory lots:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the query
queryAllInventoryLots()
  .then(() => {
    console.log('\n' + '='.repeat(80));
    console.log('Query completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nQuery failed:', error);
    process.exit(1);
  });
