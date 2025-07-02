// Simple database test script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Starting simple database test...');

    // Step 1: Test basic connection with a simple query
    console.log('Testing basic connection...');
    const { data, error } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .limit(5);
    
    if (error) {
      throw error;
    }
    
    console.log('Database connection successful!');
    console.log('Sample tables:', data);
    
    // Step 2: Check if production schema exists
    console.log('\nChecking for production schema...');
    const { data: schemas, error: schemasError } = await supabase
      .from('pg_namespace')
      .select('nspname')
      .eq('nspname', 'production');
    
    if (schemasError) {
      throw schemasError;
    }
    
    if (schemas && schemas.length > 0) {
      console.log('Production schema exists!');
    } else {
      console.log('Production schema does not exist.');
    }
    
    // Step 3: List tables in production schema using raw SQL
    console.log('\nListing tables in production schema using raw SQL...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('execute_sql', { 
        sql_query: "SELECT tablename FROM pg_tables WHERE schemaname = 'production'" 
      });
    
    if (tablesError) {
      console.log('Error listing tables:', tablesError);
      console.log('Checking if execute_sql function exists...');
      
      // Try a direct query to pg_tables
      const { data: directTables, error: directError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'production');
      
      if (directError) {
        throw directError;
      }
      
      console.log('Tables in production schema (direct query):');
      directTables.forEach(table => console.log(`- ${table.tablename}`));
    } else {
      console.log('Tables in production schema:');
      tables.forEach(table => console.log(`- ${table.tablename}`));
    }
    
    // Step 4: Try to execute the refresh function
    console.log('\nTesting refresh_all_materialized_views function...');
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_all_materialized_views');
    
    if (refreshError) {
      console.log('Error executing refresh function:', refreshError);
    } else {
      console.log(`Refreshed ${refreshResult} materialized views.`);
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

// Create execute_sql function if it doesn't exist
async function createExecuteSqlFunction() {
  try {
    console.log('Creating execute_sql function...');
    const { error } = await supabase.rpc('create_execute_sql_function', {
      sql_statement: `
        CREATE OR REPLACE FUNCTION public.execute_sql(sql_query TEXT)
        RETURNS SETOF json AS $$
        BEGIN
          RETURN QUERY EXECUTE sql_query;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (error) {
      console.error('Error creating execute_sql function:', error);
    } else {
      console.log('execute_sql function created successfully!');
    }
  } catch (error) {
    console.error('Error creating execute_sql function:', error);
  }
}

// Run the main function
main();
