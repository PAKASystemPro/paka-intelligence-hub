/**
 * Order processing functions for Shopify data sync
 */
const { v4: uuidv4 } = require('uuid');
const { initSupabaseClient, executeWithRetry, createBatches, DatabaseError, ApiError } = require('./shopify-sync-utils');
const { BATCH_SIZE } = require('./shopify-sync-config');

/**
 * Process order tags from Shopify API
 * @param {string|string[]|null} tags - Tags from Shopify API (can be string, array, or null)
 * @returns {string[]} - Normalized array of tags
 */
function processOrderTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  return [];
}

/**
 * Process sales channel information from Shopify API
 * @param {Object|null} channel - Channel information from Shopify API
 * @returns {string|null} - Channel display name
 */
function processSalesChannel(channel) {
  if (!channel) return null;
  if (channel.name) return channel.name;
  if (channel.app && channel.app.title) return channel.app.title;
  return null;
}

/**
 * Extract the numeric ID from a Shopify GID (Global ID)
 * @param {string} gid - Shopify Global ID (e.g., 'gid://shopify/Order/1234567890')
 * @returns {string|null} - Extracted numeric ID or null if invalid
 */
function extractIdFromGid(gid) {
  if (!gid || typeof gid !== 'string') {
    return null;
  }
  
  // Use regex to extract the numeric part after the last slash
  const match = gid.match(/\/([0-9]+)$/);
  return match ? match[1] : null;
}

/**
 * Prepare orders for insertion into the database
 */
async function prepareOrdersForInsertion(orders, customerIdMap) {
  console.log(`Preparing ${orders.length} orders for insertion...`);
  console.log(`Customer ID map type: ${customerIdMap instanceof Map ? 'Map' : typeof customerIdMap}`);
  console.log(`Customer ID map size: ${customerIdMap instanceof Map ? customerIdMap.size : Object.keys(customerIdMap).length}`);
  
  if (!Array.isArray(orders)) {
    throw new Error('Invalid orders data format');
  }
  
  if (!customerIdMap) {
    console.warn('Customer ID map is missing, some orders may not be linked to customers');
    customerIdMap = {};
  }
  
  let skippedOrders = 0;
  const preparedOrders = orders.map(order => {
    // Extract Shopify order ID
    const shopifyOrderId = extractIdFromGid(order.id);
    if (!shopifyOrderId) {
      console.warn(`Invalid order ID format: ${order.id}`);
      skippedOrders++;
      return null;
    }
    
    // Extract order date from createdAt or processedAt
    const orderDate = order.createdAt || order.processedAt;
    if (!orderDate) {
      console.warn(`Order ${shopifyOrderId} missing date information`);
      skippedOrders++;
      return null;
    }
    
    // Find the customer ID if available
    let customerId = null;
    let shopifyCustomerId = null;
    if (order.customer && order.customer.id) {
      shopifyCustomerId = extractIdFromGid(order.customer.id);
      if (shopifyCustomerId) {
        // Handle both Map objects and plain objects for backward compatibility
        if (customerIdMap instanceof Map) {
          customerId = customerIdMap.get(shopifyCustomerId);
        } else if (typeof customerIdMap === 'object' && customerIdMap !== null) {
          customerId = customerIdMap[shopifyCustomerId];
        }
        
        if (!customerId) {
          console.warn(`Customer ID not found for Shopify customer ${shopifyCustomerId} in order ${shopifyOrderId}`);
        }
      }
    }
    
    // Ensure shopify_customer_id is never null (required by database constraint)
    if (!shopifyCustomerId) {
      shopifyCustomerId = `unknown-${shopifyOrderId}`;
      console.warn(`No customer found for order ${shopifyOrderId}, using placeholder ID: ${shopifyCustomerId}`);
    }
    
    // Extract order number
    const orderNumber = order.name || `#${shopifyOrderId}`;
    
    // Extract total price
    let totalPrice = 0;
    if (order.totalPriceSet && order.totalPriceSet.shopMoney) {
      totalPrice = parseFloat(order.totalPriceSet.shopMoney.amount) || 0;
    }
    
    // Process order tags
    const tags = processOrderTags(order.tags);
    
    // Process sales channel information
    const salesChannel = processSalesChannel(order.channel);
    
    return {
      id: uuidv4(),
      shopify_order_id: shopifyOrderId,
      customer_id: customerId,
      shopify_customer_id: shopifyCustomerId,
      order_number: orderNumber,
      total_price: totalPrice,
      financial_status: order.displayFinancialStatus || null,
      fulfillment_status: order.displayFulfillmentStatus || null,
      processed_at: order.processedAt || orderDate,
      created_at: orderDate,
      tags,
      sales_channel: salesChannel
    };
  }).filter(Boolean); // Remove null entries
  
  console.log(`Prepared ${preparedOrders.length} orders for insertion (skipped ${skippedOrders} invalid orders)`);
  
  // Log a sample of the prepared orders
  if (preparedOrders.length > 0) {
    console.log('Sample prepared order:', JSON.stringify(preparedOrders[0], null, 2));
  }
  
  return preparedOrders;
}

