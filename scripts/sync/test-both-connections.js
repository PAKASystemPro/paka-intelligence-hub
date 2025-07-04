/**
 * Test Both Supabase and Shopify Connections
 * 
 * This script tests both the Supabase connection (using the exact code from the working test script)
 * and the Shopify API connection.
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
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_TOKEN) {
  console.error('Error: Missing Shopify credentials in environment variables');
  console.error('Make sure SHOPIFY_STORE_URL and SHOPIFY_ADMIN_TOKEN are set in .env.local');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key exists:', !!supabaseServiceKey);
console.log('Shopify Store URL:', SHOPIFY_STORE_URL);
console.log('Shopify Admin Token exists:', !!SHOPIFY_ADMIN_TOKEN);

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

// Test Supabase connection (exact code from the working test script)
async function testSupabaseConnection() {
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
      console.log('Row count:', customersData.count);
    }
    
    // Check orders table
    console.log('\n📋 Table: production.orders');
    console.log('--------------------------------------------------');
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('count(*)', { count: 'exact', head: true });
    
    if (ordersError) {
      console.error('❌ Error querying orders table:', ordersError.message);
    } else {
      console.log('Row count:', ordersData.count);
    }
    
    // Check order_line_items table
    console.log('\n📋 Table: production.order_line_items');
    console.log('--------------------------------------------------');
    const { data: lineItemsData, error: lineItemsError } = await supabase
      .from('order_line_items')
      .select('count(*)', { count: 'exact', head: true });
    
    if (lineItemsError) {
      console.error('❌ Error querying order_line_items table:', lineItemsError.message);
    } else {
      console.log('Row count:', lineItemsData.count);
    }
    
    console.log('\n✅ Supabase connection test completed!');
    return true;
  } catch (error) {
    console.error('Exception testing Supabase connection:', error);
    return false;
  }
}

// GraphQL query for orders
const ordersQuery = `
  query getOrders($startDate: DateTime!, $endDate: DateTime!) {
    orders(first: 5, query: "created_at:>=$startDate created_at:<=$endDate") {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          createdAt
          processedAt
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            id
            email
            firstName
            lastName
          }
        }
      }
    }
  }
`;

// Test Shopify connection
async function testShopifyConnection() {
  try {
    console.log('\n🔄 Testing connection to Shopify API...');
    
    // Date range for January 2025
    const startDate = '2025-01-01T00:00:00+08:00';
    const endDate = '2025-01-31T23:59:59+08:00';
    
    const response = await fetch(`${SHOPIFY_STORE_URL}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN
      },
      body: JSON.stringify({
        query: ordersQuery,
        variables: {
          startDate,
          endDate
        }
      })
    });

    if (!response.ok) {
      console.error(`❌ HTTP error! Status: ${response.status}`);
      console.error('Response:', await response.text());
      return false;
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return false;
    }
    
    const orders = data.data.orders;
    console.log('✅ Shopify API connection successful!');
    console.log(`Retrieved ${orders.edges.length} orders`);
    
    if (orders.edges.length > 0) {
      console.log('\nSample order:');
      const sampleOrder = orders.edges[0].node;
      console.log('ID:', sampleOrder.id);
      console.log('Name:', sampleOrder.name);
      console.log('Created At:', sampleOrder.createdAt);
      
      if (sampleOrder.customer) {
        console.log('\nCustomer:');
        console.log('ID:', sampleOrder.customer.id);
        console.log('Name:', `${sampleOrder.customer.firstName} ${sampleOrder.customer.lastName}`);
        console.log('Email:', sampleOrder.customer.email);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Exception testing Shopify connection:', error);
    return false;
  }
}

// Main function to test both connections
async function testBothConnections() {
  console.log('Starting connection tests...');
  
  // Test Supabase connection
  const supabaseConnected = await testSupabaseConnection();
  console.log('\nSupabase connection successful:', supabaseConnected);
  
  // Test Shopify connection
  const shopifyConnected = await testShopifyConnection();
  console.log('\nShopify connection successful:', shopifyConnected);
  
  console.log('\nConnection tests completed!');
}

// Run the tests
testBothConnections().catch(console.error);
