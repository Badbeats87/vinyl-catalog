/**
 * Test script for listInventory function
 * Uses async/await with ES modules
 */

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
  } catch (error) {
    console.error('Error occurred:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
  }
}

// Run the test
testListInventory();
