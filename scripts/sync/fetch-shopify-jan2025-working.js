/**
 * Fetch Shopify Data for January 2025 (Working Version)
 * 
 * This script fetches orders, line items, and customers from Shopify for January 2025
 * and inserts them into the Supabase database.
 * 
 * Uses the same Supabase client configuration as the working test-supabase-connection-updated.cjs
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

// Date range for January 2025
const startDate = '2025-01-01T00:00:00+08:00';
const endDate = '2025-01-31T23:59:59+08:00';

// GraphQL query for orders
const ordersQuery = `
  query getOrders($cursor: String) {
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
            numberOfOrders
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

    const response = await fetch(`${SHOPIFY_STORE_URL}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN
      },
      body: JSON.stringify({
        query: ordersQuery,
        variables: {
          cursor
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

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
    if (error.name === 'AbortError') {
      console.error('Error fetching orders from Shopify: Request timed out after 30 seconds.');
    } else {
      console.error('Error fetching orders from Shopify:', error);
    }
    throw error;
  }
}

// Process customer data and insert into Supabase
async function processCustomer(customer) {
  if (!customer) {
    console.warn('Skipping customer processing: customer data is null.');
    return null;
  }
  try {
    const shopifyCustomerId = customer.id.split('/').pop();
    const processedTags = processCustomerTags(customer.tags);

    const { data, error } = await supabase
      .from('customers')
      .upsert({
        shopify_customer_id: shopifyCustomerId,
        email: customer.email,
        first_name: customer.firstName,
        last_name: customer.lastName,
        total_spent: customer.amountSpent?.amount,
        orders_count: customer.numberOfOrders,
        created_at: customer.createdAt,
        tags: processedTags
      }, {
        onConflict: 'shopify_customer_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error upserting customer:', error);
      console.error('Problematic customer data:', JSON.stringify(customer, null, 2));
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception inserting customer:', error);
    console.error('Problematic customer data:', JSON.stringify(customer, null, 2));
    return null;
  }
}

// Process order data and insert into Supabase
async function processOrder(order, customerId) {
  const shopifyOrderId = order.id.split('/').pop();
  
  // Process order tags
  const tags = processOrderTags(order.tags);
  
  const orderData = {
    shopify_order_id: shopifyOrderId,
    customer_id: customerId,
    shopify_customer_id: order.customer?.id.split('/').pop(),
    order_number: order.name,
    total_price: parseFloat(order.totalPriceSet?.shopMoney?.amount || 0),
    processed_at: new Date(order.processedAt || order.createdAt),
    updated_at: new Date(),
    tags: tags
  };
  
  try {
    // Insert order into Supabase
    const { data, error } = await supabase
      .from('orders')
      .upsert([orderData], { 
        onConflict: 'shopify_order_id',
        returning: 'id' 
      });
    
    if (error) {
      console.error('Error inserting order:', error);
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error('Exception inserting order:', error);
    return null;
  }
}

// Process line items and insert into Supabase
async function processLineItems(lineItems, orderId, shopifyOrderId) {
  if (!lineItems || !lineItems.edges || lineItems.edges.length === 0) {
    return [];
  }
  
  const lineItemsData = lineItems.edges.map(edge => {
    const item = edge.node;
    const productId = item.product?.id?.split('/').pop();
    const variantId = item.variant?.id?.split('/').pop();
    
    return {
      order_id: orderId,
      shopify_order_id: shopifyOrderId,
      product_id: productId || null,
      variant_id: variantId || null,
      title: item.name,
      quantity: item.quantity,
      price: parseFloat(item.variant?.price || 0),
      sku: item.sku || null,
      product_type: item.product?.productType || null,
      vendor: item.vendor || null,
      updated_at: new Date()
    };
  });
  
  try {
    // Insert line items into Supabase
    const { data, error } = await supabase
      .from('order_line_items')
      .upsert(lineItemsData, { 
        onConflict: ['order_id', 'product_id', 'variant_id'],
        returning: true
      });
    
    if (error) {
      console.error('Error inserting line items:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception inserting line items:', error);
    return [];
  }
}

// Process customer tags
function processCustomerTags(tags) {
  if (!tags) return null;
  
  // If tags is already an array, return it
  if (Array.isArray(tags)) {
    return tags;
  }
  
  // If tags is a string, split by comma
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  
  return null;
}

// Process order tags
function processOrderTags(tags) {
  if (!tags) return null;
  
  // If tags is already an array, return it
  if (Array.isArray(tags)) {
    return tags;
  }
  
  // If tags is a string, split by comma
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  
  return null;
}

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('\n🔄 Testing connection to Supabase via RPC call with native fetch...');
    
    // Using a known, parameter-less function to test connectivity reliably
    const rpcUrl = `${supabaseUrl}/rest/v1/rpc/refresh_materialized_views`;

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      console.error(`❌ RPC call failed! Status: ${response.status}`);
      const errorText = await response.text();
      console.error('   - Response:', errorText);
      try {
        console.error('   - Parsed JSON:', JSON.parse(errorText));
      } catch (e) { /* Not JSON */ }
      return false;
    }

    console.log('✅ Supabase connection successful (via RPC)');
    console.log(`   - Function 'refresh_materialized_views' executed successfully (Status: ${response.status}).`);
    return true;

  } catch (error) {
    console.error('❌ Exception testing Supabase connection:', error);
    return false;
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
    // First, just test the Shopify connection
    console.log('\nTesting Shopify API connection...');
    const ordersData = await fetchShopifyOrders();
    
    if (!ordersData || !ordersData.edges) {
      console.log('No orders data returned or invalid format');
      return;
    }
    
    console.log(`Successfully fetched ${ordersData.edges.length} orders from Shopify`);
    
    // Process each order
    let hasNextPage = true;
    let cursor = null;
    let totalOrders = 0;
    let totalCustomers = 0;
    let totalLineItems = 0;
    
    while (hasNextPage) {
      console.log(`\nFetching orders batch with cursor: ${cursor || 'initial'}`);
      
      const batchData = cursor ? await fetchShopifyOrders(cursor) : ordersData;
      
      console.log(`Processing ${batchData.edges.length} orders...`);
      
      // Process each order
      for (const edge of batchData.edges) {
        const order = edge.node;
        
        // Process customer
        const customerResult = await processCustomer(order.customer);
        const customerId = customerResult?.id;
        
        if (customerId) {
          totalCustomers++;
          
          // Process order
          const orderResult = await processOrder(order, customerId);
          const orderId = orderResult?.id;
          
          if (orderId) {
            totalOrders++;
            
            // Process line items
            const shopifyOrderId = order.id.split('/').pop();
            const lineItemsResult = await processLineItems(order.lineItems, orderId, shopifyOrderId);
            
            totalLineItems += lineItemsResult.length || 0;
          }
        }
      }
      
      // Update pagination info
      hasNextPage = batchData.pageInfo.hasNextPage;
      cursor = batchData.pageInfo.endCursor;
      
      console.log(`Processed batch. Total so far: ${totalOrders} orders, ${totalCustomers} customers, ${totalLineItems} line items`);
    }
    
    console.log('\nData fetch completed successfully!');
    console.log(`Total processed: ${totalOrders} orders, ${totalCustomers} customers, ${totalLineItems} line items`);
    
    // Refresh materialized views if they exist
    try {
      console.log('\nAttempting to refresh materialized views...');
      const { data, error } = await supabase
        .schema('public')
        .rpc('refresh_materialized_views');
      
      if (error) {
        console.error('Error refreshing materialized views:', error);
      } else {
        console.log('Materialized views refreshed successfully');
      }
    } catch (error) {
      console.error('Exception calling refresh_materialized_views function:', error);
    }
    
  } catch (error) {
    console.error('Error in fetchAndProcessData:', error);
  }
}

// Run the main function
fetchAndProcessData().catch(console.error);
