// Test script for RPC functions
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Testing RPC functions...');
    
    // Test 1: List available functions
    console.log('\nTest 1: Listing available functions...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_available_functions');
    
    if (functionsError) {
      console.error('Error listing functions:', functionsError);
      
      // Try an alternative approach
      console.log('Trying alternative approach to list functions...');
      const { data: pgFunctions, error: pgError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('pronamespace', 'public');
      
      if (pgError) {
        console.error('Error with alternative approach:', pgError);
      } else {
        console.log('Available functions:', pgFunctions.map(f => f.proname));
      }
    } else {
      console.log('Available functions:', functions);
    }
    
    // Test 2: Try to call classify_new_customers function
    console.log('\nTest 2: Calling classify_new_customers function...');
    const { data: classifyResult, error: classifyError } = await supabase
      .rpc('classify_new_customers');
    
    if (classifyError) {
      console.error('Error calling classify_new_customers:', classifyError);
    } else {
      console.log('Successfully called classify_new_customers');
      console.log('Result:', classifyResult);
    }
    
    // Test 3: Try to call refresh_all_materialized_views function
    console.log('\nTest 3: Calling refresh_all_materialized_views function...');
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_all_materialized_views');
    
    if (refreshError) {
      console.error('Error calling refresh_all_materialized_views:', refreshError);
    } else {
      console.log('Successfully called refresh_all_materialized_views');
      console.log('Result:', refreshResult);
    }
    
    // Test 4: Try to call get_test_customers function
    console.log('\nTest 4: Calling get_test_customers function...');
    const { data: customersResult, error: customersError } = await supabase
      .rpc('get_test_customers');
    
    if (customersError) {
      console.error('Error calling get_test_customers:', customersError);
    } else {
      console.log('Successfully called get_test_customers');
      console.log(`Found ${customersResult ? customersResult.length : 0} customers`);
      if (customersResult && customersResult.length > 0) {
        console.log('Sample customer:', customersResult[0]);
      }
    }
    
    console.log('\nRPC function tests completed!');
  } catch (error) {
    console.error('Unexpected error in tests:', error);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
    }
  }
}

// Helper function to create a function to list available functions
async function createListFunctionsFunction() {
  try {
    console.log('Creating function to list available functions...');
    
    const { data, error } = await supabase.rpc('create_list_functions_function');
    
    if (error) {
      console.error('Error creating function:', error);
      return false;
    }
    
    console.log('Function created successfully');
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Run the main function
main();
