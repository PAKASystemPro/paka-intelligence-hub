/**
 * Main script for Shopify data synchronization
 * 
 * Enhanced to properly handle:
 * - Customer-order mapping with improved two-step approach
 * - Order tags processing and storage
 * - Sales channel information
 */
require('dotenv').config({ path: '.env.local' });
const { initSupabaseClient, getPublicSchemaClient, checkExistingData, logValidationResults } = require('./shopify-sync-utils');
const { fetchMonthlyOrders } = require('./shopify-api');
const { extractCustomersFromOrders, getCustomerIds, insertCustomers, classifyNewCustomers } = require('./customer-processor');
const { 
  prepareOrdersForInsertion, 
  insertOrders, 
  extractLineItems, 
  insertLineItems, 
  refreshMaterializedViews,
  processOrderTags,
  processSalesChannel
} = require('./order-processor');
const { REFERENCE_DATA } = require('./shopify-sync-config');

/**
 * Process a single month of Shopify data
 */
async function processSingleMonth(year, month, options = {}) {
  const { forceSync = false, skipExistingCheck = false } = options;
  const monthFormatted = month.toString().padStart(2, '0');
  console.log(`\n===== Processing ${year}-${monthFormatted} =====`);
  
  // Check if data already exists for this month
  if (!skipExistingCheck && !forceSync) {
    try {
      const existingData = await checkExistingData(year, month);
      
      if (existingData.hasExistingData) {
        console.log(`Data already exists for ${year}-${monthFormatted} (${existingData.orderCount} orders found)`);
        console.log('Use forceSync=true to override and sync anyway');
        
        // Return early with validation against reference data
        const monthKey = `${year}-${monthFormatted}`;
        if (REFERENCE_DATA[monthKey]) {
          logValidationResults(year, month, { orders: existingData.orderCount }, REFERENCE_DATA[monthKey]);
        }
        
        return {
          skipped: true,
          existingOrderCount: existingData.orderCount
        };
      }
    } catch (error) {
      console.error('Error checking existing data:', error);
      // Continue with sync even if check fails
    }
  }
  
  let result = {
    orders: 0,
    customers: 0,
    lineItems: 0
  };
  
  try {
    // Step 1: Fetch orders from Shopify
    console.log('\nStep 1: Fetching orders from Shopify...');
    const orders = await fetchMonthlyOrders(year, month);
    console.log(`Fetched ${orders.length} orders from Shopify`);
    
    // Step 2: Extract and insert customers
    console.log('\nStep 2: Extracting customers...');
    const customersMap = extractCustomersFromOrders(orders);
    
    // Convert customer map to array for insertion
    let customersArray = [];
    if (customersMap instanceof Map) {
      console.log(`Extracted ${customersMap.size} unique customers`);
      customersArray = Array.from(customersMap.values());
    } else {
      console.log(`Extracted ${Object.keys(customersMap).length} unique customers`);
      customersArray = Object.values(customersMap);
    }
    
    console.log('\nStep 3: Inserting customers...');
    const customerResult = await insertCustomers(customersArray);
    const insertedCustomerCount = customerResult.inserted + customerResult.updated || 0;
    console.log(`Customer processing complete: ${customerResult.inserted} inserted, ${customerResult.updated} updated, ${customerResult.failed} failed`);
    
    // Step 4: Get customer IDs for order association - ENHANCED TWO-STEP APPROACH
    console.log('\nStep 4: Fetching customer IDs for order association...');
    const customerIdMap = await getCustomerIds();
    
    // Log customer mapping statistics
    const uniqueShopifyCustomerIds = new Set();
    orders.forEach(order => {
      if (order.customer && order.customer.id) {
        const shopifyCustomerId = order.customer.id.replace('gid://shopify/Customer/', '');
        uniqueShopifyCustomerIds.add(shopifyCustomerId);
      }
    });
    
    console.log(`Orders contain ${uniqueShopifyCustomerIds.size} unique customer IDs`);
    let missingCustomers = 0;
    uniqueShopifyCustomerIds.forEach(id => {
      if (!customerIdMap[id]) {
        missingCustomers++;
      }
    });
    
    if (missingCustomers > 0) {
      console.warn(`⚠️ ${missingCustomers} customers from orders are missing in the database`);
      console.warn('This may cause orders to be inserted without customer_id references');
      console.warn('Consider running customer import again to ensure all customers are in the database');
    } else {
      console.log('✅ All customers from orders are present in the database');
    }
    
    // Step 5: Prepare and insert orders
    console.log('\nStep 5: Preparing orders for insertion...');
    const preparedOrders = await prepareOrdersForInsertion(orders, customerIdMap);
    
    const { count: insertedOrderCount, orderIdMap } = await insertOrders(preparedOrders, { forceSync });
    
    // Step 6: Extract and insert line items
    console.log('\nStep 6: Extracting and inserting line items...');
    const lineItems = extractLineItems(orders, orderIdMap);
    
    const insertedLineItemCount = await insertLineItems(lineItems);
    
    // Step 7: Classify customers
    console.log('\nStep 7: Classifying customers...');
    console.log('Classifying new customers...');
    try {
      // Use public schema client for RPC functions
      const supabase = getPublicSchemaClient();
      const { data, error } = await supabase.rpc('classify_new_customers');
      
      if (error) {
        console.error('Error classifying new customers:', error);
        console.log('Continuing despite classification failure');
      } else {
        console.log(`Successfully classified ${data} customers`);
      }
    } catch (error) {
      console.error('Error in customer classification step:', error);
      console.log('Continuing despite classification failure');
    }
    
    // Step 8: Refresh materialized views
    console.log('\nStep 8: Refreshing materialized views...');
    try {
      // Use public schema client for RPC functions
      const supabase = getPublicSchemaClient();
      const { data, error } = await supabase.rpc('refresh_materialized_views');
      
      if (error) {
        console.error('Error refreshing materialized views:', error);
        console.log('Process completed but views may not be up to date');
      } else {
        console.log('Successfully refreshed materialized views');
      }
    } catch (error) {
      console.error('Error refreshing materialized views:', error.message);
      console.log('Process completed but views may not be up to date');
    }
    
    // Update result
    result = {
      orders: insertedOrderCount,
      customers: insertedCustomerCount,
      lineItems: insertedLineItemCount
    };
    
    console.log(`\n${year}-${monthFormatted} data processing complete!`);
    
    // Validate against reference data
    const monthKey = `${year}-${monthFormatted}`;
    if (REFERENCE_DATA[monthKey]) {
      logValidationResults(year, month, result, REFERENCE_DATA[monthKey]);
    }
    
    return result;
  } catch (error) {
    console.error(`Error processing ${year}-${monthFormatted} data:`, error);
    throw error;
  }
}

