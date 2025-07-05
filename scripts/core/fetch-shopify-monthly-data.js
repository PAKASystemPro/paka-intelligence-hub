require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHOPIFY_SHOP = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

// Initialize Supabase client with production schema
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'production' }
});

// Batch size for database operations
const BATCH_SIZE = 50;

/**
 * Get customer IDs from database
 */
async function getCustomerIds() {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, shopify_customer_id');
  
  if (error) {
    console.error('Error fetching customer IDs:', error);
    throw error;
  }
  
  const customerIdMap = new Map();
  for (const customer of customers) {
    customerIdMap.set(customer.shopify_customer_id, customer.id);
  }
  
  return customerIdMap;
}



/**
 * Fetch orders from Shopify for a specific year and month
 */
async function fetchMonthlyOrders(year, month) {
  console.log(`Fetching orders from Shopify API...`);
  
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  let endDate;
  
  // Calculate the last day of the month
  if (month === 12) {
    endDate = `${year}-12-31`;
  } else {
    endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    // Subtract one day to get the last day of the current month
    const date = new Date(endDate);
    date.setDate(date.getDate() - 1);
    endDate = date.toISOString().split('T')[0];
  }
  
  const query = `
    query getMonthlyOrders($cursor: String) {
      orders(
        first: 100,
        after: $cursor,
        query: "created_at:>=${startDate} AND created_at:<=${endDate}"
      ) {
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
              numberOfOrders
              amountSpent {
                amount
                currencyCode
              }
              createdAt
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
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
  
  let hasNextPage = true;
  let cursor = null;
  let allOrders = [];
  
  while (hasNextPage) {
    const response = await fetchShopifyGraphQL(query, { cursor });
    
    if (response.errors) {
      console.error('Error fetching orders:', response.errors);
      break;
    }
    
    const orders = response.data.orders.edges.map(edge => edge.node);
    allOrders = [...allOrders, ...orders];
    
    console.log(`Fetched ${orders.length} orders. Total: ${allOrders.length}`);
    
    hasNextPage = response.data.orders.pageInfo.hasNextPage;
    cursor = response.data.orders.pageInfo.endCursor;
    
    if (hasNextPage) {
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return allOrders;
}

/**
 * Helper function to fetch data from Shopify GraphQL API with retry logic
 */
async function fetchShopifyGraphQL(query, variables = {}, retries = 5, backoff = 2000) {
  let shopUrl = SHOPIFY_SHOP;
  shopUrl = shopUrl.replace(/^https?:\/\//, '');
  const graphqlUrl = `https://${shopUrl}/admin/api/2023-07/graphql.json`;
  
  console.log('Making GraphQL request to:', graphqlUrl);
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL Error:', data.errors);
        throw new Error(`GraphQL Error: ${data.errors[0].message}`);
      }
      
      return data;
    } catch (error) {
      const isNetworkError = error.message.includes('fetch failed') || 
                            error.name === 'AbortError' || 
                            error.code === 'ETIMEDOUT' || 
                            error.code === 'ECONNRESET' ||
                            error.code === 'EHOSTUNREACH';
      
      if (attempt <= retries) {
        const waitTime = isNetworkError ? 
          backoff * Math.pow(3, attempt - 1) : 
          backoff * Math.pow(2, attempt - 1);
        
        console.log(`Attempt ${attempt} failed. Retrying in ${waitTime}ms...`);
        console.log(`Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`All ${retries + 1} attempts failed. Last error:`, error);
        throw error;
      }
    }
  }
}

/**
 * Extract unique customers from orders
 */
function extractCustomers(orders) {
  const customerMap = new Map();
  
  for (const order of orders) {
    if (!order.customer) continue;
    
    const customer = order.customer;
    const customerId = customer.id.split('/').pop();
    
    if (!customerMap.has(customerId)) {
      const totalSpent = customer.amountSpent && customer.amountSpent.amount 
        ? parseFloat(customer.amountSpent.amount) 
        : 0;
      
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

/**
 * Prepare orders for insertion and return the data with generated UUIDs
 */
async function prepareOrdersForInsertion(orders, customerIdMap, retries = 3, backoff = 1000) {
  const shopifyOrderIds = orders.map(o => o.id.split('/').pop());
  const existingOrders = new Set();
  const orderUuidMap = new Map();
  const CHUNK_SIZE = 100;

  console.log('Checking for existing orders in the database...');
  for (let i = 0; i < shopifyOrderIds.length; i += CHUNK_SIZE) {
    const chunk = shopifyOrderIds.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) continue;

    let attempt = 0;
    while (attempt < retries) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('shopify_order_id, id') // Fetch UUID for existing orders
          .in('shopify_order_id', chunk);

        if (error) throw error;

        if (data) {
          data.forEach(o => {
            existingOrders.add(o.shopify_order_id);
            orderUuidMap.set(o.shopify_order_id.toString(), o.id); // Pre-populate map
          });
        }
        break;
      } catch (error) {
        attempt++;
        console.error(`Error fetching existing orders chunk (attempt ${attempt}/${retries}):`, error.message);
        if (attempt >= retries) {
          console.error('All retry attempts failed for chunk.');
        } else {
          await new Promise(res => setTimeout(res, backoff * attempt));
        }
      }
    }
  }

  console.log(`Found ${existingOrders.size} existing orders. ${orders.length - existingOrders.size} new orders to process.`);

  const preparedOrders = [];
  for (const order of orders) {
    const shopifyOrderId = order.id.split('/').pop();

    if (existingOrders.has(shopifyOrderId)) {
      continue; // Skip existing orders from being re-prepared
    }

    const customerShopifyId = order.customer ? order.customer.id.split('/').pop() : null;
    const customerId = customerShopifyId ? customerIdMap.get(customerShopifyId) : null;

    if (customerShopifyId && !customerId) {
      console.warn(`Customer ID not found for Shopify customer ${customerShopifyId}. Order ${shopifyOrderId} will have a null customer_id.`);
    }

    const orderId = uuidv4();
    orderUuidMap.set(shopifyOrderId, orderId); // Add new order UUID to map

    preparedOrders.push({
      id: orderId,
      shopify_order_id: shopifyOrderId,
      customer_id: customerId,
      order_number: order.name,
      total_price: parseFloat(order.totalPriceSet.shopMoney.amount),
      created_at: order.createdAt, // Use createdAt for consistency with Shopify
      updated_at: new Date().toISOString(),
      tags: order.tags || []
    });
  }

  return { preparedOrders, orderUuidMap };
}

/**
 * Extract line items from orders
 */
function extractLineItems(orders, orderUuidMap) {
  const lineItems = [];
  
  for (const order of orders) {
    const shopifyOrderId = order.id.split('/').pop();
    // Try to get UUID from the order object first, then from the map
    const orderUuid = order._uuid || orderUuidMap.get(shopifyOrderId);
    
    if (!orderUuid) {
      console.warn(`No UUID found for order ${shopifyOrderId}, skipping line items`);
      continue;
    }
    
    if (order.lineItems && order.lineItems.edges) {
      for (const edge of order.lineItems.edges) {
        const item = edge.node;
        
        if (item) {
          const productId = item.product?.id?.split('/').pop() || null;
          const variantId = item.variant?.id?.split('/').pop() || null;
          
          lineItems.push({
            id: uuidv4(), // Generate UUID for each line item
            order_id: orderUuid, // Use the UUID we generated for the order
            shopify_order_id: shopifyOrderId,
            product_id: productId,
            variant_id: variantId,
            title: item.title || '',
            quantity: item.quantity || 1,
            price: item.originalUnitPriceSet?.shopMoney?.amount || 0,
            sku: item.variant?.sku || '',
            product_type: item.product?.productType || '',
            vendor: item.product?.vendor || '',
            updated_at: new Date().toISOString()
            // Note: order_id will be set in the insertLineItems function
          });
        }
      }
    }
  }
  
  return lineItems;
}

/**
 * Insert customers into database in batches
 */
async function insertCustomers(customers) {
  const batches = [];
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    batches.push(customers.slice(i, i + BATCH_SIZE));
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // Use upsert to avoid duplicate customer errors
    const { error } = await supabase
      .from('customers')
      .upsert(batch, { 
        onConflict: 'email',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`Error inserting customer batch ${i + 1}/${batches.length}:`, error);
      throw error;
    }
    
    console.log(`Inserted batch ${i + 1}/${batches.length}`);
  }
}

/**
 * Insert orders into database
 */
async function insertOrders(orders) {
  if (!orders || orders.length === 0) {
    console.log('No orders to insert');
    return 0;
  }
  
  // First, check if any of these orders already exist in the database
  const shopifyOrderIds = orders.map(order => order.shopify_order_id);
  
  // Split into chunks of 100 for the IN clause to avoid query size limitations
  const shopifyOrderIdChunks = [];
  for (let i = 0; i < shopifyOrderIds.length; i += 100) {
    shopifyOrderIdChunks.push(shopifyOrderIds.slice(i, i + 100));
  }
  
  // Get existing orders
  const existingOrders = new Map();
  for (const chunk of shopifyOrderIdChunks) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, shopify_order_id')
      .in('shopify_order_id', chunk);
    
    if (error) {
      console.error('Error fetching existing orders:', error);
    } else if (data) {
      for (const order of data) {
        existingOrders.set(order.shopify_order_id, order.id);
      }
    }
  }
  
  console.log(`Found ${existingOrders.size} existing orders in database`);
  
  // Check for foreign key constraints - get line items that reference existing orders
  if (existingOrders.size > 0) {
    const existingOrderIds = [...existingOrders.values()];
    const orderIdChunks = [];
    for (let i = 0; i < existingOrderIds.length; i += 100) {
      orderIdChunks.push(existingOrderIds.slice(i, i + 100));
    }
    
    // Check which orders have line items
    const orderLineItemCounts = new Map();
    for (const chunk of orderIdChunks) {
      for (const orderId of chunk) {
        // Check if this order has any line items
        const { data, error, count } = await supabase
          .from('order_line_items')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', orderId);
        
        if (error) {
          console.error(`Error checking line items for order ${orderId}:`, error);
        } else if (count && count > 0) {
          orderLineItemCounts.set(orderId, count);
        }
      }
    }
    
    if (orderLineItemCounts.size > 0) {
      console.log(`Found ${orderLineItemCounts.size} orders with existing line items`);
    }
    
    // Filter orders to avoid foreign key constraint violations
    const ordersToInsert = orders.filter(order => {
      const existingOrderId = existingOrders.get(order.shopify_order_id);
      if (!existingOrderId) {
        return true; // New order, always insert
      }
      
      // If the order exists and has line items, skip it to avoid FK constraint violation
      if (orderLineItemCounts.has(existingOrderId)) {
        console.log(`Skipping order ${order.shopify_order_id} due to existing line items`);
        return false;
      }
      
      return true; // Existing order but no line items, safe to update
    });
    
    console.log(`Filtered to ${ordersToInsert.length} orders safe to insert/update`);
    orders = ordersToInsert;
  }
  
  if (orders.length === 0) {
    console.log('No orders to insert after filtering');
    return 0;
  }
  
  // Insert orders in batches
  const batches = [];
  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    batches.push(orders.slice(i, i + BATCH_SIZE));
  }
  
  let insertedCount = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    let retries = 0;
    const maxRetries = 3;
    let success = false;
    
    while (retries < maxRetries && !success) {
      try {
        const { error } = await supabase
          .from('orders')
          .upsert(batch, {
            onConflict: 'shopify_order_id',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`Error inserting order batch ${i + 1}/${batches.length}:`, error);
          
          if (error.code === '23503' && error.message.includes('foreign key constraint')) {
            // Foreign key constraint violation - skip this batch
            console.warn(`Skipping batch ${i + 1} due to foreign key constraint`);
            break;
          }
          
          retries++;
          if (retries >= maxRetries) {
            console.error(`Failed to insert batch ${i + 1} after ${maxRetries} attempts`);
            continue; // Skip to next batch instead of throwing
          }
          
          console.log(`Retrying batch ${i + 1} (${retries}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
        } else {
          console.log(`Inserted order batch ${i + 1}/${batches.length}`);
          insertedCount += batch.length;
          success = true;
        }
      } catch (err) {
        console.error(`Exception inserting batch ${i + 1}:`, err);
        retries++;
        if (retries >= maxRetries) {
          console.error(`Failed to insert batch ${i + 1} after ${maxRetries} attempts due to exception`);
          continue; // Skip to next batch instead of throwing
        }
        console.log(`Retrying batch ${i + 1} after exception (${retries}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * retries));
      }
    }
  }
  
  console.log(`Inserted ${insertedCount} orders`);
  return insertedCount;
}

/**
 * Insert line items into database
 */
async function insertLineItems(lineItems) {
  if (!lineItems || lineItems.length === 0) {
    console.log('No line items to insert');
    return 0;
  }

  console.log(`Attempting to insert ${lineItems.length} line items`);

  // The `lineItems` array is already prepared with the correct `order_id` (UUID)
  // by the `extractLineItems` function. We just need to insert it in batches.

  const batches = [];
  const BATCH_SIZE = 100;
  for (let i = 0; i < lineItems.length; i += BATCH_SIZE) {
    batches.push(lineItems.slice(i, i + BATCH_SIZE));
  }

  let successfulInserts = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    let batchRetries = 0;
    const maxBatchRetries = 3;
    let success = false;

    while (batchRetries < maxBatchRetries && !success) {
      try {
        const { error } = await supabase
          .from('order_line_items')
          .upsert(batch, {
            onConflict: 'id', // Assumes Shopify's line item ID is the primary key
            ignoreDuplicates: false,
          });

        if (error) {
          console.error(`Error inserting line item batch ${i + 1}/${batches.length}:`, error);
          batchRetries++;
          if (batchRetries >= maxBatchRetries) throw error;
          console.log(`Retrying batch ${i + 1} (${batchRetries}/${maxBatchRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * batchRetries));
        } else {
          console.log(`Inserted line item batch ${i + 1}/${batches.length} (${batch.length} items)`);
          successfulInserts += batch.length;
          success = true;
        }
      } catch (err) {
        console.error(`Exception inserting batch ${i + 1}:`, err);
        batchRetries++;
        if (batchRetries >= maxBatchRetries) throw err;
        console.log(`Retrying batch ${i + 1} after exception (${batchRetries}/${maxBatchRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * batchRetries));
      }
    }
  }

  console.log(`Successfully inserted ${successfulInserts} line items`);
  return successfulInserts;
}

/**
 * Call the classify_new_customers RPC function
 */
async function classifyCustomers() {
  console.log('Calling classify_new_customers() RPC function...');
  
  // Functions are in the public schema, not production schema
  // Create a new Supabase client with public schema
  const publicSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: { schema: 'public' }
  });
  
  const { error } = await publicSupabase.rpc('classify_new_customers');
  
  if (error) {
    console.error('Error classifying customers:', error);
    throw error;
  }
  
  console.log('Customer classification completed successfully');
}

/**
 * Call the refresh_materialized_views RPC function
 */
async function refreshMaterializedViews() {
  console.log('Calling refresh_materialized_views() RPC function...');
  
  // Functions are in the public schema, not production schema
  // Create a new Supabase client with public schema
  const publicSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: { schema: 'public' }
  });
  
  const { error } = await publicSupabase.rpc('refresh_materialized_views');
  
  if (error) {
    console.error('Error refreshing materialized views:', error);
    throw error;
  }
  
  console.log('Materialized views refreshed successfully');
}

/**
 * Process all months from January 2025 to June 2025
 */
async function processAllMonths() {
  const results = {};
  
  try {
    // Start with June 2025 as requested to confirm fixes.
    const year = 2025;
    const month = 6;
    results[`${year}-${month.toString().padStart(2, '0')}`] = await processSingleMonth(year, month);
    
    console.log('\n===== SUMMARY =====');
    console.log('Month | Orders | Customers | Line Items');
    console.log('------|--------|-----------|------------');
    
    let totalOrders = 0;
    let totalCustomers = 0;
    let totalLineItems = 0;
    
    for (const [month, data] of Object.entries(results)) {
      console.log(`${month} | ${data.orders.toString().padStart(6)} | ${data.customers.toString().padStart(9)} | ${data.lineItems.toString().padStart(10)}`);
      totalOrders += data.orders;
      totalCustomers += data.customers;
      totalLineItems += data.lineItems;
    }
    
    console.log('------|--------|-----------|------------');
    console.log(`Total | ${totalOrders.toString().padStart(6)} | ${totalCustomers.toString().padStart(9)} | ${totalLineItems.toString().padStart(10)}`);
    
    console.log('\nAll data processing complete!');
  } catch (error) {
    console.error('Error processing all months:', error);
  }
}

/**
 * Reference data for validation
 */
const REFERENCE_DATA = {
  '2021-11': { orders: 20, customers: 20 },
  '2021-12': { orders: 41, customers: 38 },
  '2022-01': { orders: 76, customers: 73 },
  '2022-02': { orders: 51, customers: 43 },
  '2022-03': { orders: 27, customers: 25 },
  '2022-04': { orders: 46, customers: 40 },
  '2022-05': { orders: 145, customers: 121 },
  '2022-06': { orders: 172, customers: 151 },
  '2022-07': { orders: 103, customers: 95 },
  '2022-08': { orders: 225, customers: 195 },
  '2022-09': { orders: 117, customers: 100 },
  '2022-10': { orders: 58, customers: 47 },
  '2022-11': { orders: 199, customers: 182 },
  '2022-12': { orders: 339, customers: 283 },
  '2023-01': { orders: 509, customers: 427 },
  '2023-02': { orders: 375, customers: 334 },
  '2023-03': { orders: 636, customers: 556 },
  '2023-04': { orders: 1066, customers: 892 },
  '2023-05': { orders: 1007, customers: 825 },
  '2023-06': { orders: 1312, customers: 1173 },
  '2023-07': { orders: 1649, customers: 1520 },
  '2023-08': { orders: 1568, customers: 1403 },
  '2023-09': { orders: 1004, customers: 884 },
  '2023-10': { orders: 815, customers: 748 },
  '2023-11': { orders: 845, customers: 765 },
  '2023-12': { orders: 749, customers: 684 },
  '2024-01': { orders: 784, customers: 689 },
  '2024-02': { orders: 670, customers: 595 },
  '2024-03': { orders: 874, customers: 786 },
  '2024-04': { orders: 847, customers: 755 },
  '2024-05': { orders: 535, customers: 432 },
  '2024-06': { orders: 605, customers: 514 },
  '2024-07': { orders: 677, customers: 558 },
  '2024-08': { orders: 854, customers: 709 },
  '2024-09': { orders: 922, customers: 794 },
  '2024-10': { orders: 758, customers: 630 },
  '2024-11': { orders: 872, customers: 733 },
  '2024-12': { orders: 564, customers: 495 },
  '2025-01': { orders: 575, customers: 510 },
  '2025-02': { orders: 590, customers: 542 },
  '2025-03': { orders: 766, customers: 664 },
  '2025-04': { orders: 863, customers: 783 },
  '2025-05': { orders: 969, customers: 853 },
  '2025-06': { orders: 1107, customers: 952 }
};

/**
 * Validate the synced data against reference data
 */
function validateSyncResults(year, month, result) {
  const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
  const reference = REFERENCE_DATA[monthKey];
  
  if (!reference) {
    console.log(`No reference data available for ${monthKey}`);
    return;
  }
  
  const ordersMatch = result.orders === reference.orders;
  const customersMatch = result.customers === reference.customers;
  
  console.log('\n===== VALIDATION =====');
  console.log(`Orders: ${result.orders || 0} / ${reference.orders} (${ordersMatch ? 'MATCH' : 'MISMATCH'})`);
  console.log(`Customers: ${result.customers || 0} / ${reference.customers} (${customersMatch ? 'MATCH' : 'MISMATCH'})`);
  
  if (!ordersMatch || !customersMatch) {
    console.warn('WARNING: Synced data does not match reference data!');
  } else {
    console.log('SUCCESS: Synced data matches reference data!');
  }
}

/**
 * Process a single month
 */
async function processSingleMonth(year, month) {
  console.log(`\n===== Processing ${year}-${month.toString().padStart(2, '0')} =====`);
  
  let orders = [];
  let customers = [];
  let customerIdMap = new Map();
  let preparedOrders = [];
  let lineItems = [];
  let insertedOrderCount = 0;
  let insertedLineItemCount = 0;
  let result = { orders: 0, customers: 0, lineItems: 0 };
  
  try {
    // Step 1: Fetch orders from Shopify
    console.log('\nStep 1: Fetching orders from Shopify...');
    try {
      orders = await fetchMonthlyOrders(year, month);
      console.log(`Fetched ${orders.length} orders from Shopify`);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    
    // Step 2: Extract customers from Shopify orders
    console.log('\nStep 2: Extracting customers...');
    try {
      customers = extractCustomers(orders);
      console.log(`Extracted ${customers.length} unique customers`);
    } catch (error) {
      console.error('Failed to extract customers:', error);
      // If extraction fails, we cannot proceed with customer-related operations
      customers = [];
    }

    // Step 3: Insert new customers into the database
    console.log('\nStep 3: Inserting new customers...');
    try {
      if (customers.length > 0) {
        await insertCustomers(customers);
      }
    } catch (error) {
      console.error('Failed to insert customers:', error);
      // We can still proceed, but orders for new customers won't be associated
    }

    // Step 4: Fetch the complete customer ID map (including newly inserted customers)
    console.log('\nStep 4: Fetching complete customer ID map...');
    try {
      customerIdMap = await getCustomerIds();
      console.log(`Retrieved ${customerIdMap.size} customer IDs from database`);
    } catch (error) {
      console.error('Failed to fetch customer ID map:', error);
      // Continue with an empty map, though this will affect order association
      customerIdMap = new Map();
    }
    
    // Step 5: Prepare and insert orders
    console.log('\nStep 5: Preparing orders for insertion...');
    let orderUuidMap = new Map();
    try {
      const preparationResult = await prepareOrdersForInsertion(orders, customerIdMap);
      preparedOrders = preparationResult.preparedOrders;
      orderUuidMap = preparationResult.orderUuidMap;

      console.log(`Prepared ${preparedOrders.length} new orders for insertion.`);
      
      if (preparedOrders.length > 0) {
        insertedOrderCount = await insertOrders(preparedOrders);
      } else {
        console.log('No new orders to insert.');
        insertedOrderCount = 0;
      }
      
      // Step 6: Extract and insert line items
      console.log('\nStep 6: Extracting line items...');
      lineItems = extractLineItems(orders, orderUuidMap);
      console.log(`Extracted ${lineItems.length} line items`);
      
      if (lineItems.length > 0) {
        insertedLineItemCount = await insertLineItems(lineItems);
      } else {
        console.log('No new line items to insert.');
        insertedLineItemCount = 0;
      }
    } catch (error) {
      console.error('Failed to process orders or line items:', error);
    }
    
    // Step 7: Classify customers
    console.log(`\nStep 7: Classifying customers...`);
    try {
      await classifyCustomers();
    } catch (error) {
      console.error('Failed to classify customers:', error);
      // Continue if classification fails
    }
    
    // Step 8: Refresh materialized views
    console.log(`\nStep 8: Refreshing materialized views...`);
    try {
      await refreshMaterializedViews();
    } catch (error) {
      console.error('Failed to refresh materialized views:', error);
      // Continue if view refresh fails
    }
    
    console.log(`\n${year}-${month.toString().padStart(2, '0')} data processing complete!`);
    
    result = {
      orders: insertedOrderCount,
      customers: customers.length,
      lineItems: insertedLineItemCount
    };
    
    console.log('\n===== SUMMARY =====');
    console.log(`${year}-${month.toString().padStart(2, '0')} | Orders: ${result.orders || 0} | Customers: ${result.customers || 0} | Line Items: ${result.lineItems || 0}`);
    
    // Validate against reference data
    try {
      validateSyncResults(year, month, result);
    } catch (error) {
      console.error('Validation failed:', error);
      // Don't throw here, as we've already completed the sync
    }
    
    return result;
  } catch (error) {
    console.error(`Error processing ${year}-${month.toString().padStart(2, '0')} data:`, error);
    // Return partial results instead of throwing
    return result;
  }
}

// Main function to run the script
async function cleanupMonth(year, month) {
  console.log(`Cleaning up data for ${year}-${month.toString().padStart(2, '0')}...`);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;

  // Note: We don't delete customers, as they are not month-specific.
  // We only delete orders and their line items for the specified month.

  // 1. Get order IDs for the month
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  if (ordersError) {
    console.error('Error fetching orders for cleanup:', ordersError);
    return;
  }

  if (orders.length === 0) {
    console.log('No orders found for this month. Cleanup not needed.');
    return;
  }

  const orderIds = orders.map(o => o.id);

  // 2. Delete line items for those orders
  console.log(`Deleting ${orderIds.length} orders and their line items...`);
  const { error: lineItemsError } = await supabase
    .from('order_line_items')
    .delete()
    .in('order_id', orderIds);

  if (lineItemsError) {
    console.error('Error deleting line items:', lineItemsError);
    // We still proceed to delete orders, as some line items might have been deleted
  }

  // 3. Delete orders for the month
  const { error: deleteOrdersError } = await supabase
    .from('orders')
    .delete()
    .in('id', orderIds);

  if (deleteOrdersError) {
    console.error('Error deleting orders:', deleteOrdersError);
  } else {
    console.log('Cleanup successful.');
  }
}

// Main function to run the script
async function main() {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    const cleanup = args.includes('--cleanup');
    const filteredArgs = args.filter(arg => arg !== '--cleanup');

    if (filteredArgs.length === 0) {
      console.log('Processing all months from January 2025 to June 2025...');
      await processAllMonths();
    } else if (filteredArgs.length === 2) {
      const year = parseInt(filteredArgs[0]);
      const month = parseInt(filteredArgs[1]);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        console.error('Invalid year or month. Usage: node fetch-shopify-monthly-data.js [--cleanup] [year] [month]');
        process.exit(1);
      }

      if (cleanup) {
        await cleanupMonth(year, month);
      }

      console.log(`Processing data for ${year}-${month.toString().padStart(2, '0')}...`);
      await processSingleMonth(year, month);
        } else {
      console.error('Invalid arguments. Usage: node fetch-shopify-monthly-data.js [--cleanup] [year] [month]');
      console.error('If no arguments are provided, all months from January 2025 to June 2025 will be processed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Export functions for use in other scripts
module.exports = {
  processSingleMonth,
  validateSyncResults,
  fetchMonthlyOrders,
  extractCustomers,
  insertCustomers,
  getCustomerIds,
  prepareOrdersForInsertion,
  insertOrders,
  extractLineItems,
  insertLineItems,
  classifyCustomers,
  refreshMaterializedViews
};

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}
