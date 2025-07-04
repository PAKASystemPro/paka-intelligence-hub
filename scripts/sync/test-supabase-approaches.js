/**
 * Test Different Supabase Connection Approaches
 * 
 * This script tries different approaches to connect to Supabase
 * to identify which method works best.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
console.log(`Loading environment from: ${envPath}`);

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

// Approach 1: Default client
async function testDefaultClient() {
  console.log('\n🔄 APPROACH 1: Default Supabase Client');
  console.log('--------------------------------------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test with a simple query
    console.log('Testing simple query...');
    const { data, error } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Success! Count:', data.count);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

// Approach 2: With schema option
async function testWithSchemaOption() {
  console.log('\n🔄 APPROACH 2: With Schema Option');
  console.log('--------------------------------------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'production'
      }
    });
    
    // Test with a simple query
    console.log('Testing simple query...');
    const { data, error } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Success! Count:', data.count);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

// Approach 3: With explicit schema in table name
async function testWithExplicitSchema() {
  console.log('\n🔄 APPROACH 3: With Explicit Schema in Table Name');
  console.log('--------------------------------------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test with a simple query
    console.log('Testing simple query...');
    const { data, error } = await supabase
      .from('production.customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Success! Count:', data.count);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

// Approach 4: With auth options
async function testWithAuthOptions() {
  console.log('\n🔄 APPROACH 4: With Auth Options');
  console.log('--------------------------------------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Test with a simple query
    console.log('Testing simple query...');
    const { data, error } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Success! Count:', data.count);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

// Approach 5: With raw SQL query
async function testWithRawQuery() {
  console.log('\n🔄 APPROACH 5: With Raw SQL Query');
  console.log('--------------------------------------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test with a raw SQL query
    console.log('Testing raw SQL query...');
    const { data, error } = await supabase
      .rpc('execute_sql', { sql_query: 'SELECT COUNT(*) FROM production.customers' });
    
    if (error) {
      console.error('❌ Error:', error.message);
      
      // Try another approach if the function doesn't exist
      console.log('Trying direct SQL query...');
      const { data: directData, error: directError } = await supabase
        .from('_sqlquery')
        .select('*')
        .rpc('sql', 'SELECT COUNT(*) FROM production.customers');
      
      if (directError) {
        console.error('❌ Direct SQL Error:', directError.message);
      } else {
        console.log('✅ Direct SQL Success!', directData);
      }
    } else {
      console.log('✅ Success!', data);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

// Approach 6: Check if schema exists
async function testSchemaExists() {
  console.log('\n🔄 APPROACH 6: Check If Schema Exists');
  console.log('--------------------------------------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if schema exists
    console.log('Checking if production schema exists...');
    const { data, error } = await supabase
      .from('information_schema.schemata')
      .select('schema_name')
      .eq('schema_name', 'production')
      .single();
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Success!', data);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

// Approach 7: List all schemas
async function testListSchemas() {
  console.log('\n🔄 APPROACH 7: List All Schemas');
  console.log('--------------------------------------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // List all schemas
    console.log('Listing all schemas...');
    const { data, error } = await supabase
      .from('information_schema.schemata')
      .select('schema_name')
      .limit(20);
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Success! Schemas:');
      data.forEach(schema => {
        console.log(`- ${schema.schema_name}`);
      });
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

// Approach 8: List tables in public schema
async function testListPublicTables() {
  console.log('\n🔄 APPROACH 8: List Tables in Public Schema');
  console.log('--------------------------------------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // List tables in public schema
    console.log('Listing tables in public schema...');
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(20);
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Success! Tables:');
      data.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

// Main function to run all tests
async function runAllTests() {
  console.log('Starting Supabase connection tests...');
  
  await testDefaultClient();
  await testWithSchemaOption();
  await testWithExplicitSchema();
  await testWithAuthOptions();
  await testWithRawQuery();
  await testSchemaExists();
  await testListSchemas();
  await testListPublicTables();
  
  console.log('\nAll tests completed!');
}

// Run all tests
runAllTests().catch(console.error);
