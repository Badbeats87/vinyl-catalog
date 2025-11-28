/**
 * This script generates the authenticated version of index.ts
 * Run with: npx ts-node scripts/apply-auth.ts
 */

import fs from 'fs';
import path from 'path';

const indexPath = path.join(__dirname, '../src/index.ts');

// Read the current index.ts
const content = fs.readFileSync(indexPath, 'utf-8');

// Define route protection patterns
// Format: [route pattern to match, [middleware to insert]]
const adminRoutesPattern = /^(app\.(get|post|put|delete|patch)\('\/api\/admin/gm;
const sellerRoutesPattern = /^(app\.(get|post|put|delete|patch)\('\/api\/seller/gm;
const buyerCheckoutRoutesPattern = /^(app\.(get|post|put|delete|patch)\('\/api\/buyer\/(cart|orders)/gm;

console.log('Authenticating routes in index.ts...');

// For all admin routes, prepend authenticate and requireAdmin
let newContent = content.replace(
  /^(app\.(get|post|put|delete|patch)\('\/api\/admin\/[^']+',\s*)(async\s+\(req:\s*Request,)/gm,
  "$1authenticate, requireAdmin, $3"
);

// For seller routes, prepend authenticate and requireSeller
newContent = newContent.replace(
  /^(app\.(get|post|put|delete|patch)\('\/api\/seller\/[^']+',\s*)(async\s+\(req:\s*Request,)/gm,
  "$1authenticate, requireSeller, $3"
);

// For buyer cart and order routes, prepend authenticate and requireBuyer
newContent = newContent.replace(
  /^(app\.(get|post|put|delete|patch)\('\/api\/buyer\/(cart|orders)[^']+',\s*)(async\s+\(req:\s*Request,)/gm,
  "$1authenticate, requireBuyer, $3"
);

// Update section comment for admin
newContent = newContent.replace(
  '// ============================================================================\n// ADMIN API ROUTES (Protected - Admin Only)\n// ============================================================================',
  '// ============================================================================\n// ADMIN API ROUTES (Protected - Admin Only)\n// ============================================================================\n// All routes in this section require: authenticate + requireAdmin middleware'
);

// Update section comment for seller
newContent = newContent.replace(
  '// ============================================================================\n// SELLER API ROUTES\n// ============================================================================',
  '// ============================================================================\n// SELLER API ROUTES (Protected - Seller Only)\n// ============================================================================\n// All routes in this section require: authenticate + requireSeller middleware'
);

// Update section comment for buyer checkout
newContent = newContent.replace(
  '// ============================================================================\n// BUYER CHECKOUT API ROUTES\n// ============================================================================',
  '// ============================================================================\n// BUYER CHECKOUT API ROUTES (Protected - Buyer Only)\n// ============================================================================\n// Cart and order routes require: authenticate + requireBuyer middleware'
);

// Write back
fs.writeFileSync(indexPath, newContent, 'utf-8');
console.log('✓ Routes authenticated successfully');
