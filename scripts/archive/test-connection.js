// Script to test database connection and verify materialized views
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection by querying a simple table
    console.log('Checking customers table...');
    const { data: customers, error: customersError } = await supabase.rpc('test_connection');
    
    if (customersError) {
      console.error('Error querying customers:', customersError);
    } else {
      console.log('Successfully connected to database!');
      console.log('Customer data sample:', customers);
    }
    
    // Check orders table
    console.log('\nChecking orders table...');
    const { data: orders, error: ordersError } = await supabase.rpc('test_orders');
    
    if (ordersError) {
      console.error('Error querying orders:', ordersError);
    } else {
      console.log('Orders table exists and is accessible!');
      console.log('Orders data sample:', orders);
    }
    
    // Check order_line_items table
    console.log('\nChecking order_line_items table...');
    const { data: lineItems, error: lineItemsError } = await supabase.rpc('test_line_items');
    
    if (lineItemsError) {
      console.error('Error querying order_line_items:', lineItemsError);
    } else {
      console.log('Order_line_items table exists and is accessible!');
      console.log('Line items data sample:', lineItems);
    }
    
    // Check if materialized views exist
    console.log('\nChecking materialized views...');
    
    // Check cohort_sizes view
    console.log('\nChecking materialized views with direct SQL...');
    const { data: cohortSizes, error: sizesError } = await supabase.rpc('get_cohort_sizes');
    
    if (sizesError) {
      console.error('Error querying cohort_sizes view:', sizesError);
    } else {
      console.log('cohort_sizes view exists and is accessible!');
      console.log('Sample data:', cohortSizes);
    }
    
    // Check cohort_heatmap view
    const { data: heatmap, error: heatmapError } = await supabase.rpc('get_cohort_heatmap');
    
    if (heatmapError) {
      console.error('Error querying cohort_heatmap view:', heatmapError);
    } else {
      console.log('\ncohort_heatmap view exists and is accessible!');
      console.log('Sample data:', heatmap);
    }
    
    // Try to execute the refresh function
    console.log('\nTesting refresh_all_materialized_views function...');
    const { data: refreshResult, error: refreshError } = await supabase.rpc(
      'refresh_all_materialized_views'
    );
    
    if (refreshError) {
      console.error('Error executing refresh function:', refreshError);
    } else {
      console.log('Refresh function executed successfully!');
      console.log('Number of views refreshed:', refreshResult);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the main function
main();