/**
 * Insert orders into database with idempotency
 * @param {Array} orders - Array of orders to insert
 * @param {Object} options - Options for insertion
 * @param {boolean} options.forceSync - Whether to force sync even if orders already exist
 */
async function insertOrders(orders, options = {}) {
  const { forceSync = false } = options;
  console.log(`Preparing to insert ${orders.length} orders...`);
  const supabase = initSupabaseClient();
  if (!orders || orders.length === 0) {
    console.log('No orders to insert');
    return { count: 0, orderIdMap: {} };
  }
  
  try {
    // Get existing order IDs to avoid duplicates
    const { data: existingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('shopify_order_id');
    
    if (fetchError) {
      console.error('Error fetching existing orders:', fetchError);
      throw new DatabaseError('Failed to fetch existing orders', fetchError);
    }
    
    if (!existingOrders || !Array.isArray(existingOrders)) {
      console.error('Invalid response when fetching existing orders');
      throw new DatabaseError('Invalid response format from orders table');
    }
    
    const existingOrderIds = new Set(existingOrders.map(order => order.shopify_order_id).filter(Boolean));
    
    // If forceSync is true, don't filter out existing orders
    let ordersToInsert;
    if (forceSync) {
      // When forcing sync, we'll delete existing orders first
      if (existingOrderIds.size > 0) {
        console.log(`Force sync enabled - deleting ${existingOrderIds.size} existing orders...`);
        const shopifyOrderIds = Array.from(existingOrderIds);
        
        // Delete in batches to avoid timeout
        const deleteBatches = createBatches(shopifyOrderIds, 100);
        
        for (const [index, batch] of deleteBatches.entries()) {
          console.log(`Deleting batch ${index + 1}/${deleteBatches.length}...`);
          try {
            const { error } = await supabase
              .from('orders')
              .delete()
              .in('shopify_order_id', batch);
            
            if (error) {
              console.error(`Error deleting existing orders batch ${index + 1}:`, error);
            }
          } catch (error) {
            console.error(`Error deleting existing orders batch ${index + 1}:`, error);
          }
        }
      }
      
      // Use all orders for insertion
      ordersToInsert = orders;
      console.log(`Force sync enabled - inserting all ${orders.length} orders`);
    } else {
      // Filter out orders that already exist in the database
      ordersToInsert = orders.filter(order => !existingOrderIds.has(order.shopify_order_id));
      console.log(`Found ${ordersToInsert.length} new orders to insert (${orders.length - ordersToInsert.length} already exist)`);
    }
    
    if (ordersToInsert.length === 0) {
      console.log('No orders to insert');
      return { count: 0, orderIdMap: {} };
    }
    
    // Create batches for insertion
    const batches = createBatches(ordersToInsert, BATCH_SIZE);
    console.log(`Created ${batches.length} batches for order insertion`);
    
    let insertedCount = 0;
    let errorCount = 0;
    const orderIdMap = {};
    
    // Insert batches with retry logic
    for (const [index, batch] of batches.entries()) {
      console.log(`Inserting batch ${index + 1}/${batches.length} (${batch.length} orders)...`);
      
      try {
        // Log the first order in the batch for debugging
        if (batch.length > 0) {
          console.log(`Sample order from batch ${index + 1}:`, JSON.stringify(batch[0], null, 2));
        }
        
        const result = await executeWithRetry(async () => {
          console.log(`Attempting to insert batch ${index + 1} with ${batch.length} orders...`);
          const { data, error } = await supabase
            .from('orders')
            .insert(batch)
            .select('id, shopify_order_id, customer_id');
          
          if (error) {
            console.error(`Detailed error for batch ${index + 1}:`, JSON.stringify(error, null, 2));
            throw new DatabaseError(`Failed to insert order batch ${index + 1}`, error);
          }
          
          if (!data) {
            console.error(`No data returned for batch ${index + 1}`);
            throw new DatabaseError(`No data returned when inserting order batch ${index + 1}`);
          }
          
          if (!Array.isArray(data)) {
            console.error(`Invalid data format for batch ${index + 1}:`, typeof data);
            throw new DatabaseError(`Invalid response format when inserting order batch ${index + 1}`);
          }
          
          console.log(`Successfully inserted batch ${index + 1}, received ${data.length} order records`);
          return { data };
        });
        
        // Map Shopify order IDs to database order IDs
        if (result.data) {
          result.data.forEach(order => {
            if (order && order.shopify_order_id && order.id) {
              orderIdMap[order.shopify_order_id] = order.id;
              
              // Log orders without customer_id for debugging
              if (!order.customer_id) {
                console.warn(`Order ${order.shopify_order_id} inserted without customer_id`);
              }
            }
          });
        }
        
        insertedCount += batch.length;
        console.log(`Successfully inserted batch ${index + 1}/${batches.length}`);
      } catch (error) {
        console.error(`Error inserting order batch ${index + 1}:`, error);
        errorCount += batch.length;
        // Continue with next batch instead of failing the entire process
        console.log('Continuing with next batch...');
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} orders (${errorCount} failed)`);
    return { count: insertedCount, failed: errorCount, orderIdMap };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError('Unexpected error inserting orders', error);
  }
}

/**
 * Extract line items from orders
 * @param {Array} orders - Array of Shopify orders
 * @param {Object} orderIdMap - Mapping of Shopify order IDs to database order IDs
 * @returns {Array} - Array of line items prepared for database insertion
 */
function extractLineItems(orders, orderIdMap) {
  console.log('Extracting line items from orders...');
  
  // Validate inputs
  if (!Array.isArray(orders)) {
    console.error('Invalid orders data: expected array');
    throw new Error('Invalid orders data format');
  }
  
  if (!orderIdMap || typeof orderIdMap !== 'object') {
    console.warn('Order ID map is missing or invalid, line items may not be linked to orders');
    orderIdMap = {};
  }
  
  const lineItems = [];
  let skippedItems = 0;
  let skippedOrders = 0;
  
  orders.forEach(order => {
    // Extract the numeric ID from the Shopify order ID
    const shopifyOrderId = extractIdFromGid(order.id);
    if (!shopifyOrderId) {
      console.warn(`Invalid order ID format: ${order.id}`);
      skippedOrders++;
      return;
    }
    
    const dbOrderId = orderIdMap[shopifyOrderId];
    
    if (!dbOrderId) {
      console.warn(`Order ID not found for Shopify order ${shopifyOrderId} - skipping line items`);
      skippedOrders++;
      return;
    }
    
    // Use createdAt as the primary date field, fall back to processedAt
    const orderDate = order.createdAt || order.processedAt;
    if (!orderDate) {
      console.warn(`Order ${shopifyOrderId} missing date information`);
      skippedOrders++;
      return;
    }
    
    if (order.lineItems && order.lineItems.edges) {
      order.lineItems.edges.forEach(edge => {
        const item = edge.node;
        
        if (!item) {
          skippedItems++;
          return;
        }
        
        // Extract price from the correct field
        let price = 0;
        try {
          // Use originalUnitPriceSet as primary source, fall back to other fields
          if (item.originalUnitPriceSet && item.originalUnitPriceSet.shopMoney) {
            price = parseFloat(item.originalUnitPriceSet.shopMoney.amount);
          } else if (item.originalAmount) {
            price = parseFloat(item.originalAmount);
          } else if (item.price) {
            price = parseFloat(item.price);
          }
          
          if (isNaN(price)) price = 0;
        } catch (error) {
          console.warn(`Error parsing price for line item in order ${shopifyOrderId}: ${error.message}`);
          price = 0;
        }
        
        lineItems.push({
          id: uuidv4(),
          order_id: dbOrderId,
          shopify_order_id: shopifyOrderId, // Add shopify_order_id to satisfy NOT NULL constraint
          title: item.title || item.name || '',
          quantity: parseInt(item.quantity, 10) || 0,
          price: price,
          created_at: orderDate,
          updated_at: new Date().toISOString()
        });
      });
    }
  });
  
  console.log(`Extracted ${lineItems.length} line items (skipped ${skippedItems} invalid items from ${skippedOrders} skipped orders)`);
  return lineItems;
}

/**
 * Insert line items into the database
 * @param {Array} lineItems - Array of line items to insert
 * @returns {Promise<Object>} - Result of the insertion
 */
async function insertLineItems(lineItems) {
  console.log(`Preparing to insert ${lineItems.length} line items...`);
  const supabase = initSupabaseClient();
  
  // Validate input
  if (!Array.isArray(lineItems)) {
    console.error('Invalid line items data: expected array');
    throw new Error('Invalid line items data format');
  }
  
  if (lineItems.length === 0) {
    console.log('No line items to insert');
    return { count: 0 };
  }
  
  try {
    // Create batches for insertion
    const batches = createBatches(lineItems, BATCH_SIZE);
    console.log(`Created ${batches.length} batches for line item insertion`);
    
    let insertedCount = 0;
    let errorCount = 0;
    
    // Insert batches with retry logic
    for (const [index, batch] of batches.entries()) {
      console.log(`Inserting batch ${index + 1}/${batches.length} (${batch.length} line items)...`);
      
      try {
        const result = await executeWithRetry(async () => {
          const { data, error } = await supabase
            .from('order_line_items')
            .insert(batch);
          
          if (error) {
            throw new DatabaseError(`Failed to insert line item batch ${index + 1}`, error);
          }
          return { count: batch.length };
        });
        
        insertedCount += result.count;
        console.log(`Successfully inserted batch ${index + 1}/${batches.length}`);
      } catch (error) {
        console.error(`Error inserting line item batch ${index + 1}:`, error);
        errorCount += batch.length;
        // Continue with next batch instead of failing the entire process
        console.log('Continuing with next batch...');
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} line items (${errorCount} failed)`);
    return { count: insertedCount, failed: errorCount };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError('Unexpected error inserting line items', error);
  }
}

/**
 * Refresh materialized views
 * 
 * This function calls a database stored procedure that refreshes all materialized views
 * related to customer cohort analysis, including:
 * - Monthly order counts and revenue
 * - Customer retention metrics
 * - Cohort performance indicators
 * 
 * @returns {Promise<void>}
 */
async function refreshMaterializedViews() {
  console.log('Refreshing materialized views...');
  const supabase = initSupabaseClient();
  
  try {
    // Use a Promise.race with proper error handling
    const rpcPromise = new Promise(async (resolve) => {
      try {
        // Try to call the RPC function
        const result = await supabase.rpc('refresh_materialized_views');
        resolve(result);
      } catch (err) {
        // If the function doesn't exist, log a warning and continue
        if (err.message && err.message.includes('does not exist')) {
          console.warn('refresh_materialized_views function not found in database. Skipping view refresh.');
          resolve({ data: null, error: null });
        } else {
          resolve({ data: null, error: err });
        }
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Materialized view refresh timed out after 120s')), 120000)
    );
    
    const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
    
    if (error) {
      console.error('Error refreshing materialized views:', error);
      console.warn('Continuing despite materialized view refresh failure');
      // Don't throw error, just log it and continue
      return null;
    }
    
    console.log('Successfully refreshed materialized views');
    return data;
  } catch (error) {
    if (error.message && error.message.includes('timed out')) {
      console.warn('Materialized view refresh timed out, may still be running in the database');
      // Don't throw error for timeout as the procedure may still complete in the database
    } else {
      console.error('Failed to refresh materialized views:', error);
      console.warn('Continuing despite materialized view refresh failure');
      // Don't throw error, just log it and continue
    }
    return null;
  }
}

module.exports = {
  processOrderTags,
  prepareOrdersForInsertion,
  insertOrders,
  extractLineItems,
  insertLineItems,
  refreshMaterializedViews,
  extractIdFromGid // Export the utility function for use in other modules
};
