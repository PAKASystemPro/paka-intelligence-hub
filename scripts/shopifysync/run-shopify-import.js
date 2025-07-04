#!/usr/bin/env node
/**
 * Main entry point for running the improved Shopify data import process
 */
require('dotenv').config({ path: '.env.local' });
const { processSingleMonth, processAllMonths } = require('./shopify-sync');
const { initSupabaseClient, ApiError, DatabaseError } = require('./shopify-sync-utils');
const { REFERENCE_DATA } = require('./shopify-sync-config');

/**
 * Display help information
 */
function showHelp() {
  console.log('Shopify Data Import Tool');
  console.log('=======================');
  console.log('\nUsage: node run-shopify-import.js [command] [options]');
  console.log('\nCommands:');
  console.log('  import [year] [month]  Import data for a specific month');
  console.log('  import-all             Import data for all months (Jan-Jun 2025)');
  console.log('  cleanup                Remove all 2025 data from the database');
  console.log('  validate               Validate imported data against reference data');
  console.log('  help                   Show this help message');
  console.log('\nOptions:');
  console.log('  --force                Force import even if data already exists');
  console.log('  --skip-check           Skip checking if data already exists');
  console.log('\nExamples:');
  console.log('  node run-shopify-import.js import 2025 1       Import January 2025 data');
  console.log('  node run-shopify-import.js import-all --force  Force import all months');
  console.log('  node run-shopify-import.js cleanup             Remove all 2025 data');
  console.log('  node run-shopify-import.js validate            Check data against reference');
}

/**
 * Validate imported data against reference data
 */
async function validateData() {
  console.log('=== VALIDATING IMPORTED DATA ===');
  console.log('Starting validation at:', new Date().toISOString());
  
  try {
    const supabase = initSupabaseClient();
    let allValid = true;
    
    // Check each month
    for (let month = 1; month <= 6; month++) {
      const monthFormatted = month.toString().padStart(2, '0');
      const monthKey = `2025-${monthFormatted}`;
      const startDate = `2025-${monthFormatted}-01`;
      const endDate = month === 6 ? '2025-07-01' : `2025-${(month + 1).toString().padStart(2, '0')}-01`;
      
      console.log(`\nValidating ${monthKey}...`);
      
      // Get reference data
      const reference = REFERENCE_DATA[monthKey] || {};
      if (!reference.orders || !reference.customers || !reference.newCustomers) {
        console.log(`No reference data available for ${monthKey}, skipping validation`);
        continue;
      }
      
      // Check orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('count')
        .gte('processed_at', startDate)
        .lt('processed_at', endDate);
      
      if (ordersError) {
        console.error(`Error checking orders for ${monthKey}:`, ordersError);
        allValid = false;
      } else {
        const ordersCount = ordersData[0]?.count || 0;
        const ordersMatch = ordersCount === reference.orders;
        console.log(`Orders: ${ordersCount} / ${reference.orders} (${ordersMatch ? '✅' : '❌'})`);
        if (!ordersMatch) allValid = false;
      }
      
      // Check customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('count')
        .gte('processed_at', startDate)
        .lt('processed_at', endDate);
      
      if (customersError) {
        console.error(`Error checking customers for ${monthKey}:`, customersError);
        allValid = false;
      } else {
        const customersCount = customersData[0]?.count || 0;
        const customersMatch = customersCount === reference.customers;
        console.log(`Customers: ${customersCount} / ${reference.customers} (${customersMatch ? '✅' : '❌'})`);
        if (!customersMatch) allValid = false;
      }
      
      // Check new customers
      const { data: newCustomers, error: newCustomersError } = await supabase
        .rpc('get_new_customers_count_for_month', { month_start: startDate });
      
      if (newCustomersError) {
        console.error(`Error checking new customers for ${monthKey}:`, newCustomersError);
        allValid = false;
      } else {
        const newCustomersMatch = newCustomers === reference.newCustomers;
        console.log(`New Customers: ${newCustomers} / ${reference.newCustomers} (${newCustomersMatch ? '✅' : '❌'})`);
        if (!newCustomersMatch) allValid = false;
      }
      
      // Check line items
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .rpc('get_line_items_count_for_month', { month_start: startDate });
      
      if (lineItemsError) {
        console.error(`Error checking line items for ${monthKey}:`, lineItemsError);
      } else {
        console.log(`Line Items: ${lineItemsData || 0}`);
        // We don't have reference data for line items, so just informational
      }
    }
    
    console.log('\n=== VALIDATION SUMMARY ===');
    if (allValid) {
      console.log('✅ All data matches reference values!');
    } else {
      console.log('❌ Some data does not match reference values.');
      console.log('Run cleanup and import again, or check for specific issues.');
    }
    
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error (${error.code}): ${error.message}`);
      if (error.details) console.error('Details:', error.details);
    } else if (error instanceof DatabaseError) {
      console.error(`Database Error (${error.code}): ${error.message}`);
      if (error.originalError) console.error('Original error:', error.originalError);
    } else {
      console.error('Validation failed with error:', error);
    }
  }
}

/**
 * Run cleanup process
 */
async function runCleanup() {
  const cleanup = require('./cleanup-2025-data');
  await cleanup.cleanup2025Data();
}

/**
 * Main function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];
    
    // Parse options
    const options = {
      forceSync: args.includes('--force'),
      skipExistingCheck: args.includes('--skip-check')
    };
    
    // Filter out option arguments
    const nonOptionArgs = args.filter(arg => !arg.startsWith('--'));
    
    switch (command) {
      case 'import':
        if (nonOptionArgs.length === 3) {
          const year = parseInt(nonOptionArgs[1]);
          const month = parseInt(nonOptionArgs[2]);
          
          if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            console.error('Invalid year or month. Usage: node run-shopify-import.js import [year] [month]');
            process.exit(1);
          }
          
          console.log(`Importing data for ${year}-${month.toString().padStart(2, '0')}...`);
          await processSingleMonth(year, month, options);
        } else {
          console.error('Invalid arguments for import command.');
          showHelp();
          process.exit(1);
        }
        break;
        
      case 'import-all':
        console.log('Importing data for all months (Jan-Jun 2025)...');
        await processAllMonths(options);
        break;
        
      case 'cleanup':
        await runCleanup();
        break;
        
      case 'validate':
        await validateData();
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        console.error('Invalid command.');
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error (${error.code}): ${error.message}`);
      if (error.details) console.error('Details:', error.details);
    } else if (error instanceof DatabaseError) {
      console.error(`Database Error (${error.code}): ${error.message}`);
      if (error.originalError) console.error('Original error:', error.originalError);
    } else {
      console.error('Error in main function:', error);
    }
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
