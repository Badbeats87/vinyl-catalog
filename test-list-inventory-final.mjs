/**
 * Test script for listInventory function
 * Demonstrates require()-style usage with async/await
 *
 * Note: This project uses ES modules ("type": "module" in package.json)
 * and TypeScript, so we use import syntax but the pattern is equivalent
 * to require() in CommonJS projects.
 */

// Import the listInventory function (equivalent to require())
import { listInventory } from './src/api/admin-routes.js';

async function testListInventory() {
  console.log('Testing listInventory function...\n');
  console.log('Parameters:');
  console.log('  status: undefined');
  console.log('  channel: undefined');
  console.log('  releaseId: undefined');
  console.log('  minPrice: undefined');
  console.log('  maxPrice: undefined');
  console.log('  limit: 50');
  console.log('  offset: 0\n');

  try {
    // Call the function with the specified parameters
    const result = await listInventory(
      undefined,  // status
      undefined,  // channel
      undefined,  // releaseId
      undefined,  // minPrice
      undefined,  // maxPrice
      50,         // limit
      0           // offset
    );

    console.log('Full JSON Response:');
    console.log('==================');
    console.log(JSON.stringify(result, null, 2));

    // Additional information
    console.log('\n==================');
    console.log('Summary:');
    console.log(`Success: ${result.success}`);
    if (result.success && result.data) {
      console.log(`Total inventory lots: ${result.data.total}`);
      console.log(`Lots returned: ${result.data.lots.length}`);
    }
  } catch (error) {
    console.error('Error occurred:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
  }
}

// Run the test
testListInventory();
