/**
 * Test Supabase Connection and Get Schema Information (ESM Version)
 * 
 * This script tests the connection to Supabase and retrieves schema information
 * for the production schema tables.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = resolve(__dirname, '../../.env.local');
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

// Log environment variables to check if they're loaded
console.log('Environment variables loaded:', Object.keys(process.env).filter(key => key.includes('SUPABASE')).length > 0 ? 'Yes' : 'No');

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

// Create Supabase client with service role key and production schema
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'production'
  }
});

async function testConnection() {
  try {
    console.log('\n🔄 Testing connection to Supabase...');
    
    // Test the connection by getting the current server timestamp
    const { data: timestamp, error: timestampError } = await supabase.rpc('now');
    
    if (timestampError) {
      console.error('❌ RPC call failed:', timestampError.message);
    } else {
      console.log('✅ RPC call successful!');
      console.log('Server time:', timestamp);
    }

    // Check if production schema exists
    console.log('\n🔄 Checking if production schema exists...');
    const { data: schemaExists, error: schemaError } = await supabase.rpc('check_schema_exists', { schema_name: 'production' });
    
    if (schemaError) {
      console.error('❌ Schema check failed:', schemaError.message);
    } else {
      console.log(`✅ Production schema exists: ${schemaExists}`);
    }

    // Get table information and row counts
    const tables = ['customers', 'orders', 'order_line_items'];
    
    console.log('\n📊 Table Information:');
    console.log('='.repeat(50));
    
    for (const table of tables) {
      // Get row count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error(`❌ Error getting count for ${table}:`, countError.message);
        continue;
      }
      
      console.log(`\n📋 Table: production.${table}`);
      console.log('-'.repeat(50));
      console.log(`Row count: ${count}`);
      
      // Get a sample row if there are any rows
      if (count > 0) {
        const { data: sample, error: sampleError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (sampleError) {
          console.error(`❌ Error getting sample for ${table}:`, sampleError.message);
        } else if (sample && sample.length > 0) {
          console.log('\nSample row columns:');
          const columns = Object.keys(sample[0]);
          columns.forEach(col => console.log(`- ${col}`));
        }
      }
    }
    
    // List public schema functions
    console.log('\n🔄 Checking public schema functions...');
    
    // Since we can't directly query information_schema with the client,
    // we'll use a custom query approach
    const { data: functions, error: functionsError } = await supabase
      .rpc('list_public_functions');
    
    if (functionsError) {
      console.error('❌ Error listing public functions:', functionsError.message);
      console.log('Note: You may need to create a helper function "list_public_functions" in your database');
    } else if (functions && functions.length > 0) {
      console.log('\n📋 Public Schema Functions:');
      console.log('-'.repeat(50));
      functions.forEach(func => {
        console.log(`- ${func.routine_name}`);
      });
    } else {
      console.log('No public functions found or list_public_functions helper not available');
    }
    
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConnection();
