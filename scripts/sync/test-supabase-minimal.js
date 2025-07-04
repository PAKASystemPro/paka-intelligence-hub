/**
 * Minimal Supabase Connection Test
 * 
 * This script tests a minimal connection to Supabase with the most basic configuration.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Check if required environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key exists:', !!supabaseServiceKey);

// Create the most basic Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMinimalConnection() {
  try {
    console.log('\nTesting minimal Supabase connection...');
    
    // Try to get the current time using the built-in function
    console.log('\nAttempting to get server time...');
    const { data: timeData, error: timeError } = await supabase.rpc('now');
    
    if (timeError) {
      console.error('Error getting server time:', timeError.message);
    } else {
      console.log('Server time:', timeData);
    }
    
    // Try to list all tables in the database
    console.log('\nAttempting to list all tables...');
    const { data: tablesData, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('schemaname, tablename')
      .not('schemaname', 'in', '(pg_catalog, information_schema)')
      .order('schemaname', { ascending: true })
      .order('tablename', { ascending: true });
    
    if (tablesError) {
      console.error('Error listing tables:', tablesError.message);
    } else {
      console.log('Tables found:', tablesData.length);
      tablesData.forEach(table => {
        console.log(`- ${table.schemaname}.${table.tablename}`);
      });
    }
    
    // Try a simple health check
    console.log('\nAttempting health check...');
    const { data: healthData, error: healthError } = await supabase.rpc('get_service_status');
    
    if (healthError) {
      console.error('Error with health check:', healthError.message);
      
      // Try another common function
      console.log('\nTrying alternative health check...');
      const { data: altHealthData, error: altHealthError } = await supabase.rpc('get_service_key');
      
      if (altHealthError) {
        console.error('Error with alternative health check:', altHealthError.message);
      } else {
        console.log('Alternative health check result:', altHealthData);
      }
    } else {
      console.log('Health check result:', healthData);
    }
    
    // Try to check if we can access any table
    console.log('\nAttempting to access any table...');
    const { data: anyTableData, error: anyTableError } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true });
    
    if (anyTableError) {
      console.error('Error accessing users table:', anyTableError.message);
      
      // Try another common table
      console.log('\nTrying to access auth.users table...');
      const { data: authData, error: authError } = await supabase
        .from('auth.users')
        .select('count(*)', { count: 'exact', head: true });
      
      if (authError) {
        console.error('Error accessing auth.users table:', authError.message);
      } else {
        console.log('Auth users count:', authData.count);
      }
    } else {
      console.log('Users count:', anyTableData.count);
    }
    
    // Print Supabase client configuration
    console.log('\nSupabase client configuration:');
    console.log(JSON.stringify(supabase.getClientOptions(), null, 2));
    
  } catch (error) {
    console.error('Exception in testMinimalConnection:', error);
  }
}

// Run the test
testMinimalConnection().catch(console.error);