/**
 * Process all months from January 2025 to June 2025
 */
async function processAllMonths(options = {}) {
  console.log('Processing all months from January 2025 to June 2025...');
  
  const results = {};
  const months = [1, 2, 3, 4, 5, 6];
  
  for (const month of months) {
    try {
      const result = await processSingleMonth(2025, month, options);
      results[`2025-${month.toString().padStart(2, '0')}`] = result;
    } catch (error) {
      console.error(`Failed to process month 2025-${month.toString().padStart(2, '0')}:`, error);
      results[`2025-${month.toString().padStart(2, '0')}`] = { error: error.message };
    }
  }
  
  console.log('\n===== SUMMARY OF ALL MONTHS =====');
  for (const [month, result] of Object.entries(results)) {
    if (result.skipped) {
      console.log(`${month}: SKIPPED (${result.existingOrderCount} existing orders)`);
    } else if (result.error) {
      console.log(`${month}: ERROR - ${result.error}`);
    } else {
      console.log(`${month}: Orders: ${result.orders || 0}, Customers: ${result.customers || 0}, Line Items: ${result.lineItems || 0}`);
    }
  }
  
  return results;
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    
    // Parse options
    const options = {
      forceSync: args.includes('--force'),
      skipExistingCheck: args.includes('--skip-check')
    };
    
    if (args.includes('--help')) {
      console.log('Usage: node shopify-sync.js [year] [month] [options]');
      console.log('Options:');
      console.log('  --force           Force sync even if data already exists');
      console.log('  --skip-check      Skip checking if data already exists');
      console.log('  --help            Show this help message');
      console.log('\nExamples:');
      console.log('  node shopify-sync.js              Process all months (Jan-Jun 2025)');
      console.log('  node shopify-sync.js 2025 1       Process January 2025');
      console.log('  node shopify-sync.js 2025 1 --force  Force process January 2025');
      return;
    }
    
    // Filter out option arguments
    const nonOptionArgs = args.filter(arg => !arg.startsWith('--'));
    
    if (nonOptionArgs.length === 0) {
      console.log('Processing all months from January 2025 to June 2025...');
      await processAllMonths(options);
    } else if (nonOptionArgs.length === 2) {
      const year = parseInt(nonOptionArgs[0]);
      const month = parseInt(nonOptionArgs[1]);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        console.error('Invalid year or month. Usage: node shopify-sync.js [year] [month]');
        process.exit(1);
      }
      
      console.log(`Processing data for ${year}-${month.toString().padStart(2, '0')}...`);
      await processSingleMonth(year, month, options);
    } else {
      console.error('Invalid arguments. Usage: node shopify-sync.js [year] [month]');
      console.error('If no arguments are provided, all months from January 2025 to June 2025 will be processed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Export functions for use in other scripts
module.exports = {
  processSingleMonth,
  processAllMonths
};

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}
