// Simple script to check if materialized views exist
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

    // Direct SQL query to check materialized views
    const { data: matviews, error: matviewsError } = await supabase
      .from('_materialized_views')
      .select('*')
      .eq('schema', 'production');
    
    if (matviewsError) {
      console.error('Error querying materialized views:', matviewsError);
      
      // Try a raw SQL query
      console.log('Trying raw SQL query...');
      const { data: rawData, error: rawError } = await supabase.rpc('execute_sql', {
        sql_query: "SELECT matviewname FROM pg_matviews WHERE schemaname = 'production'"
      });
      
      if (rawError) {
        console.error('Raw SQL query error:', rawError);
      } else {
        console.log('Raw SQL query results:', rawData);
      }
    } else {
      console.log('Materialized views:', matviews);
    }
    
    // Try to execute the refresh function
    console.log('\nAttempting to execute refresh_all_materialized_views function...');
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
