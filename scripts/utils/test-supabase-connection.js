/**
 * Test Supabase Connection and Get Schema Information
 * 
 * This script tests the connection to Supabase and retrieves schema information
 * for the production schema tables.
 * 
 * Usage:
 * - Default: node test-supabase-connection.js (uses .env.local)
 * - Custom env file: node test-supabase-connection.js --env-file=path/to/.env.file
 */

// Parse command line arguments
let envFile = '.env.local';
process.argv.forEach((arg) => {
  if (arg.startsWith('--env-file=')) {
    envFile = arg.split('=')[1];
  }
});

console.log(`Using environment file: ${envFile}`);
require('dotenv').config({ path: envFile });
const { createClient } = require('@supabase/supabase-js');

// Check if required environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'production'
  }
});

// Test tables to check
const tables = ['customers', 'orders', 'order_line_items'];

async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    
    // Test the connection by getting the current timestamp
    const { data: timestamp, error: timestampError } = await supabase.rpc('now');
    
    if (timestampError) {
      throw new Error(`Connection test failed: ${timestampError.message}`);
    }
    
    console.log(`✅ Connection successful! Server time: ${timestamp}`);
    
    // Check if the production schema exists
    const { data: schemaExists, error: schemaError } = await supabase.rpc('check_schema_exists', { 
      schema_name: 'production' 
    });
    
    if (schemaError) {
      console.warn(`⚠️ Could not check if schema exists: ${schemaError.message}`);
    } else {
      console.log(`Schema 'production' exists: ${schemaExists ? 'Yes' : 'No'}`);
    }
    
    // Get table information
    console.log('\n📋 Table Information:');
    
    for (const table of tables) {
      // Get column information
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'production')
        .eq('table_name', table);
      
      if (columnsError) {
        console.error(`Error getting columns for ${table}: ${columnsError.message}`);
        continue;
      }
      
      console.log(`\n📊 Table: production.${table}`);
      console.log('-'.repeat(50));
      console.log('Column Name'.padEnd(25) + 'Data Type'.padEnd(15) + 'Nullable'.padEnd(10) + 'Default');
      console.log('-'.repeat(50));
      
      if (columns && columns.length > 0) {
        columns.forEach(col => {
          console.log(
            `${col.column_name.padEnd(25)}${col.data_type.padEnd(15)}${col.is_nullable.padEnd(10)}${col.column_default || ''}`
          );
        });
      } else {
        console.log(`No columns found for table ${table}`);
      }
      
      // Count rows in table
      const { data: count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error(`Error counting rows in ${table}: ${countError.message}`);
      } else {
        console.log(`\nRow count: ${count.count || 0}`);
      }
    }
    
    // Get function information
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type, data_type')
      .eq('routine_schema', 'public')
      .order('routine_name');
    
    if (functionsError) {
      console.error(`Error getting functions: ${functionsError.message}`);
    } else {
      console.log('\n📋 Public Functions:');
      console.log('-'.repeat(50));
      console.log('Function Name'.padEnd(35) + 'Type'.padEnd(15) + 'Return Type');
      console.log('-'.repeat(50));
      
      if (functions && functions.length > 0) {
        functions.forEach(func => {
          console.log(
            `${func.routine_name.padEnd(35)}${func.routine_type.padEnd(15)}${func.data_type || 'void'}`
          );
        });
      } else {
        console.log('No functions found in public schema');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testConnection();
