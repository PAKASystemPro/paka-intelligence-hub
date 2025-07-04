// Script to apply migrations directly
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function main() {
  try {
    console.log('Applying migrations...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250702002_create_analytics_views.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL loaded, executing...');
    
    // Split the SQL into separate statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim() !== '');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // Execute the SQL statement
        const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
        
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          
          // Try a different approach for this statement
          console.log('Trying alternative approach...');
          const { error: altError } = await supabase.rpc('execute', { query: stmt });
          
          if (altError) {
            console.error('Alternative approach failed:', altError);
          } else {
            console.log('Alternative approach succeeded');
          }
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      }
    }
    
    console.log('Migration completed');
    
    // Verify materialized views
    console.log('\nVerifying materialized views...');
    const { data: cohortSizes, error: cohortSizesError } = await supabase
      .from('cohort_sizes')
      .select('*')
      .limit(1);
    
    if (cohortSizesError) {
      console.error('Error querying cohort_sizes:', cohortSizesError);
    } else {
      console.log('cohort_sizes view exists:', cohortSizes);
    }
    
    const { data: cohortHeatmap, error: cohortHeatmapError } = await supabase
      .from('cohort_heatmap')
      .select('*')
      .limit(1);
    
    if (cohortHeatmapError) {
      console.error('Error querying cohort_heatmap:', cohortHeatmapError);
    } else {
      console.log('cohort_heatmap view exists:', cohortHeatmap);
    }
    
    // Try to execute the refresh function
    console.log('\nTrying to execute refresh_all_materialized_views function...');
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
