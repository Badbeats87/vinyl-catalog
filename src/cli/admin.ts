#!/usr/bin/env node

import * as readline from 'readline';
import {
  createRelease,
  getReleaseById,
  searchReleases,
  updateRelease,
  deleteRelease,
  countReleases,
} from '../services/releases';
import {
  createPricingPolicy,
  getPricingPolicyById,
  getActivePolicies,
  countActivePolicies,
} from '../services/pricing-policies';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function showMainMenu() {
  console.log('\n=== Vinyl Catalog Admin CLI ===');
  console.log('1. Manage Releases');
  console.log('2. Manage Pricing Policies');
  console.log('3. View Statistics');
  console.log('4. Exit');

  const choice = await prompt('Select option (1-4): ');
  return choice;
}

async function showReleaseMenu() {
  console.log('\n=== Release Management ===');
  console.log('1. Create Release');
  console.log('2. Search Releases');
  console.log('3. View Release');
  console.log('4. Update Release');
  console.log('5. Delete Release');
  console.log('6. Back to Main Menu');

  const choice = await prompt('Select option (1-6): ');
  return choice;
}

async function createReleaseFlow() {
  console.log('\n--- Create New Release ---');

  const title = await prompt('Title: ');
  const artist = await prompt('Artist: ');
  const label = await prompt('Label (optional): ');
  const catalogNumber = await prompt('Catalog Number (optional): ');
  const barcode = await prompt('Barcode (optional): ');
  const releaseYearStr = await prompt('Release Year (optional): ');
  const genre = await prompt('Genre (optional): ');
  const coverArtUrl = await prompt('Cover Art URL (optional): ');

  try {
    const release = await createRelease({
      title,
      artist,
      label: label || undefined,
      catalogNumber: catalogNumber || undefined,
      barcode: barcode || undefined,
      releaseYear: releaseYearStr ? parseInt(releaseYearStr) : undefined,
      genre: genre || undefined,
      coverArtUrl: coverArtUrl || undefined,
    });

    console.log('\n✓ Release created successfully!');
    console.log(`ID: ${release.id}`);
    console.log(`Title: ${release.title}`);
    console.log(`Artist: ${release.artist}`);
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function searchReleasesFlow() {
  console.log('\n--- Search Releases ---');
  const query = await prompt('Search (artist/title): ');

  try {
    const results = await searchReleases(query, 10);
    if (results.length === 0) {
      console.log('No releases found.');
      return;
    }

    console.log(`\nFound ${results.length} releases:\n`);
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.artist} - ${r.title}`);
      console.log(`   ID: ${r.id}`);
      console.log(`   Genre: ${r.genre}`);
      console.log('');
    });
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function viewReleaseFlow() {
  console.log('\n--- View Release ---');
  const id = await prompt('Release ID: ');

  try {
    const release = await getReleaseById(id);
    if (!release) {
      console.log('Release not found.');
      return;
    }

    console.log('\n=== Release Details ===');
    console.log(`ID: ${release.id}`);
    console.log(`Title: ${release.title}`);
    console.log(`Artist: ${release.artist}`);
    console.log(`Label: ${release.label || 'N/A'}`);
    console.log(`Catalog #: ${release.catalogNumber || 'N/A'}`);
    console.log(`Barcode: ${release.barcode || 'N/A'}`);
    console.log(`Year: ${release.releaseYear || 'N/A'}`);
    console.log(`Genre: ${release.genre || 'N/A'}`);
    console.log(`Created: ${release.createdAt.toISOString()}`);
    console.log(`Updated: ${release.updatedAt.toISOString()}`);
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function updateReleaseFlow() {
  console.log('\n--- Update Release ---');
  const id = await prompt('Release ID: ');

  try {
    const release = await getReleaseById(id);
    if (!release) {
      console.log('Release not found.');
      return;
    }

    console.log('Current values (press Enter to skip):');
    const title = await prompt(`Title [${release.title}]: `);
    const artist = await prompt(`Artist [${release.artist}]: `);
    const genre = await prompt(`Genre [${release.genre || 'N/A'}]: `);

    const updated = await updateRelease(id, {
      title: title || undefined,
      artist: artist || undefined,
      genre: genre || undefined,
    });

    if (updated) {
      console.log('\n✓ Release updated successfully!');
    }
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function deleteReleaseFlow() {
  console.log('\n--- Delete Release ---');
  const id = await prompt('Release ID: ');
  const confirm = await prompt('Are you sure? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }

  try {
    const success = await deleteRelease(id);
    if (success) {
      console.log('✓ Release deleted successfully!');
    } else {
      console.log('Release not found.');
    }
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function showPolicyMenu() {
  console.log('\n=== Pricing Policy Management ===');
  console.log('1. Create Policy');
  console.log('2. View Policy');
  console.log('3. Update Policy');
  console.log('4. List Active Policies');
  console.log('5. Deactivate Policy');
  console.log('6. Back to Main Menu');

  const choice = await prompt('Select option (1-6): ');
  return choice;
}

async function createPolicyFlow() {
  console.log('\n--- Create New Pricing Policy ---');

  const name = await prompt('Policy Name: ');
  const description = await prompt('Description (optional): ');
  const scope = await prompt('Scope (global/genre/release) [global]: ') || 'global';
  const scopeValue =
    scope !== 'global' ? await prompt(`${scope === 'genre' ? 'Genre' : 'Release ID'}: `) : undefined;

  const buyPercentageStr = await prompt('Buy Percentage (e.g., 0.55 for 55%) [0.55]: ') || '0.55';
  const sellPercentageStr =
    (await prompt('Sell Percentage (e.g., 1.25 for 125%) [1.25]: ')) || '1.25';

  try {
    const policy = await createPricingPolicy({
      name,
      description: description || undefined,
      scope: scope as 'global' | 'genre' | 'release',
      scopeValue,
      buyPercentage: parseFloat(buyPercentageStr),
      sellPercentage: parseFloat(sellPercentageStr),
      isActive: true,
    });

    console.log('\n✓ Pricing policy created successfully!');
    console.log(`ID: ${policy.id}`);
    console.log(`Name: ${policy.name}`);
    console.log(`Scope: ${policy.scope}`);
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function viewPolicyFlow() {
  console.log('\n--- View Pricing Policy ---');
  const id = await prompt('Policy ID: ');

  try {
    const policy = await getPricingPolicyById(id);
    if (!policy) {
      console.log('Policy not found.');
      return;
    }

    console.log('\n=== Policy Details ===');
    console.log(`ID: ${policy.id}`);
    console.log(`Name: ${policy.name}`);
    console.log(`Scope: ${policy.scope}`);
    console.log(`Active: ${policy.isActive}`);
    console.log(`Buy %: ${(policy.buyPercentage * 100).toFixed(0)}%`);
    console.log(`Sell %: ${(policy.sellPercentage * 100).toFixed(1)}%`);
    console.log(`Created: ${policy.createdAt.toISOString()}`);
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function listPoliciesFlow() {
  try {
    const policies = await getActivePolicies(0, 20);
    if (policies.length === 0) {
      console.log('No active policies found.');
      return;
    }

    console.log(`\nActive Policies (${policies.length}):\n`);
    policies.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Scope: ${p.scope}`);
      console.log(`   Buy: ${(p.buyPercentage * 100).toFixed(0)}% | Sell: ${(p.sellPercentage * 100).toFixed(1)}%`);
      console.log('');
    });
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function showStatsMenu() {
  console.log('\n=== System Statistics ===');

  try {
    const releaseCount = await countReleases();
    const policyCount = await countActivePolicies();

    console.log(`Total Releases: ${releaseCount}`);
    console.log(`Active Policies: ${policyCount}`);
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function main() {
  console.log('Welcome to Vinyl Catalog Admin CLI');

  let running = true;
  while (running) {
    const mainChoice = await showMainMenu();

    switch (mainChoice) {
      case '1':
        let releaseRunning = true;
        while (releaseRunning) {
          const releaseChoice = await showReleaseMenu();
          switch (releaseChoice) {
            case '1':
              await createReleaseFlow();
              break;
            case '2':
              await searchReleasesFlow();
              break;
            case '3':
              await viewReleaseFlow();
              break;
            case '4':
              await updateReleaseFlow();
              break;
            case '5':
              await deleteReleaseFlow();
              break;
            case '6':
              releaseRunning = false;
              break;
            default:
              console.log('Invalid option');
          }
        }
        break;

      case '2':
        let policyRunning = true;
        while (policyRunning) {
          const policyChoice = await showPolicyMenu();
          switch (policyChoice) {
            case '1':
              await createPolicyFlow();
              break;
            case '2':
              await viewPolicyFlow();
              break;
            case '3':
              console.log('Update policy: Not yet implemented');
              break;
            case '4':
              await listPoliciesFlow();
              break;
            case '5':
              console.log('Deactivate policy: Not yet implemented');
              break;
            case '6':
              policyRunning = false;
              break;
            default:
              console.log('Invalid option');
          }
        }
        break;

      case '3':
        await showStatsMenu();
        break;

      case '4':
        running = false;
        break;

      default:
        console.log('Invalid option');
    }
  }

  console.log('\nGoodbye!');
  rl.close();
  process.exit(0);
}

main().catch(console.error);
