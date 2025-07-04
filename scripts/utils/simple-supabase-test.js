/**
 * Simple Supabase Connection Test
 * 
 * This script tests the connection to Supabase and retrieves basic schema information
 * using a minimal configuration.
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

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple test function
async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    
    // Simple query to test connection
    const { data, error } = await supabase
      .from('production.customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('Connection test failed:', error.message);
      
      // Try with explicit schema setting
      console.log('\nTrying with explicit schema setting...');
      const supabaseWithSchema = createClient(supabaseUrl, supabaseServiceKey, {
        db: { schema: 'production' }
      });
      
      const { data: dataWithSchema, error: errorWithSchema } = await supabaseWithSchema
        .from('customers')
        .select('count(*)', { count: 'exact', head: true });
      
      if (errorWithSchema) {
        console.error('Connection test with schema setting failed:', errorWithSchema.message);
      } else {
        console.log('✅ Connection with schema setting successful!');
        console.log('Customer count:', dataWithSchema.count);
      }
      
    } else {
      console.log('✅ Connection successful!');
      console.log('Customer count:', data.count);
    }
    
    // Try a simple RPC call
    console.log('\nTesting RPC function call...');
    const { data: timestamp, error: rpcError } = await supabase.rpc('now');
    
    if (rpcError) {
      console.error('RPC call failed:', rpcError.message);
    } else {
      console.log('✅ RPC call successful!');
      console.log('Server time:', timestamp);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConnection();
