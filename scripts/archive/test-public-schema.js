// Test script for data sync and cohort analysis using public schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Starting data sync test with public schema...');

    // Step 1: Test basic connection
    console.log('Testing basic connection...');
    const { data: version, error: versionError } = await supabase
      .rpc('version');
    
    if (versionError) {
      throw versionError;
    }
    
    console.log('Database connection successful!');
    console.log('PostgreSQL version:', version);
    
    // Step 2: Check if production schema exists
    console.log('\nChecking if production schema exists...');
    const { data: schemaExists, error: schemaError } = await supabase
      .rpc('check_schema_exists', { schema_name: 'production' });
    
    if (schemaError) {
      throw schemaError;
    }
    
    if (schemaExists) {
      console.log('Production schema exists!');
    } else {
      console.log('Production schema does not exist.');
      return;
    }
    
    // Step 3: List tables in production schema
    console.log('\nListing tables in production schema...');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'production');
    
    if (tablesError) {
      throw tablesError;
    }
    
    console.log('Tables in production schema:');
    tables.forEach(table => console.log(`- ${table.tablename}`));
    
    // Step 4: List materialized views in production schema
    console.log('\nListing materialized views in production schema...');
    const { data: views, error: viewsError } = await supabase
      .from('pg_catalog.pg_matviews')
      .select('matviewname')
      .eq('schemaname', 'production');
    
    if (viewsError) {
      throw viewsError;
    }
    
    console.log('Materialized views in production schema:');
    views.forEach(view => console.log(`- ${view.matviewname}`));
    
    // Step 5: Test refresh function
    console.log('\nTesting refresh_all_materialized_views function...');
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_all_materialized_views');
    
    if (refreshError) {
      throw refreshError;
    }
    
    console.log(`Refreshed ${refreshResult} materialized views.`);
    
    console.log('\nTest completed successfully!');
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
