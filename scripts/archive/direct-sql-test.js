// Direct SQL test script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Starting direct SQL test...');

    // Test if we can access the production schema
    console.log('\nTesting access to production schema tables...');
    
    // Test customers table
    console.log('Testing customers table...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(5);
    
    if (customersError) {
      console.error('Error accessing customers table:', customersError);
    } else {
      console.log(`Found ${customers.length} customers.`);
      if (customers.length > 0) {
        console.log('Sample customer:', customers[0]);
      }
    }
    
    // Test orders table
    console.log('\nTesting orders table...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(5);
    
    if (ordersError) {
      console.error('Error accessing orders table:', ordersError);
    } else {
      console.log(`Found ${orders.length} orders.`);
      if (orders.length > 0) {
        console.log('Sample order:', orders[0]);
      }
    }
    
    // Test order_line_items table
    console.log('\nTesting order_line_items table...');
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('order_line_items')
      .select('*')
      .limit(5);
    
    if (lineItemsError) {
      console.error('Error accessing order_line_items table:', lineItemsError);
    } else {
      console.log(`Found ${lineItems.length} line items.`);
      if (lineItems.length > 0) {
        console.log('Sample line item:', lineItems[0]);
      }
    }
    
    // Test cohort_sizes materialized view
    console.log('\nTesting cohort_sizes materialized view...');
    const { data: cohortSizes, error: cohortSizesError } = await supabase
      .from('cohort_sizes')
      .select('*')
      .limit(5);
    
    if (cohortSizesError) {
      console.error('Error accessing cohort_sizes view:', cohortSizesError);
    } else {
      console.log(`Found ${cohortSizes.length} cohort size records.`);
      if (cohortSizes.length > 0) {
        console.log('Sample cohort size:', cohortSizes[0]);
      }
    }
    
    // Test cohort_heatmap materialized view
    console.log('\nTesting cohort_heatmap materialized view...');
    const { data: cohortHeatmap, error: cohortHeatmapError } = await supabase
      .from('cohort_heatmap')
      .select('*')
      .limit(5);
    
    if (cohortHeatmapError) {
      console.error('Error accessing cohort_heatmap view:', cohortHeatmapError);
    } else {
      console.log(`Found ${cohortHeatmap.length} cohort heatmap records.`);
      if (cohortHeatmap.length > 0) {
        console.log('Sample cohort heatmap:', cohortHeatmap[0]);
      }
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Error in test:', error);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
    }
  }
}

// Run the main function
main();
