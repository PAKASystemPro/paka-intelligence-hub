/**
 * Fetch Shopify Data for January 2025 (Simple Version)
 * 
 * This script fetches orders, line items, and customers from Shopify for January 2025
 * and inserts them into the Supabase database.
 * 
 * This version uses a simplified Supabase client configuration.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Shopify GraphQL API credentials
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

// Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_TOKEN) {
  console.error('Missing Shopify credentials in environment variables');
  console.error('SHOPIFY_STORE_URL:', SHOPIFY_STORE_URL ? 'exists' : 'missing');
  console.error('SHOPIFY_ADMIN_TOKEN:', SHOPIFY_ADMIN_TOKEN ? 'exists' : 'missing');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'exists' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'exists' : 'missing');
  process.exit(1);
}

console.log('Environment variables loaded successfully');
console.log('Supabase URL:', supabaseUrl);
console.log('Shopify Store URL:', SHOPIFY_STORE_URL);

// Create Supabase client with simpler configuration
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test with a simple query
    const { data, error } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      console.error('Error testing Supabase connection:', error);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Exception testing Supabase connection:', error);
    return false;
  }
}

// Date range for January 2025
const startDate = '2025-01-01T00:00:00+08:00';
const endDate = '2025-01-31T23:59:59+08:00';

// GraphQL query for orders
const ordersQuery = `
  query getOrders($cursor: String, $startDate: DateTime!, $endDate: DateTime!) {
    orders(first: 100, after: $cursor, query: "created_at:>=${startDate} created_at:<=${endDate}") {
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
            createdAt
            ordersCount
            tags
            amountSpent {
              amount
              currencyCode
            }
          }
          tags
          lineItems(first: 50) {
            edges {
              node {
                id
                name
                quantity
                sku
                vendor
                product {
                  id
                  productType
                }
                variant {
                  id
                  price
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Function to fetch orders from Shopify
async function fetchShopifyOrders(cursor = null) {
  try {
    console.log('Sending request to Shopify GraphQL API...');
    const response = await fetch(`${SHOPIFY_STORE_URL}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN
      },
      body: JSON.stringify({
        query: ordersQuery,
        variables: {
          cursor,
          startDate,
          endDate
        }
      })
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      console.error('Response:', await response.text());
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    
    return data.data.orders;
  } catch (error) {
    console.error('Error fetching orders from Shopify:', error);
    throw error;
  }
}

// Main function to fetch and process data
async function fetchAndProcessData() {
  console.log('Starting data fetch for January 2025...');
  
  // Test Supabase connection first
  const connectionSuccessful = await testSupabaseConnection();
  if (!connectionSuccessful) {
    console.error('Failed to connect to Supabase. Aborting.');
    return;
  }
  
  try {
    // Just test the Shopify connection for now
    console.log('Testing Shopify API connection...');
    const ordersData = await fetchShopifyOrders();
    
    if (!ordersData || !ordersData.edges) {
      console.log('No orders data returned or invalid format');
      return;
    }
    
    console.log(`Successfully fetched ${ordersData.edges.length} orders from Shopify`);
    console.log('First order sample:', JSON.stringify(ordersData.edges[0].node.id));
    console.log('Total orders available:', ordersData.edges.length);
    
    // For now, just log the first customer and order details
    if (ordersData.edges.length > 0) {
      const firstOrder = ordersData.edges[0].node;
      console.log('\nFirst Order Details:');
      console.log('Order ID:', firstOrder.id);
      console.log('Order Name:', firstOrder.name);
      console.log('Created At:', firstOrder.createdAt);
      console.log('Total Price:', firstOrder.totalPriceSet?.shopMoney?.amount);
      
      if (firstOrder.customer) {
        console.log('\nCustomer Details:');
        console.log('Customer ID:', firstOrder.customer.id);
        console.log('Customer Email:', firstOrder.customer.email);
        console.log('Customer Name:', `${firstOrder.customer.firstName} ${firstOrder.customer.lastName}`);
        console.log('Orders Count:', firstOrder.customer.ordersCount);
      }
      
      if (firstOrder.lineItems && firstOrder.lineItems.edges.length > 0) {
        console.log('\nLine Items:');
        firstOrder.lineItems.edges.forEach((edge, index) => {
          const item = edge.node;
          console.log(`Item ${index + 1}:`, item.name);
          console.log(`  Quantity:`, item.quantity);
          console.log(`  Price:`, item.variant?.price);
          console.log(`  Product Type:`, item.product?.productType);
        });
      }
    }
    
    console.log('\nShopify API test completed successfully!');
    
  } catch (error) {
    console.error('Error in fetchAndProcessData:', error);
  }
}

// Run the main function
fetchAndProcessData().catch(console.error);
