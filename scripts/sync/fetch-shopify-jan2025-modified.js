/**
 * Fetch Shopify Data for January 2025 (Modified Version)
 * 
 * This script fetches orders, line items, and customers from Shopify for January 2025
 * and inserts them into the Supabase database.
 * 
 * This version uses the native fetch API and a different approach to Supabase client.
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

// Create Supabase client with production schema
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

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

// Process customer data and insert into Supabase
async function processCustomer(customer) {
  if (!customer) return null;
  
  const shopifyCustomerId = customer.id.split('/').pop();
  
  // Process customer tags
  const tags = processCustomerTags(customer.tags);
  
  const customerData = {
    shopify_customer_id: shopifyCustomerId,
    email: customer.email,
    first_name: customer.firstName,
    last_name: customer.lastName,
    total_spent: parseFloat(customer.amountSpent?.amount || 0),
    orders_count: customer.ordersCount,
    created_at: new Date(customer.createdAt),
    updated_at: new Date(),
    tags: tags
  };
  
  try {
    // Insert customer into Supabase
    const { data, error } = await supabase.schema('production')
      .from('customers')
      .upsert([customerData], { 
        onConflict: 'shopify_customer_id',
        returning: 'id' 
      });
    
    if (error) {
      console.error('Error inserting customer:', error);
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error('Exception inserting customer:', error);
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
    const { data, error } = await supabase.schema('production')
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
    const { data, error } = await supabase.schema('production')
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

// Main function to fetch and process data
async function fetchAndProcessData() {
  console.log('Starting data fetch for January 2025...');
  
  let hasNextPage = true;
  let cursor = null;
  let totalOrders = 0;
  let totalCustomers = 0;
  let totalLineItems = 0;
  
  try {
    // Test Supabase connection first
    console.log('Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase.schema('production')
      .from('customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (testError) {
      console.error('Error connecting to Supabase:', testError);
      return;
    }
    
    console.log('Supabase connection successful');
    
    while (hasNextPage) {
      console.log(`Fetching orders batch with cursor: ${cursor || 'initial'}`);
      
      const ordersData = await fetchShopifyOrders(cursor);
      
      if (!ordersData || !ordersData.edges) {
        console.log('No orders data returned or invalid format');
        break;
      }
      
      console.log(`Processing ${ordersData.edges.length} orders...`);
      
      // Process each order
      for (const edge of ordersData.edges) {
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
      hasNextPage = ordersData.pageInfo.hasNextPage;
      cursor = ordersData.pageInfo.endCursor;
      
      console.log(`Processed batch. Total so far: ${totalOrders} orders, ${totalCustomers} customers, ${totalLineItems} line items`);
    }
    
    console.log('Data fetch completed successfully!');
    console.log(`Total processed: ${totalOrders} orders, ${totalCustomers} customers, ${totalLineItems} line items`);
    
    // Refresh materialized views if they exist
    try {
      const { data, error } = await supabase.schema('public').rpc('refresh_materialized_views');
      
      if (error) {
        console.error('Error refreshing materialized views:', error);
      } else {
        console.log('Materialized views refreshed successfully');
      }
    } catch (error) {
      console.error('Error calling refresh_materialized_views function:', error);
    }
    
  } catch (error) {
    console.error('Error in fetchAndProcessData:', error);
  }
}

// Run the main function
fetchAndProcessData().catch(console.error);
