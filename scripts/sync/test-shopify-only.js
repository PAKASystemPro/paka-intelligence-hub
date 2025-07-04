/**
 * Test Shopify API Connection Only
 * 
 * This script tests only the Shopify API connection with a corrected query.
 */
require('dotenv').config({ path: '.env.local' });
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
console.log(`Loading environment from: ${envPath}`);

// Check if required environment variables are set
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_TOKEN) {
  console.error('Error: Missing Shopify credentials in environment variables');
  console.error('Make sure SHOPIFY_STORE_URL and SHOPIFY_ADMIN_TOKEN are set in .env.local');
  process.exit(1);
}

console.log('Shopify Store URL:', SHOPIFY_STORE_URL);
console.log('Shopify Admin Token exists:', !!SHOPIFY_ADMIN_TOKEN);

// GraphQL query for orders - corrected version
const ordersQuery = `
  query getOrders {
    orders(first: 5, query: "created_at:>=2025-01-01 created_at:<=2025-01-31") {
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
    
    const response = await fetch(`${SHOPIFY_STORE_URL}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN
      },
      body: JSON.stringify({
        query: ordersQuery
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
      console.log('Total Price:', sampleOrder.totalPriceSet?.shopMoney?.amount);
      
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

// Run the test
testShopifyConnection().catch(console.error);
