/**
 * Test Supabase Connection and Get Schema Information
 * 
 * This script tests the connection to Supabase and retrieves schema information
 * for the production schema tables.
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
    // Note: Functions are in the public schema, not production
    const { data: timestamp, error: timestampError } = await supabase
      .schema('public')
      .rpc('now');
    
    if (timestampError) {
      console.error('❌ RPC call failed:', timestampError.message);
    } else {
      console.log('✅ RPC call successful!');
      console.log('Server time:', timestamp);
    }

    // Check if production schema exists
    console.log('\n🔄 Checking tables in production schema...');
    
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
    
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testConnection();
