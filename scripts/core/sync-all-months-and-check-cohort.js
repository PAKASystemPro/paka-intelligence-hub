// Script to sync all months from January to June 2025 and check cohort heatmap
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Import the monthly sync functions
const { processSingleMonth } = require('./fetch-shopify-monthly-data');

// Initialize Supabase client for RPC calls (public schema)
const rpcClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Starting sync for all months from January to June 2025...');
    
    // Define the months to process
    const months = [
      { year: 2025, month: 1 },
      { year: 2025, month: 2 },
      { year: 2025, month: 3 },
      { year: 2025, month: 4 },
      { year: 2025, month: 5 },
      { year: 2025, month: 6 }
    ];
    
    // Process each month
    const results = [];
    for (const { year, month } of months) {
      console.log(`\n========================================`);
      console.log(`Processing ${year}-${month.toString().padStart(2, '0')}`);
      console.log(`========================================`);
      
      try {
        const result = await processSingleMonth(year, month);
        results.push({ year, month, ...result });
        console.log(`Completed ${year}-${month.toString().padStart(2, '0')}`);
      } catch (error) {
        console.error(`Error processing ${year}-${month.toString().padStart(2, '0')}:`, error);
        results.push({ year, month, error: error.message });
      }
    }
    
    // Print summary of all months
    console.log('\n========================================');
    console.log('SUMMARY OF ALL MONTHS');
    console.log('========================================');
    console.log('Month | Orders | Customers | Line Items');
    console.log('------|--------|-----------|------------');
    
    for (const result of results) {
      const monthStr = `${result.year}-${result.month.toString().padStart(2, '0')}`;
      const orders = result.orders || 0;
      const customers = result.customers || 0;
      const lineItems = result.lineItems || 0;
      console.log(`${monthStr} | ${orders.toString().padStart(6)} | ${customers.toString().padStart(9)} | ${lineItems.toString().padStart(10)}`);
    }
    
    // Get and display cohort heatmap data
    console.log('\n========================================');
    console.log('COHORT HEATMAP DATA');
    console.log('========================================');
    
    await displayCohortHeatmap();
    
    // Get and display product-specific cohort data
    console.log('\n========================================');
    console.log('PRODUCT-SPECIFIC COHORT DATA');
    console.log('========================================');
    
    await displayProductCohortData();
    
    console.log('\nAll processing completed!');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

async function displayCohortHeatmap() {
  try {
    console.log('Getting cohort heatmap data...');
    
    // Call the RPC function to get cohort heatmap data
    const { data, error } = await rpcClient.rpc('get_cohort_heatmap');
    
    if (error) {
      console.error('Error getting cohort heatmap data:', error);
      return;
    }
    
    printCohortSummary(data || []);
  } catch (error) {
    console.error('Error in displayCohortHeatmap:', error);
  }
}

async function displayProductCohortData() {
  try {
    const productTypes = ['深睡寶寶', '天皇丸', '皇后丸', 'Other'];
    
    for (const productType of productTypes) {
      console.log(`\nGetting cohort data for product: ${productType}`);
      
      // Call the RPC function to get product-specific cohort data
      const { data, error } = await rpcClient.rpc('get_cohort_heatmap_by_product', {
        p_product_cohort: productType
      });
      
      if (error) {
        console.error(`Error getting cohort data for ${productType}:`, error);
        continue;
      }
      
      console.log(`Cohort data for ${productType}:`);
      printCohortSummary(data || []);
    }
  } catch (error) {
    console.error('Error in displayProductCohortData:', error);
  }
}

// Helper function to print cohort summary
function printCohortSummary(cohortData) {
  if (!cohortData || cohortData.length === 0) {
    console.log('No cohort data available.');
    return;
  }
  
  // Group by cohort month
  const cohortsByMonth = {};
  cohortData.forEach(row => {
    const month = row.cohort_month;
    if (!cohortsByMonth[month]) {
      cohortsByMonth[month] = {
        cohort_size: row.cohort_size || 0,
        second_orders: 0
      };
    }
    
    // Add second orders for this month
    if (row.months_since_first !== null && row.second_orders) {
      cohortsByMonth[month].second_orders += (row.second_orders || 0);
    }
  });
  
  // Print summary
  console.log('\nCOHORT SUMMARY:');
  console.log('Cohort Month | New Customers | 2nd Orders | Retention Rate');
  console.log('-------------|--------------|------------|---------------');
  
  let totalNew = 0;
  let totalSecond = 0;
  
  Object.keys(cohortsByMonth).sort().forEach(month => {
    const cohort = cohortsByMonth[month];
    const newCustomers = cohort.cohort_size || 0;
    const secondOrders = cohort.second_orders || 0;
    const retentionRate = newCustomers > 0 ? (secondOrders / newCustomers * 100).toFixed(1) : '0.0';
    
    totalNew += newCustomers;
    totalSecond += secondOrders;
    
    console.log(`${month}      | ${newCustomers.toString().padStart(12)} | ${secondOrders.toString().padStart(10)} | ${retentionRate.padStart(13)}%`);
  });
  
  // Print total
  const totalRetention = totalNew > 0 ? (totalSecond / totalNew * 100).toFixed(1) : '0.0';
  console.log('-------------|--------------|------------|---------------');
  console.log(`Total        | ${totalNew.toString().padStart(12)} | ${totalSecond.toString().padStart(10)} | ${totalRetention.padStart(13)}%`);
  
  // Print detailed heatmap data if available
  if (cohortData.some(row => row.months_since_first !== null)) {
    console.log('\nDETAILED COHORT HEATMAP:');
    console.log('Cohort Month | Months Since First | New Customers | 2nd Orders | Retention Rate');
    console.log('-------------|-------------------|--------------|------------|---------------');
    
    cohortData.forEach(row => {
      if (row.months_since_first !== null) {
        const month = row.cohort_month;
        const monthsSince = `m${row.months_since_first}`;
        const newCustomers = row.cohort_size || 0;
        const secondOrders = row.second_orders || 0;
        const retentionRate = newCustomers > 0 ? (secondOrders / newCustomers * 100).toFixed(1) : '0.0';
        
        console.log(`${month}      | ${monthsSince.padStart(17)} | ${newCustomers.toString().padStart(12)} | ${secondOrders.toString().padStart(10)} | ${retentionRate.padStart(13)}%`);
      }
    });
  }
}

// Run the main function
main().catch(console.error);
