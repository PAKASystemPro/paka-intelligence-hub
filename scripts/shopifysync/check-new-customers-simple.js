/**
 * Check new customers using a simple approach with timezone adjustment:
 * - Customers created within the target month (adjusted for UTC+8 timezone)
 * - With orders_count >= 1 (ensuring they made a purchase)
 */
require('dotenv').config({ path: '.env.local' });
const { initSupabaseClient } = require('./shopify-sync-utils');

/**
 * Get new customer count for a specific month based on customer creation date
 * @param {number} year - Year to check
 * @param {number} month - Month to check (1-12)
 */
async function checkNewCustomersSimple(year, month) {
  console.log(`Checking new customers for ${year}-${month.toString().padStart(2, '0')}...`);
  
  // Format date range for the month with timezone adjustment (UTC+8)
  // For UTC+8, the 1st day of month at 00:00:00 local time is the previous month's last day at 16:00:00 UTC
  const lastDayOfPrevMonth = new Date(year, month-1, 0).getDate();
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  
  const startDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${lastDayOfPrevMonth}T16:00:00Z`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth}T16:00:00Z`;
  
  console.log(`Date range (UTC+8 adjusted): ${startDate} to ${endDate}`);
  
  const supabase = initSupabaseClient();
  
  try {
    // Method 1: Query customers created in the target month with at least one order
    console.log('\nMethod 1: Customers created in the target month with orders_count >= 1');
    const { data: newCustomers, error } = await supabase
      .from('customers')
      .select('id, shopify_customer_id, email, first_name, last_name, created_at, orders_count')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .gte('orders_count', 1);
    
    if (error) {
      console.error('Error fetching customers:', error);
      return;
    }
    
    console.log(`Found ${newCustomers.length} new customers created in ${year}-${month} with orders_count >= 1`);
    
    // Compare with reference data
    const referenceData = {
      '2025-01': { newCustomers: 147, secondOrders: 65 },
      '2025-02': { newCustomers: 181, secondOrders: 76 },
      '2025-03': { newCustomers: 282, secondOrders: 139 },
      '2025-04': { newCustomers: 369, secondOrders: 141 },
      '2025-05': { newCustomers: 453, secondOrders: 157 },
      '2025-06': { newCustomers: 526, secondOrders: 121 }
    };
    
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    const reference = referenceData[monthKey];
    
    if (reference) {
      console.log(`\nComparison with reference data:`);
      console.log(`Reference new customers: ${reference.newCustomers}`);
      console.log(`Actual new customers: ${newCustomers.length}`);
      console.log(`Match: ${newCustomers.length === reference.newCustomers ? '✅' : '❌'}`);
      
      if (newCustomers.length !== reference.newCustomers) {
        console.log(`Difference: ${newCustomers.length - reference.newCustomers}`);
        console.log(`Percentage difference: ${((newCustomers.length - reference.newCustomers) / reference.newCustomers * 100).toFixed(2)}%`);
      }
    }
    
    // Print sample of new customers
    console.log('\nSample of new customers:');
    newCustomers.slice(0, 5).forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.first_name || ''} ${customer.last_name || ''} (${customer.email || 'No email'})`);
      console.log(`   ID: ${customer.shopify_customer_id}`);
      console.log(`   Created: ${customer.created_at}`);
      console.log(`   Orders: ${customer.orders_count}`);
    });
    
    // Method 2: Find new customers by combining order date and creation date
    console.log('\nMethod 2: New customers (ordered in this month AND created in this month)');
    
    // Step 1: Get all customers who placed orders in the target month
    const { data: monthOrders, error: error2 } = await supabase
      .from('orders')
      .select('customer_id')
      .gte('processed_at', startDate)
      .lt('processed_at', endDate);
    
    if (error2) {
      console.error('Error getting orders for the month:', error2);
      return newCustomers;
    }
    
    // Step 2: Get all customers who placed orders before this month
    const { data: previousOrders, error: error3 } = await supabase
      .from('orders')
      .select('customer_id')
      .lt('processed_at', startDate);
    
    if (error3) {
      console.error('Error getting previous orders:', error3);
      return newCustomers;
    }
    
    // Step 3: Extract unique customer IDs from this month's orders
    const monthCustomerIds = new Set();
    monthOrders.forEach(order => monthCustomerIds.add(order.customer_id));
    
    // Step 4: Extract unique customer IDs from previous orders
    const previousCustomerIds = new Set();
    previousOrders.forEach(order => previousCustomerIds.add(order.customer_id));
    
    // Step 5: Find potential new customers (ordered in this month but not before)
    const potentialNewCustomerIds = Array.from(monthCustomerIds)
      .filter(id => !previousCustomerIds.has(id));
    
    console.log(`Found ${potentialNewCustomerIds.length} potential new customers (ordered in this month but not before)`);
    
    // Step 6: Process customer details in batches to avoid timeout
    console.log('Processing customer details in batches...');
    const batchSize = 50;
    const batches = [];
    
    // Create batches of customer IDs
    for (let i = 0; i < potentialNewCustomerIds.length; i += batchSize) {
      batches.push(potentialNewCustomerIds.slice(i, i + batchSize));
    }
    
    console.log(`Processing ${batches.length} batches of up to ${batchSize} customers each`);
    
    // Process each batch
    let allCustomerDetails = [];
    for (let i = 0; i < batches.length; i++) {
      const batchIds = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batchIds.length} customers)...`);
      
      const { data: batchCustomerDetails, error: batchError } = await supabase
        .from('customers')
        .select('id, shopify_customer_id, email, first_name, last_name, orders_count, created_at')
        .in('id', batchIds);
        
      if (batchError) {
        console.error(`Error getting customer details for batch ${i + 1}:`, batchError);
        continue;
      }
      
      allCustomerDetails = allCustomerDetails.concat(batchCustomerDetails);
    }
    
    console.log(`Retrieved details for ${allCustomerDetails.length} customers`);
    
    // Step 7: Further filter to only include customers created in the target month
    const newCustomersMethod2 = allCustomerDetails.filter(customer => {
      const createdAt = new Date(customer.created_at);
      return createdAt >= new Date(startDate) && createdAt < new Date(endDate);
    });
    
    console.log(`Found ${newCustomersMethod2.length} new customers (ordered in this month AND created in this month)`);
    
    if (reference) {
      console.log(`Expected: ${reference.newCustomers}, Actual: ${newCustomersMethod2.length}`);
      console.log(`Match: ${newCustomersMethod2.length === reference.newCustomers ? '✅' : '❌'}`);
      
      if (newCustomersMethod2.length !== reference.newCustomers) {
        console.log(`Difference: ${newCustomersMethod2.length - reference.newCustomers}`);
        console.log(`Percentage difference: ${((newCustomersMethod2.length - reference.newCustomers) / reference.newCustomers * 100).toFixed(2)}%`);
      }
    }
    
    // Show sample of these new customers
    if (newCustomersMethod2.length > 0) {
      const sampleSize = Math.min(5, newCustomersMethod2.length);
      console.log('\nSample of new customers (Method 2):');
      for (let i = 0; i < sampleSize; i++) {
        const customer = newCustomersMethod2[i];
        console.log(`${i + 1}. ${customer.first_name || ''} ${customer.last_name || ''} (${customer.email || 'No email'})`);
        console.log(`   ID: ${customer.shopify_customer_id}`);
        console.log(`   Created: ${customer.created_at}`);
        console.log(`   Orders: ${customer.orders_count}`);
      }
    }
    
    // Calculate total unique customers who placed orders in this month
    console.log('\nTotal unique customers who placed orders this month:');
    console.log(`Total unique customers: ${monthCustomerIds.size}`);
    
    // Compare results from both methods
    console.log('\nComparison of both methods:');
    console.log(`Method 1 (creation date): ${newCustomers.length} new customers`);
    console.log(`Method 2 (order + creation): ${newCustomersMethod2.length} new customers`);
    console.log(`Difference between methods: ${Math.abs(newCustomers.length - newCustomersMethod2.length)}`);
    
    // Return both sets of results
    return {
      method1: newCustomers,
      method2: newCustomersMethod2
    };
  } catch (error) {
    console.error('Error during new customer check:', error);
  }
}

