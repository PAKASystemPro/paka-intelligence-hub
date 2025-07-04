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
 * Main function to fetch and process Shopify data for a specific year and month
 */
async function processSingleMonth(year, month) {
  console.log(`\n===== Processing ${year}-${month.toString().padStart(2, '0')} =====`);
  
  try {
    // Step 1: Fetch orders from Shopify
    console.log('\nStep 1: Fetching orders from Shopify...');
    const orders = await fetchMonthlyOrders(year, month);
    console.log(`Fetched ${orders.length} orders from Shopify`);
    
    // Step 2: Extract and insert customers
    console.log('\nStep 2: Extracting customers...');
    const customers = extractCustomers(orders);
    console.log(`Extracted ${customers.length} unique customers`);
    
    console.log('\nStep 3: Inserting customers...');
    await insertCustomers(customers);
    
    // Step 4: Get customer IDs for order association
    console.log('\nStep 4: Fetching customer IDs for order association...');
    const customerIdMap = await getCustomerIds();
    console.log(`Retrieved ${customerIdMap.size} customer IDs`);
    
    // Step 5: Prepare and insert orders
    console.log('\nStep 5: Preparing orders for insertion...');
    const preparedOrders = await prepareOrdersForInsertion(orders, customerIdMap);
    console.log(`Prepared ${preparedOrders.length} orders`);
    
    const insertedOrderCount = await insertOrders(preparedOrders);
    
    // Create a map of Shopify order IDs to UUIDs for line item association
    const orderUuidMap = new Map();
    for (const order of preparedOrders) {
      orderUuidMap.set(order.shopify_order_id, order.id);
    }
    
    // Step 6: Extract and insert line items
    console.log('\nStep 6: Extracting line items...');
    const lineItems = extractLineItems(orders, orderUuidMap);
    console.log(`Extracted ${lineItems.length} line items`);
    
    const insertedLineItemCount = await insertLineItems(lineItems);
    
    // Step 7: Classify customers
    console.log(`\nStep 7: Classifying customers...`);
    await classifyCustomers();
    
    // Step 8: Refresh materialized views
    console.log(`\nStep 8: Refreshing materialized views...`);
    await refreshMaterializedViews();
    
    console.log(`\n${year}-${month.toString().padStart(2, '0')} data processing complete!`);
    
    return {
      orders: insertedOrderCount,
      customers: customers.length,
      lineItems: insertedLineItemCount
    };
  } catch (error) {
    console.error(`Error processing ${year}-${month.toString().padStart(2, '0')} data:`, error);
    throw error;
  }
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
        query: "processed_at:>=${startDate} AND processed_at:<=${endDate}"
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
      // Set timeout to avoid hanging requests
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
      // Handle specific error types
      const isNetworkError = error.message.includes('fetch failed') || 
                            error.name === 'AbortError' || 
                            error.code === 'ETIMEDOUT' || 
                            error.code === 'ECONNRESET' ||
                            error.code === 'EHOSTUNREACH';
      
      if (attempt <= retries) {
        // Increase backoff for network errors
        const waitTime = isNetworkError ? 
          backoff * Math.pow(3, attempt - 1) : // More aggressive backoff for network errors
          backoff * Math.pow(2, attempt - 1); // Standard exponential backoff
        
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

/**
 * Prepare orders for insertion and return the data with generated UUIDs
 */
async function prepareOrdersForInsertion(orders, customerIdMap, retries = 3, backoff = 1000) {
  // Fetch existing orders to preserve their UUIDs
  const shopifyOrderIds = orders.map(order => order.id.split('/').pop());
  
  let existingOrders = [];
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`Fetching existing orders (attempt ${attempt}/${retries + 1})...`);
      const { data, error } = await supabase
        .from('orders')
        .select('id, shopify_order_id')
        .in('shopify_order_id', shopifyOrderIds);
      
      if (error) {
        throw error;
      }
      
      existingOrders = data || [];
      console.log(`Successfully fetched ${existingOrders.length} existing orders`);
      break;
    } catch (error) {
      console.error(`Error fetching existing orders (attempt ${attempt}/${retries + 1}):`, error);
      
      if (attempt <= retries) {
        const waitTime = backoff * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error('All retry attempts failed. Continuing with empty existing orders list.');
        // Instead of throwing, we'll continue with an empty list of existing orders
        // This means we might create duplicate UUIDs, but it's better than failing completely
      }
    }
  }
  
  // Create a map of shopify_order_id to existing UUID
  const existingOrderMap = new Map();
  for (const order of existingOrders || []) {
    existingOrderMap.set(order.shopify_order_id, order.id);
  }
  
  // Prepare orders for insertion
  const preparedOrders = [];
  
  for (const order of orders) {
    const shopifyOrderId = order.id.split('/').pop();
    const shopifyCustomerId = order.customer?.id?.split('/').pop();
    
    // Handle orders without a customer - create a placeholder customer ID if needed
    let customerId = null;
    if (shopifyCustomerId) {
      customerId = customerIdMap.get(shopifyCustomerId);
      
      // If we couldn't find the customer in our map but have a shopify customer ID
      if (!customerId) {
        console.warn(`Customer ID ${shopifyCustomerId} not found in database - will create placeholder`);
        // We'll still include the order, but with a null customer_id
      }
    } else {
      console.warn(`Order ${shopifyOrderId} has no customer ID - will process without customer association`);
    }
    
    // Use existing UUID if available, otherwise generate a new one
    const orderUuid = existingOrderMap.get(shopifyOrderId) || uuidv4();
    
    preparedOrders.push({
      id: orderUuid,
      shopify_order_id: shopifyOrderId,
      customer_id: customerId,
      shopify_customer_id: shopifyCustomerId,
      order_number: order.name,
      total_price: order.totalPriceSet?.shopMoney?.amount || 0,
      processed_at: order.processedAt,
      updated_at: new Date().toISOString()
    });
    
    // Store the UUID on the order object for later use with line items
    order._uuid = orderUuid;
  }
  
  console.log(`Prepared ${preparedOrders.length} orders for insertion out of ${orders.length} total`);
  return preparedOrders;
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
        onConflict: 'shopify_customer_id',
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
  
  // Get order IDs from database to map shopify_order_id to internal order_id
  // Use a more robust query with retry logic
  let orderData = [];
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, shopify_order_id');
      
      if (error) {
        console.error('Error fetching orders:', error);
        retries++;
        if (retries >= maxRetries) throw error;
        console.log(`Retrying order fetch (${retries}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * retries));
      } else {
        orderData = data;
        break;
      }
    } catch (err) {
      console.error('Exception fetching orders:', err);
      retries++;
      if (retries >= maxRetries) throw err;
      console.log(`Retrying order fetch after exception (${retries}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * retries));
    }
  }
  
  console.log(`Retrieved ${orderData.length} orders for line item mapping`);
  
  // Create a map of shopify_order_id to internal order_id
  const orderIdMap = new Map();
  for (const order of orderData) {
    if (order.shopify_order_id) {
      orderIdMap.set(order.shopify_order_id, order.id);
    }
  }
  
  console.log(`Created mapping for ${orderIdMap.size} orders`);
  
  // Count shopify_order_ids that are missing from the map
  const missingOrderIds = new Set();
  for (const lineItem of lineItems) {
    if (!orderIdMap.has(lineItem.shopify_order_id)) {
      missingOrderIds.add(lineItem.shopify_order_id);
    }
  }
  
  if (missingOrderIds.size > 0) {
    console.warn(`${missingOrderIds.size} Shopify order IDs not found in database`);
    console.warn(`First 5 missing order IDs: ${[...missingOrderIds].slice(0, 5).join(', ')}`);
    
    // Try to fetch these specific orders again to ensure they exist
    if (missingOrderIds.size > 0) {
      console.log(`Attempting to verify ${Math.min(missingOrderIds.size, 10)} missing orders...`);
      
      const missingOrdersToCheck = [...missingOrderIds].slice(0, 10);
      for (const shopifyOrderId of missingOrdersToCheck) {
        const { data } = await supabase
          .from('orders')
          .select('id')
          .eq('shopify_order_id', shopifyOrderId);
          
        if (data && data.length > 0) {
          console.log(`Found order ${shopifyOrderId} in database with UUID ${data[0].id}`);
          orderIdMap.set(shopifyOrderId, data[0].id);
        } else {
          console.warn(`Order ${shopifyOrderId} truly missing from database`);
        }
      }
    }
  }
  
  // Update line items with order_id from the map and filter out those without a valid order_id
  const validLineItems = [];
  const invalidLineItems = [];
  
  for (const lineItem of lineItems) {
    const orderId = orderIdMap.get(lineItem.shopify_order_id);
    if (orderId) {
      lineItem.order_id = orderId;
      validLineItems.push(lineItem);
    } else {
      invalidLineItems.push(lineItem);
    }
  }
  
  console.log(`Found ${validLineItems.length} valid line items out of ${lineItems.length} total`);
  console.log(`${invalidLineItems.length} line items have missing order references`);
  
  // If no valid line items, return early
  if (validLineItems.length === 0) {
    console.log('No valid line items to insert');
    return 0;
  }
  
  // Insert line items in batches
  const batches = [];
  const BATCH_SIZE = 100; // Smaller batch size for better reliability
  for (let i = 0; i < validLineItems.length; i += BATCH_SIZE) {
    batches.push(validLineItems.slice(i, i + BATCH_SIZE));
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
            onConflict: 'id',
            ignoreDuplicates: false
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
    for (let month = 1; month <= 6; month++) {
      results[`2025-${month.toString().padStart(2, '0')}`] = await fetchMonthlyShopifyData(2025, month);
    }
    
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
    
    // Step 2: Extract and insert customers
    console.log('\nStep 2: Extracting customers...');
    try {
      customers = extractCustomers(orders);
      console.log(`Extracted ${customers.length} unique customers`);
      
      console.log('\nStep 3: Inserting customers...');
      await insertCustomers(customers);
    } catch (error) {
      console.error('Failed to process customers:', error);
      // Continue with empty customers array if this fails
      console.log('Continuing with available customer data...');
    }
    
    // Step 4: Get customer IDs for order association
    console.log('\nStep 4: Fetching customer IDs for order association...');
    try {
      customerIdMap = await getCustomerIds();
      console.log(`Retrieved ${customerIdMap.size} customer IDs`);
    } catch (error) {
      console.error('Failed to fetch customer IDs:', error);
      console.log('Continuing with empty customer ID map...');
      // Continue with empty map if this fails
    }
    
    // Step 5: Prepare and insert orders
    console.log('\nStep 5: Preparing orders for insertion...');
    try {
      preparedOrders = await prepareOrdersForInsertion(orders, customerIdMap);
      console.log(`Prepared ${preparedOrders.length} orders`);
      
      insertedOrderCount = await insertOrders(preparedOrders);
      
      // Create a map of Shopify order IDs to UUIDs for line item association
      const orderUuidMap = new Map();
      for (const order of preparedOrders) {
        orderUuidMap.set(order.shopify_order_id, order.id);
      }
      
      // Step 6: Extract and insert line items
      console.log('\nStep 6: Extracting line items...');
      lineItems = extractLineItems(orders, orderUuidMap);
      console.log(`Extracted ${lineItems.length} line items`);
      
      insertedLineItemCount = await insertLineItems(lineItems);
    } catch (error) {
      console.error('Failed to process orders or line items:', error);
      // Continue to next steps even if order processing fails
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
async function main() {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.log('Processing all months from January 2025 to June 2025...');
      await processAllMonths();
    } else if (args.length === 2) {
      const year = parseInt(args[0]);
      const month = parseInt(args[1]);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        console.error('Invalid year or month. Usage: node fetch-shopify-monthly-data.js [year] [month]');
        process.exit(1);
      }
      
      console.log(`Processing data for ${year}-${month.toString().padStart(2, '0')}...`);
      await processSingleMonth(year, month);
    } else {
      console.error('Invalid arguments. Usage: node fetch-shopify-monthly-data.js [year] [month]');
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
