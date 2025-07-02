// Production schema test script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Starting production schema test...');
    
    // Test 1: Check if we can access the customers table in production schema
    console.log('\nTest 1: Checking production.customers table...');
    const { data: customers, error: customersError } = await supabase
      .from('production.customers')
      .select('*')
      .limit(1);
    
    if (customersError) {
      console.error('Error accessing customers table:', customersError);
    } else {
      console.log('Successfully accessed production.customers table');
      console.log(`Found ${customers.length} customers`);
    }
    
    // Test 2: Try to insert a test customer
    console.log('\nTest 2: Inserting a test customer...');
    const testCustomer = {
      shopify_customer_id: 'test_customer_' + Date.now(),
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      total_spent: 0,
      orders_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertedCustomer, error: insertError } = await supabase
      .from('production.customers')
      .insert(testCustomer)
      .select();
    
    if (insertError) {
      console.error('Error inserting test customer:', insertError);
    } else {
      console.log('Successfully inserted test customer');
      console.log('Inserted customer:', insertedCustomer);
    }
    
    // Test 3: Try to call the classify_new_customers function
    console.log('\nTest 3: Calling classify_new_customers function...');
    const { data: classifyResult, error: classifyError } = await supabase
      .rpc('classify_new_customers');
    
    if (classifyError) {
      console.error('Error calling classify_new_customers:', classifyError);
    } else {
      console.log('Successfully called classify_new_customers');
      console.log('Result:', classifyResult);
    }
    
    // Test 4: Try to call the refresh_all_materialized_views function
    console.log('\nTest 4: Calling refresh_all_materialized_views function...');
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_all_materialized_views');
    
    if (refreshError) {
      console.error('Error calling refresh_all_materialized_views:', refreshError);
    } else {
      console.log('Successfully called refresh_all_materialized_views');
      console.log('Result:', refreshResult);
    }
    
    // Test 5: Try to query the cohort_heatmap view
    console.log('\nTest 5: Querying production.cohort_heatmap view...');
    const { data: heatmapData, error: heatmapError } = await supabase
      .from('production.cohort_heatmap')
      .select('*')
      .limit(5);
    
    if (heatmapError) {
      console.error('Error querying cohort_heatmap:', heatmapError);
    } else {
      console.log('Successfully queried production.cohort_heatmap');
      console.log(`Found ${heatmapData.length} rows`);
      if (heatmapData.length > 0) {
        console.log('Sample row:', heatmapData[0]);
      }
    }
    
    console.log('\nProduction schema test completed!');
  } catch (error) {
    console.error('Unexpected error in test:', error);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
    }
  }
}

// Run the main function
main();
