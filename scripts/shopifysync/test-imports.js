/**
 * Test script to verify that all imports are working correctly
 */
require('dotenv').config({ path: '.env.local' });

try {
  console.log('Testing imports...');
  
  // Test core modules
  console.log('Loading shopify-sync-utils...');
  const utils = require('./shopify-sync-utils');
  
  console.log('Loading shopify-sync-config...');
  const config = require('./shopify-sync-config');
  
  console.log('Loading shopify-api...');
  const api = require('./shopify-api');
  
  console.log('Loading shopify-sync...');
  const sync = require('./shopify-sync');
  
  console.log('Loading customer-processor...');
  const customerProcessor = require('./customer-processor');
  
  console.log('Loading order-processor...');
  const orderProcessor = require('./order-processor');
  
  // Skip run-shopify-import as it auto-executes
  console.log('Loading run-shopify-import (skipped - auto-executes)...');
  
  console.log('Loading cleanup-2025-data...');
  const cleanup = require('./cleanup-2025-data');
  
  console.log('Loading check-new-customers-simple...');
  const checkNewCustomers = require('./check-new-customers-simple');
  
  console.log('Loading verify-new-customers...');
  const verifyNewCustomers = require('./verify-new-customers');
  
  console.log('Loading verify-second-orders...');
  const verifySecondOrders = require('./verify-second-orders');
  
  console.log('\n✅ All imports successful!');
} catch (error) {
  console.error('\n❌ Import error:', error);
}
