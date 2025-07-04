/**
 * Database Cleanup Script
 * Deletes all data from the production schema tables while preserving schema structure
 * Respects foreign key constraints by deleting in the correct order
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'production' }
});

// Tables to clean up in order (respecting foreign key constraints)
const tables = [
  'order_line_items',
  'orders',
  'customers'
];

// Function to delete all data from a table
async function cleanupTable(tableName) {
  console.log(`Deleting all data from production.${tableName}...`);
  
  try {
    const { error, count } = await supabase
      .from(tableName)
      .delete()
      .neq('id', 0); // This will delete all rows as no ID equals 0
    
    if (error) {
      console.error(`Error deleting data from ${tableName}:`, error.message);
      return false;
    }
    
    console.log(`✅ Successfully cleaned up table ${tableName}`);
    return true;
  } catch (error) {
    console.error(`Error deleting data from ${tableName}:`, error.message);
    return false;
  }
}

// Function to refresh materialized views
async function refreshMaterializedViews() {
  console.log('Refreshing materialized views...');
  
  try {
    const { error } = await supabase.rpc('refresh_materialized_views');
    
    if (error) {
      console.error('Error refreshing materialized views:', error.message);
      return false;
    }
    
    console.log('✅ Successfully refreshed materialized views');
    return true;
  } catch (error) {
    console.error('Error refreshing materialized views:', error.message);
    return false;
  }
}

// Main function to clean up all tables
async function cleanupDatabase() {
  console.log('Starting database cleanup...');
  
  // Clean up tables in order (respecting foreign key constraints)
  for (const table of tables) {
    const success = await cleanupTable(table);
    if (!success) {
      console.error(`Failed to clean up table ${table}. Stopping cleanup process.`);
      process.exit(1);
    }
  }
  
  // Refresh materialized views
  await refreshMaterializedViews();
  
  console.log('Database cleanup completed successfully!');
}

// Run the cleanup
cleanupDatabase()
  .catch(error => {
    console.error('Unexpected error during cleanup:', error);
    process.exit(1);
  });
