// Script to fetch real Shopify order data for January 2025 and test cohort analysis
const { createClient } = require('@supabase/supabase-js');
// Import fetch properly for Node.js environment
import('node-fetch').then(module => {
  global.fetch = module.default;
  main();
});
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key for table operations (production schema)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'production'
    }
  }
);

// Initialize a separate client for RPC calls (public schema)
const rpcClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Shopify API credentials
const SHOPIFY_SHOP = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

// Timestamp suffix for this test run
const timestamp = Date.now();

async function main() {
  try {
    console.log('Starting Shopify January 2025 cohort test with real data...');
    
    // Step 1: Clear existing test data
    console.log('\nStep 1: Clearing existing test data...');
    await clearExistingData();
    
    // Step 2: Fetch January 2025 orders from Shopify
    console.log('\nStep 2: Fetching January 2025 orders from Shopify...');
    const januaryOrders = await fetchJanuary2025Orders();
    console.log(`Fetched ${januaryOrders.length} orders from January 2025`);
    
    // Step 3: Extract unique customers from orders
    console.log('\nStep 3: Extracting unique customers...');
    const customers = extractCustomers(januaryOrders);
    console.log(`Found ${customers.length} unique customers`);
    
    // Step 4: Insert customers into database
    console.log('\nStep 4: Inserting customers into database...');
    const insertedCustomers = await insertCustomers(customers);
    console.log(`Inserted ${insertedCustomers.length} customers`);
    
    // Step 5: Insert orders into database
    console.log('\nStep 5: Inserting orders into database...');
    const insertedOrders = await insertOrders(januaryOrders, insertedCustomers);
    console.log(`Inserted ${insertedOrders.length} orders`);
    
    // Step 6: Insert order line items into database
    console.log('\nStep 6: Inserting order line items into database...');
    const insertedLineItems = await insertLineItems(januaryOrders, insertedOrders);
    console.log(`Inserted ${insertedLineItems.length} line items`);
    
    // Step 7: Classify customers based on first order product type
    console.log('\nStep 7: Classifying customers...');
    await classifyCustomers();
    
    // Step 8: Refresh materialized views
    console.log('\nStep 8: Refreshing materialized views...');
    await refreshViews();
    
    // Step 9: Get and validate cohort heatmap data
    console.log('\nStep 9: Validating cohort heatmap data...');
    const cohortData = await getCohortHeatmap();
    
    // Print summary
    printCohortSummary(cohortData);
    
    // Step 10: Get product-specific cohort data
    console.log('\nStep 10: Getting product-specific cohort data...');
    await getProductCohortData();
    
    console.log('\nJanuary 2025 cohort test with real Shopify data complete!');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Helper function to clear existing test data
async function clearExistingData() {
  try {
    console.log('Deleting test data with timestamp pattern...');
    
    // Delete order line items first (respecting foreign key constraints)
    const { error: lineItemsError } = await supabase
      .from('order_line_items')
      .delete()
      .like('sku', `%_${timestamp}%`);
    
    if (lineItemsError) {
      console.error('Error deleting line items:', lineItemsError);
    } else {
      console.log('Cleared any existing line items with matching timestamp');
    }
    
    // Then delete orders
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .like('shopify_order_id', `%_${timestamp}%`);
    
    if (ordersError) {
      console.error('Error deleting orders:', ordersError);
    } else {
      console.log('Cleared any existing orders with matching timestamp');
    }
    
    // Finally delete customers
    const { error: customersError } = await supabase
      .from('customers')
      .delete()
      .like('shopify_customer_id', `%_${timestamp}%`);
    
    if (customersError) {
      console.error('Error deleting customers:', customersError);
    } else {
      console.log('Cleared any existing customers with matching timestamp');
    }
    
    return true;
  } catch (error) {
    console.error('Error in clearExistingData:', error);
    return false;
  }
}

// Fetch January 2025 orders from Shopify
async function fetchJanuary2025Orders() {
  try {
    console.log('Fetching orders from Shopify API...');
    
    // Define the GraphQL query for orders
    const query = `
      query getJanuary2025Orders($cursor: String) {
        orders(
          first: 50, 
          after: $cursor, 
          query: "processed_at:>=2025-01-01 AND processed_at:<=2025-01-31"
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              name
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
                numberOfOrders
                amountSpent {
                  amount
                  currencyCode
                }
                createdAt
              }
              lineItems(first: 10) {
                edges {
                  node {
                    id
                    title
                    quantity
                    variant {
                      id
                      sku
                      price
                    }
                    product {
                      id
                      productType
                      vendor
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    // Make paginated requests to fetch all orders
    let allOrders = [];
    let hasNextPage = true;
    let cursor = null;
    
    while (hasNextPage) {
      const response = await fetchShopifyGraphQL(query, { cursor });
      
      if (!response.data || !response.data.orders) {
        console.error('Error fetching orders:', response.errors || 'Unknown error');
        break;
      }
      
      const { edges, pageInfo } = response.data.orders;
      
      // Add orders to our collection
      allOrders = [...allOrders, ...edges.map(edge => edge.node)];
      
      // Update pagination variables
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
      
      console.log(`Fetched ${edges.length} orders. Total: ${allOrders.length}`);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return allOrders;
  } catch (error) {
    console.error('Error fetching orders from Shopify:', error);
    return [];
  }
}

// Helper function to make GraphQL requests to Shopify
async function fetchShopifyGraphQL(query, variables = {}) {
  try {
    // Parse the shop URL to ensure proper formatting
    let shopUrl = SHOPIFY_SHOP;
    
    // Remove any protocol prefix if present
    shopUrl = shopUrl.replace(/^https?:\/\//, '');
    
    // Construct the full GraphQL endpoint URL
    const graphqlUrl = `https://${shopUrl}/admin/api/2023-07/graphql.json`;
    console.log(`Making GraphQL request to: ${graphqlUrl}`);
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error making GraphQL request:', error);
    throw error;
  }
}

// Extract unique customers from orders
function extractCustomers(orders) {
  const customerMap = new Map();
  
  for (const order of orders) {
    if (!order.customer) continue;
    
    const customer = order.customer;
    const customerId = customer.id.split('/').pop(); // Extract ID from GraphQL ID
    
    if (!customerMap.has(customerId)) {
      // Extract total_spent from amountSpent.amount
      const totalSpent = customer.amountSpent && customer.amountSpent.amount 
        ? parseFloat(customer.amountSpent.amount) 
        : 0;
      
      // Extract orders_count from numberOfOrders
      const ordersCount = customer.numberOfOrders !== undefined 
        ? parseInt(customer.numberOfOrders) 
        : 0;
      
      customerMap.set(customerId, {
        shopify_customer_id: customerId,
        email: customer.email || `customer_${customerId}@example.com`,
        first_name: customer.firstName || 'Unknown',
        last_name: customer.lastName || 'Customer',
        total_spent: totalSpent,
        orders_count: ordersCount,
        created_at: customer.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
  
  return Array.from(customerMap.values());
}

// Insert customers into database
async function insertCustomers(customers) {
  try {
    // Add timestamp suffix to customer IDs for easy cleanup
    const customersWithTimestamp = customers.map(customer => ({
      ...customer,
      shopify_customer_id: `${customer.shopify_customer_id}_${timestamp}`
    }));
    
    // Insert in batches to avoid request size limits
    const batchSize = 50;
    const insertedCustomers = [];
    
    for (let i = 0; i < customersWithTimestamp.length; i += batchSize) {
      const batch = customersWithTimestamp.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('customers')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`Error inserting customer batch ${i / batchSize + 1}:`, error);
        continue;
      }
      
      if (data) {
        insertedCustomers.push(...data);
      }
      
      console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(customersWithTimestamp.length / batchSize)}`);
    }
    
    return insertedCustomers;
  } catch (error) {
    console.error('Error inserting customers:', error);
    return [];
  }
}

// Insert orders into database
async function insertOrders(shopifyOrders, insertedCustomers) {
  try {
    // Create a map of shopify_customer_id to database customer id
    const customerIdMap = new Map();
    for (const customer of insertedCustomers) {
      // Extract the original Shopify ID without the timestamp
      const originalShopifyId = customer.shopify_customer_id.split('_')[0];
      customerIdMap.set(originalShopifyId, customer.id);
    }
    
    // Prepare orders for insertion
    const orders = [];
    
    for (const shopifyOrder of shopifyOrders) {
      // Skip orders without customers
      if (!shopifyOrder.customer) continue;
      
      const shopifyCustomerId = shopifyOrder.customer.id.split('/').pop();
      const customerId = customerIdMap.get(shopifyCustomerId);
      
      // Skip if we couldn't find the customer in our database
      if (!customerId) {
        console.warn(`Customer not found for order ${shopifyOrder.name}, customer ID: ${shopifyCustomerId}`);
        continue;
      }
      
      const orderId = shopifyOrder.id.split('/').pop();
      
      orders.push({
        shopify_order_id: `${orderId}_${timestamp}`,
        customer_id: customerId,
        shopify_customer_id: `${shopifyCustomerId}_${timestamp}`,
        order_number: shopifyOrder.name,
        total_price: parseFloat(shopifyOrder.totalPriceSet?.shopMoney?.amount || 0),
        processed_at: shopifyOrder.processedAt,
        updated_at: new Date().toISOString()
      });
    }
    
    // Insert in batches
    const batchSize = 50;
    const insertedOrders = [];
    
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('orders')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`Error inserting order batch ${i / batchSize + 1}:`, error);
        continue;
      }
      
      if (data) {
        insertedOrders.push(...data);
      }
      
      console.log(`Inserted order batch ${i / batchSize + 1}/${Math.ceil(orders.length / batchSize)}`);
    }
    
    return insertedOrders;
  } catch (error) {
    console.error('Error inserting orders:', error);
    return [];
  }
}

// Insert order line items into database
async function insertLineItems(shopifyOrders, insertedOrders) {
  try {
    // Create a map of shopify_order_id to database order id
    const orderIdMap = new Map();
    for (const order of insertedOrders) {
      // Extract the original Shopify ID without the timestamp
      const originalShopifyId = order.shopify_order_id.split('_')[0];
      orderIdMap.set(originalShopifyId, order.id);
    }
    
    // Prepare line items for insertion
    const lineItems = [];
    
    for (const shopifyOrder of shopifyOrders) {
      const orderId = shopifyOrder.id.split('/').pop();
      const databaseOrderId = orderIdMap.get(orderId);
      
      // Skip if we couldn't find the order in our database
      if (!databaseOrderId) {
        console.warn(`Order not found for line items: ${shopifyOrder.name}, order ID: ${orderId}`);
        continue;
      }
      
      // Process line items
      if (shopifyOrder.lineItems && shopifyOrder.lineItems.edges) {
        for (const edge of shopifyOrder.lineItems.edges) {
          const item = edge.node;
          if (!item) continue;
          
          const productId = item.product?.id?.split('/').pop() || '';
          const variantId = item.variant?.id?.split('/').pop() || '';
          const lineItemId = item.id.split('/').pop();
          
          lineItems.push({
            order_id: databaseOrderId,
            shopify_order_id: `${orderId}_${timestamp}`,
            product_id: productId,
            variant_id: variantId,
            title: item.title || 'Unknown Product',
            quantity: parseInt(item.quantity || 1),
            price: parseFloat(item.variant?.price || 0),
            sku: `${item.variant?.sku || 'SKU'}_${timestamp}`,
            product_type: item.product?.productType || 'Unknown',
            vendor: item.product?.vendor || 'Unknown',
            updated_at: new Date().toISOString()
          });
        }
      }
    }
    
    // Insert in batches
    const batchSize = 50;
    const insertedLineItems = [];
    
    for (let i = 0; i < lineItems.length; i += batchSize) {
      const batch = lineItems.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('order_line_items')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`Error inserting line item batch ${i / batchSize + 1}:`, error);
        continue;
      }
      
      if (data) {
        insertedLineItems.push(...data);
      }
      
      console.log(`Inserted line item batch ${i / batchSize + 1}/${Math.ceil(lineItems.length / batchSize)}`);
    }
    
    return insertedLineItems;
  } catch (error) {
    console.error('Error inserting line items:', error);
    return [];
  }
}

// Classify customers based on their first order's product type
async function classifyCustomers() {
  try {
    console.log('Calling classify_new_customers() RPC function...');
    
    // Call the RPC function to classify customers
    const { data, error } = await rpcClient.rpc('classify_new_customers');
    
    if (error) {
      console.error('Error classifying customers:', error);
      return false;
    }
    
    console.log('Customer classification completed successfully');
    return true;
  } catch (error) {
    console.error('Error in classifyCustomers:', error);
    return false;
  }
}

// Refresh materialized views
async function refreshViews() {
  try {
    console.log('Calling refresh_materialized_views() RPC function...');
    
    // Call the RPC function to refresh views
    const { data, error } = await rpcClient.rpc('refresh_materialized_views');
    
    if (error) {
      console.error('Error refreshing materialized views:', error);
      return false;
    }
    
    console.log('Materialized views refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error in refreshViews:', error);
    return false;
  }
}

// Get cohort heatmap data
async function getCohortHeatmap() {
  try {
    console.log('Getting cohort heatmap data...');
    
    // Call the RPC function to get cohort heatmap data
    const { data, error } = await rpcClient.rpc('get_cohort_heatmap');
    
    if (error) {
      console.error('Error getting cohort heatmap data:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getCohortHeatmap:', error);
    return [];
  }
}

// Get product-specific cohort data
async function getProductCohortData() {
  try {
    const productTypes = ['深睡寶寶', '天皇丸', '皇后丸', 'Other'];
    
    for (const productType of productTypes) {
      console.log(`\nGetting cohort data for product: ${productType}`);
      
      // Call the RPC function to get product-specific cohort data
      const { data, error } = await rpcClient.rpc('get_cohort_heatmap_by_product', {
        p_product_cohort: productType
      });
      
      if (error) {
        console.error(`Error getting cohort data for ${productType}:`, error);
        continue;
      }
      
      console.log(`Cohort data for ${productType}:`);
      printCohortSummary(data || []);
    }
    
    return true;
  } catch (error) {
    console.error('Error in getProductCohortData:', error);
    return false;
  }
}

// Helper function to print cohort summary
function printCohortSummary(cohortData) {
  if (!cohortData || cohortData.length === 0) {
    console.log('No cohort data available.');
    return;
  }
  
  // Group by cohort month
  const cohortsByMonth = {};
  cohortData.forEach(row => {
    const month = row.cohort_month;
    if (!cohortsByMonth[month]) {
      cohortsByMonth[month] = {
        cohort_size: row.cohort_size || 0,
        second_orders: 0
      };
    }
    
    // Add second orders for this month
    if (row.months_since_first !== null) {
      cohortsByMonth[month].second_orders += (row.second_orders || 0);
    }
  });
  
  // Print summary
  console.log('\nCOHORT HEATMAP SUMMARY:');
  console.log('Cohort Month | New Customers | 2nd Orders | Retention Rate');
  console.log('-------------|--------------|------------|---------------');
  
  let totalNew = 0;
  let totalSecond = 0;
  
  Object.keys(cohortsByMonth).sort().forEach(month => {
    const cohort = cohortsByMonth[month];
    const newCustomers = cohort.cohort_size || 0;
    const secondOrders = cohort.second_orders || 0;
    const retentionRate = newCustomers > 0 ? (secondOrders / newCustomers * 100).toFixed(1) : '0.0';
    
    totalNew += newCustomers;
    totalSecond += secondOrders;
    
    console.log(`${month}      | ${newCustomers.toString().padStart(12)} | ${secondOrders.toString().padStart(10)} | ${retentionRate.padStart(13)}%`);
  });
  
  // Print total
  const totalRetention = totalNew > 0 ? (totalSecond / totalNew * 100).toFixed(1) : '0.0';
  console.log('-------------|--------------|------------|---------------');
  console.log(`Total        | ${totalNew.toString().padStart(12)} | ${totalSecond.toString().padStart(10)} | ${totalRetention.padStart(13)}%`);
  
  // Print detailed heatmap data
  console.log('\nDETAILED COHORT HEATMAP:');
  console.log('Cohort Month | Months Since First | New Customers | 2nd Orders | Retention Rate');
  console.log('-------------|-------------------|--------------|------------|---------------');
  
  cohortData.forEach(row => {
    const month = row.cohort_month;
    const monthsSince = row.months_since_first !== null ? `m${row.months_since_first}` : 'Total';
    const newCustomers = row.cohort_size || 0;
    const secondOrders = row.second_orders || 0;
    const retentionRate = newCustomers > 0 ? (secondOrders / newCustomers * 100).toFixed(1) : '0.0';
    
    console.log(`${month}      | ${monthsSince.padStart(17)} | ${newCustomers.toString().padStart(12)} | ${secondOrders.toString().padStart(10)} | ${retentionRate.padStart(13)}%`);
  });
}

// Main function will be called after fetch is imported