/**
 * Check all months from January to June 2025
 */
async function checkAllMonths() {
  console.log('Checking all months from January to June 2025...');
  console.log('===============================================');
  
  const results = {
    method1: {},
    method2: {}
  };
  
  for (let month = 1; month <= 6; month++) {
    try {
      const monthResult = await checkNewCustomersSimple(2025, month);
      
      if (monthResult) {
        const monthKey = `2025-${month.toString().padStart(2, '0')}`;
        const reference = {
          '2025-01': 147,
          '2025-02': 181,
          '2025-03': 282,
          '2025-04': 369,
          '2025-05': 453,
          '2025-06': 526
        }[monthKey];
        
        results.method1[monthKey] = {
          actual: monthResult.method1 ? monthResult.method1.length : 0,
          reference: reference
        };
        
        results.method2[monthKey] = {
          actual: monthResult.method2 ? monthResult.method2.length : 0,
          reference: reference
        };
      }
      
      console.log('\n-----------------------------------------------\n');
    } catch (error) {
      console.error(`Error checking month ${month}:`, error);
    }
  }
  
  // Print summary
  console.log('\n===============================================');
  console.log('SUMMARY OF ALL MONTHS');
  console.log('===============================================');
  
  console.log('\nMETHOD 1: Customer Creation Date');
  console.log('----------------------------------------');
  
  let totalActualMethod1 = 0;
  let totalReference = 0;
  
  Object.entries(results.method1).forEach(([month, data]) => {
    const diff = data.actual - data.reference;
    const percentDiff = data.reference ? ((diff / data.reference) * 100).toFixed(2) : 'N/A';
    
    console.log(`${month}: ${data.actual} vs ${data.reference} (${diff >= 0 ? '+' : ''}${diff}, ${percentDiff}%)`);
    
    totalActualMethod1 += data.actual;
    totalReference += data.reference || 0;
  });
  
  const totalDiffMethod1 = totalActualMethod1 - totalReference;
  const totalPercentDiffMethod1 = ((totalDiffMethod1 / totalReference) * 100).toFixed(2);
  
  console.log('\nMETHOD 1 TOTAL:');
  console.log(`Actual: ${totalActualMethod1}`);
  console.log(`Reference: ${totalReference}`);
  console.log(`Difference: ${totalDiffMethod1 >= 0 ? '+' : ''}${totalDiffMethod1} (${totalPercentDiffMethod1}%)`);
  
  console.log('\nMETHOD 2: Order + Creation Date');
  console.log('----------------------------------------');
  
  let totalActualMethod2 = 0;
  totalReference = 0;
  
  Object.entries(results.method2).forEach(([month, data]) => {
    const diff = data.actual - data.reference;
    const percentDiff = data.reference ? ((diff / data.reference) * 100).toFixed(2) : 'N/A';
    
    console.log(`${month}: ${data.actual} vs ${data.reference} (${diff >= 0 ? '+' : ''}${diff}, ${percentDiff}%)`);
    
    totalActualMethod2 += data.actual;
    totalReference += data.reference || 0;
  });
  
  const totalDiffMethod2 = totalActualMethod2 - totalReference;
  const totalPercentDiffMethod2 = ((totalDiffMethod2 / totalReference) * 100).toFixed(2);
  
  console.log('\nMETHOD 2 TOTAL:');
  console.log(`Actual: ${totalActualMethod2}`);
  console.log(`Reference: ${totalReference}`);
  console.log(`Difference: ${totalDiffMethod2 >= 0 ? '+' : ''}${totalDiffMethod2} (${totalPercentDiffMethod2}%)`);
  
  console.log('\nCOMPARISON OF METHODS:');
  console.log(`Method 1 total: ${totalActualMethod1}`);
  console.log(`Method 2 total: ${totalActualMethod2}`);
  console.log(`Difference between methods: ${Math.abs(totalActualMethod1 - totalActualMethod2)}`);
  
  return results;
}

// Run the script if called directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args[0] === 'all') {
    checkAllMonths()
      .then(() => {
        console.log('All checks completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('Checks failed:', error);
        process.exit(1);
      });
  } else {
    const year = parseInt(args[0], 10);
    const month = parseInt(args[1], 10);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      console.error('Usage: node check-new-customers-simple.js <year> <month>');
      console.error('   or: node check-new-customers-simple.js all');
      console.error('Example: node check-new-customers-simple.js 2025 1');
      process.exit(1);
    }
    
    checkNewCustomersSimple(year, month)
      .then(() => {
        console.log('Check completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('Check failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { checkNewCustomersSimple, checkAllMonths };
