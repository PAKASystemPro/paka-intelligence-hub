/**
 * Test Supabase Connection Only
 * 
 * This script tests only the Supabase connection using the approach from the previously
 * successful test-supabase-connection-updated.cjs script.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.local');
console.log(`Loading environment from: ${envPath}`);

// Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key exists:', !!supabaseServiceKey);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSupabaseConnection() {
  try {
    console.log('\n🔄 Testing connection to Supabase...');
    
    // Test with a simple RPC call to the public schema
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('check_schema_exists', { schema_name: 'production' });
    
    if (rpcError) {
      console.error('❌ RPC call failed:', rpcError.message);
    } else {
      console.log('✅ RPC call successful:', rpcData);
    }
    
    console.log('\n🔄 Checking tables in production schema...');
    
    // Check customers table
    console.log('\n📋 Table: production.customers');
    console.log('--------------------------------------------------');
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (customersError) {
      console.error('❌ Error querying customers table:', customersError.message);
    } else {
      console.log('Row count:', customersData?.count || 0);
    }
    
    // Try with explicit schema
    console.log('\n📋 Trying with explicit schema...');
    const { data: explicitData, error: explicitError } = await supabase
      .from('production.customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (explicitError) {
      console.error('❌ Error with explicit schema:', explicitError.message);
    } else {
      console.log('Row count with explicit schema:', explicitData?.count || 0);
    }
    
    // Try with schema option
    console.log('\n📋 Trying with schema option...');
    const supabaseWithSchema = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'production' }
    });
    
    const { data: schemaOptionData, error: schemaOptionError } = await supabaseWithSchema
      .from('customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (schemaOptionError) {
      console.error('❌ Error with schema option:', schemaOptionError.message);
    } else {
      console.log('Row count with schema option:', schemaOptionData?.count || 0);
    }
    
    console.log('\n✅ Connection test completed!');
    
  } catch (error) {
    console.error('Error in testSupabaseConnection:', error);
  }
}

// Run the test
testSupabaseConnection().catch(console.error);
