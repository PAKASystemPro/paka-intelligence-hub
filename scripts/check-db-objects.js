// Script to check if materialized views and functions exist
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Checking database objects...');

    // Check materialized views
    const { data: matviews, error: matviewsError } = await supabase.rpc(
      'check_materialized_views'
    );
    
    if (matviewsError) {
      console.error('Error checking materialized views:', matviewsError);
      
      // Create function to check materialized views
      console.log('Creating function to check materialized views...');
      const { error: createFuncError } = await supabase.rpc(
        'create_check_materialized_views_function'
      );
      
      if (createFuncError) {
        console.error('Error creating function:', createFuncError);
        
        // Execute raw SQL to create the function
        const { error: rawSqlError } = await supabase.from('rpc').select('*').execute(`
          CREATE OR REPLACE FUNCTION public.check_materialized_views()
          RETURNS TABLE(schema_name text, matview_name text) AS $$
          BEGIN
            RETURN QUERY
            SELECT n.nspname::text, c.relname::text
            FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'm'
            AND n.nspname = 'production';
          END;
          $$ LANGUAGE plpgsql;
        `);
        
        if (rawSqlError) {
          console.error('Error creating function via raw SQL:', rawSqlError);
        } else {
          console.log('Function created successfully via raw SQL');
        }
      } else {
        console.log('Function created successfully');
      }
      
      // Try checking materialized views again
      const { data: retryMatviews, error: retryError } = await supabase.rpc(
        'check_materialized_views'
      );
      
      if (retryError) {
        console.error('Error checking materialized views (retry):', retryError);
      } else {
        console.log('Materialized views:', retryMatviews);
      }
    } else {
      console.log('Materialized views:', matviews);
    }
    
    // Check if refresh_all_materialized_views function exists
    console.log('Checking if refresh_all_materialized_views function exists...');
    const { data: functions, error: functionsError } = await supabase.rpc(
      'check_function_exists',
      { function_name: 'refresh_all_materialized_views' }
    );
    
    if (functionsError) {
      console.error('Error checking function:', functionsError);
      
      // Create function to check if function exists
      console.log('Creating function to check if function exists...');
      const { error: createCheckFuncError } = await supabase.from('rpc').select('*').execute(`
        CREATE OR REPLACE FUNCTION public.check_function_exists(function_name text)
        RETURNS boolean AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = function_name
            AND n.nspname = 'public'
          );
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      if (createCheckFuncError) {
        console.error('Error creating check function:', createCheckFuncError);
      } else {
        console.log('Check function created successfully');
        
        // Try checking function again
        const { data: retryFunctions, error: retryFuncError } = await supabase.rpc(
          'check_function_exists',
          { function_name: 'refresh_all_materialized_views' }
        );
        
        if (retryFuncError) {
          console.error('Error checking function (retry):', retryFuncError);
        } else {
          console.log('Function exists:', retryFunctions);
        }
      }
    } else {
      console.log('Function exists:', functions);
    }
    
    // Direct query to check materialized views
    console.log('Querying materialized views directly...');
    const { data: directMatviews, error: directMatviewsError } = await supabase
      .from('pg_matviews')
      .select('*')
      .eq('schemaname', 'production');
    
    if (directMatviewsError) {
      console.error('Error querying materialized views directly:', directMatviewsError);
    } else {
      console.log('Direct query results:', directMatviews);
    }
    
    // Try to execute the refresh function
    console.log('Attempting to execute refresh_all_materialized_views function...');
    const { data: refreshResult, error: refreshError } = await supabase.rpc(
      'refresh_all_materialized_views'
    );
    
    if (refreshError) {
      console.error('Error executing refresh function:', refreshError);
    } else {
      console.log('Refresh function executed successfully. Result:', refreshResult);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the main function
main();
