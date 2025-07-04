/**
 * List Public Functions in Supabase
 * 
 * This script lists all functions in the public schema of your Supabase database.
 */
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

// Check if required environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listPublicFunctions() {
  try {
    console.log('Listing functions in the public schema...');
    
    // Query information_schema.routines to get function information
    const { data, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name, data_type')
      .eq('routine_schema', 'public')
      .order('routine_name');
    
    if (error) {
      console.error('Error listing functions:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No functions found in the public schema.');
      return;
    }
    
    console.log(`\nFound ${data.length} functions in the public schema:`);
    console.log('='.repeat(50));
    
    data.forEach((func, index) => {
      console.log(`${index + 1}. ${func.routine_name} -> returns ${func.data_type || 'unknown'}`);
    });
    
    console.log('\nTesting a few known functions based on your project memories:');
    
    // Test check_schema_exists function
    console.log('\nTesting check_schema_exists function...');
    const { data: schemaExists, error: schemaError } = await supabase
      .rpc('check_schema_exists', { schema_name: 'production' });
    
    if (schemaError) {
      console.log(`❌ check_schema_exists function test failed: ${schemaError.message}`);
    } else {
      console.log(`✅ check_schema_exists function test successful: ${schemaExists}`);
    }
    
    // Test classify_new_customers function
    console.log('\nTesting classify_new_customers function...');
    const { data: classifyResult, error: classifyError } = await supabase
      .rpc('classify_new_customers');
    
    if (classifyError) {
      console.log(`❌ classify_new_customers function test failed: ${classifyError.message}`);
    } else {
      console.log(`✅ classify_new_customers function test successful`);
      console.log('Result:', classifyResult);
    }
    
    // Test refresh_materialized_views function
    console.log('\nTesting refresh_materialized_views function...');
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_materialized_views');
    
    if (refreshError) {
      console.log(`❌ refresh_materialized_views function test failed: ${refreshError.message}`);
    } else {
      console.log(`✅ refresh_materialized_views function test successful`);
      console.log('Result:', refreshResult);
    }
    
    // Test get_test_cohort_heatmap function
    console.log('\nTesting get_test_cohort_heatmap function...');
    const { data: heatmapResult, error: heatmapError } = await supabase
      .rpc('get_test_cohort_heatmap');
    
    if (heatmapError) {
      console.log(`❌ get_test_cohort_heatmap function test failed: ${heatmapError.message}`);
    } else {
      console.log(`✅ get_test_cohort_heatmap function test successful`);
      console.log('Result sample:', heatmapResult ? heatmapResult.slice(0, 1) : null);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listPublicFunctions();
