/**
 * Frontend-Compatible Supabase Test
 * 
 * This script tests the connection to Supabase using the frontend-compatible client
 * which should work better with the project's dependencies.
 */
require('dotenv').config({ path: '.env.local' });

// Import the createClient function directly from the ESM build
async function runTest() {
  try {
    // Dynamically import the ESM module
    const { createClient } = await import('@supabase/supabase-js');
    
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'production'
      }
    });
    
    console.log('Testing connection to Supabase...');
    
    // Test the connection by getting customer count
    const { data, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Connection test failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Connection successful!');
    console.log('Customer count:', data.count);
    
    // Test RPC function
    const { data: timestamp, error: rpcError } = await supabase.rpc('now');
    
    if (rpcError) {
      console.error('RPC call failed:', rpcError.message);
    } else {
      console.log('✅ RPC call successful!');
      console.log('Server time:', timestamp);
    }
    
    // Get schema information
    console.log('\nRetrieving schema information...');
    
    // Check tables
    const tables = ['customers', 'orders', 'order_line_items'];
    for (const table of tables) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'production')
        .eq('table_name', table);
      
      if (columnsError) {
        console.error(`Error getting columns for ${table}:`, columnsError.message);
        continue;
      }
      
      console.log(`\n📊 Table: production.${table}`);
      console.log('-'.repeat(50));
      
      if (columns && columns.length > 0) {
        columns.forEach(col => {
          console.log(`${col.column_name.padEnd(25)}${col.data_type}`);
        });
      } else {
        console.log(`No columns found for table ${table}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runTest();
