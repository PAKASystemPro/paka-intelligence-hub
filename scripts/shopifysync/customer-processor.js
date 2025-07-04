/**
 * Customer processing functions for Shopify data sync
 */
const { v4: uuidv4 } = require('uuid');
const { initSupabaseClient, executeWithRetry, createBatches, DatabaseError, ApiError } = require('./shopify-sync-utils');
const { BATCH_SIZE } = require('./shopify-sync-config');

/**
 * Extract the numeric ID from a Shopify GID (Global ID)
 * @param {string} gid - Shopify Global ID (e.g., 'gid://shopify/Customer/1234567890')
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
 * Process customer tags to ensure they're in array format
 * @param {*} tags - Tags from Shopify API (can be string, array, or null)
 * @returns {Array} - Array of tag strings
 */
function processCustomerTags(tags) {
  // If tags is null or undefined, return empty array
  if (!tags) return [];
  
  // If tags is already an array, return it
  if (Array.isArray(tags)) return tags;
  
  // If tags is a string, split by comma and trim whitespace
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  
  // Default case: return empty array
  return [];
}

/**
 * Extract unique customers from orders
 * @param {Array} orders - Array of Shopify orders
 * @returns {Array} - Array of unique customers
 */
function extractCustomersFromOrders(orders) {
  console.log('Extracting unique customers from orders...');
  
  if (!Array.isArray(orders)) {
    console.error('Invalid orders data: expected array');
    throw new Error('Invalid orders data format');
  }
  
  // Create a map to track unique customers by their Shopify ID
  const customerMap = new Map();
  let skippedCustomers = 0;
  
  orders.forEach(order => {
    // Validate order has required fields
    if (!order || !order.id) {
      console.warn('Skipping invalid order without ID');
      return;
    }
    
    // Use createdAt as the primary date field, fall back to processedAt
    const orderDate = order.createdAt || order.processedAt;
    if (!orderDate) {
      console.warn(`Order ${order.id} missing date information`);
      return;
    }
    
    if (order.customer && order.customer.id) {
      const customerId = order.customer.id;
      const numericId = extractIdFromGid(customerId);
      
      if (!numericId) {
        console.warn(`Invalid customer ID format: ${customerId}`);
        skippedCustomers++;
        return;
      }
      
      // Only add if not already in the map
      if (!customerMap.has(customerId)) {
        // Validate customer has required fields
        if (!order.customer.email) {
          console.warn(`Customer ${customerId} missing email, using placeholder`);
          order.customer.email = `unknown-${numericId}@placeholder.com`;
        }
        
        // Extract customer data with all relevant fields
        customerMap.set(customerId, {
          ...order.customer,
          // Store both the full GID and the numeric ID
          id: customerId,
          numeric_id: numericId,
          // Add the first order date as a reference
          // Prefer customer.createdAt if available, otherwise use order date
          first_order_date: order.customer.createdAt || orderDate,
          // Ensure we capture these fields from the Shopify API response
          // Map numberOfOrders to orders_count
          orders_count: order.customer.numberOfOrders || 0,
          // Map amountSpent.amount to total_spent
          amountSpent: order.customer.amountSpent || { amount: '0.00' },
          // Process tags properly as an array
          tags: processCustomerTags(order.customer.tags)
        });
        
        // Log if we found Tony Cheung
        if (numericId === '8922008289578') {
          console.log('Found Tony Cheung in orders with tags:', processCustomerTags(order.customer.tags));
        }
      } else {
        // If customer exists, check if this order is earlier than the recorded first order
        const customer = customerMap.get(customerId);
        if (new Date(orderDate) < new Date(customer.first_order_date)) {
          customer.first_order_date = orderDate;
          customerMap.set(customerId, customer);
        }
      }
    }
  });
  
  // Convert map to array
  const uniqueCustomers = Array.from(customerMap.values());
  console.log(`Extracted ${uniqueCustomers.length} unique customers (skipped ${skippedCustomers} invalid entries)`);
  
  return uniqueCustomers;
}

/**
 * Get existing customer IDs from database
 */
async function fetchExistingCustomerIds(supabase) {
  try {
    console.log('Fetching existing customer IDs from database...');
    
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, shopify_customer_id');
    
    if (error) {
      throw error;
    }
    
    const customerIdMap = new Map();
    for (const customer of customers) {
      // Store the database ID keyed by the Shopify customer ID
      // This allows us to both check existence and get the DB ID
      const shopifyId = customer.shopify_customer_id;
      if (shopifyId) {
        customerIdMap.set(shopifyId, customer.id);
      }
    }
    
    console.log(`Retrieved ${customerIdMap.size} existing customer IDs`);
    return customerIdMap;
  } catch (error) {
    console.error('Error fetching customer IDs:', error);
    throw error;
  }
}

/**
 * Insert customers into the database
 * @param {Array} customers - Array of customers to insert
 * @returns {Promise<Object>} - Result of the insertion
 */
async function insertCustomers(customers) {
  console.log(`Preparing to insert/update ${customers.length} customers...`);
  const supabase = initSupabaseClient();
  
  // Validate input
  if (!Array.isArray(customers)) {
    console.error('Invalid customers data: expected array');
    throw new Error('Invalid customers data format');
  }
  
  // Get existing customer IDs to identify which ones need update vs insert
  const existingIds = await fetchExistingCustomerIds(supabase);
  
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  // Prepare customer data for upsert
  const customersToUpsert = customers.map(customer => {
    // Extract the Shopify ID consistently
    const shopifyId = customer.id.replace('gid://shopify/Customer/', '');
    
    // Validate email format
    let email = customer.email || '';
    if (email && !email.includes('@')) {
      console.warn(`Customer ${shopifyId} missing email, using placeholder`);
      email = `${shopifyId}@placeholder.com`;
    }
    
    // Extract orders count from orders_count field
    let ordersCount = 0;
    if (customer.orders_count) {
      ordersCount = parseInt(customer.orders_count, 10);
    } else if (customer.orders && customer.orders.totalCount) {
      // Fallback to orders.totalCount if available
      ordersCount = parseInt(customer.orders.totalCount, 10);
    }
    if (isNaN(ordersCount)) ordersCount = 0;
    
    // Extract total spent from amountSpent.amount field
    let totalSpent = 0;
    if (customer.amountSpent && customer.amountSpent.amount) {
      totalSpent = parseFloat(customer.amountSpent.amount);
    }
    
    // Process customer tags to ensure they're in array format
    const tags = processCustomerTags(customer.tags);
    
    // Check if this is an existing customer
    const isExisting = existingIds.has(shopifyId);
    
    return {
      // For existing customers, use their existing UUID from the database
      // For new customers, generate a new UUID
      id: isExisting ? existingIds.get(shopifyId) : uuidv4(),
      shopify_customer_id: shopifyId,
      email: email,
      first_name: customer.firstName || '',
      last_name: customer.lastName || '',
      phone: customer.phone || '',
      orders_count: isNaN(ordersCount) ? 0 : ordersCount,
      total_spent: isNaN(totalSpent) ? 0.00 : totalSpent,
      // For existing customers, don't update created_at
      created_at: isExisting ? undefined : (customer.first_order_date || new Date().toISOString()),
      updated_at: new Date().toISOString(),
      tags: tags // Include tags as an array for PostgreSQL array column
    };
  });
  
  // Create batches for upsert
  const upsertBatches = createBatches(customersToUpsert, BATCH_SIZE);
  console.log(`Created ${upsertBatches.length} batches for customer upsert`);
  
  // Upsert batches with retry logic
  for (const [index, batch] of upsertBatches.entries()) {
    console.log(`Upserting batch ${index + 1}/${upsertBatches.length} (${batch.length} customers)...`);
    
    try {
      await executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('customers')
          .upsert(batch, { 
            onConflict: 'shopify_customer_id',
            ignoreDuplicates: false
          });
        
        if (error) {
          throw new DatabaseError(`Failed to upsert customer batch ${index + 1}`, error);
        }
        return { count: batch.length };
      });
      
      // Count as inserted or updated based on whether they existed before
      for (const customer of batch) {
        if (existingIds.has(customer.shopify_customer_id)) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      }
      
      console.log(`Successfully upserted batch ${index + 1}/${upsertBatches.length}`);
    } catch (error) {
      console.error(`Error upserting customer batch ${index + 1}:`, error);
      errorCount += batch.length;
      // Continue with next batch instead of failing the entire process
      console.log('Continuing with next batch...');
    }
  }
  
  console.log(`Customer processing complete: ${insertedCount} inserted, ${updatedCount} updated, ${errorCount} failed`);
  
  return {
    inserted: insertedCount,
    updated: updatedCount,
    failed: errorCount
  };
}

/**
 * Call the classify_new_customers RPC function
 * 
 * This function calls a database stored procedure that:
 * 1. Identifies customers who have not been classified yet
 * 2. Analyzes their order history and purchase patterns
 * 3. Assigns appropriate customer segments and cohorts
 * 4. Updates the customer records with classification data
 * 
 * @returns {Promise<void>}
 */
async function classifyNewCustomers() {
  console.log('Classifying new customers...');
  const supabase = initSupabaseClient();
  
  try {
    // Use a Promise.race with proper error handling
    const rpcPromise = new Promise(async (resolve) => {
      try {
        // Try to call the RPC function
        const result = await supabase.rpc('classify_new_customers');
        resolve(result);
      } catch (err) {
        // If the function doesn't exist, log a warning and continue
        if (err.message && err.message.includes('does not exist')) {
          console.warn('classify_new_customers function not found in database. Skipping classification.');
          resolve({ data: null, error: null });
        } else {
          resolve({ data: null, error: err });
        }
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Classification timed out after 60s')), 60000)
    );
    
    const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
    
    if (error) {
      console.error('Error classifying new customers:', error);
      console.warn('Continuing despite classification failure');
      // Don't throw error, just log it and continue
      return;
    }
    
    // Validate the response
    if (data && typeof data === 'object') {
      const classifiedCount = data.classified_count || 0;
      console.log(`Successfully classified ${classifiedCount} new customers`);
    } else {
      console.log('Successfully classified new customers');
    }
  } catch (error) {
    if (error.message && error.message.includes('timed out')) {
      console.warn('Customer classification timed out, may still be running in the database');
      // Don't throw error for timeout as the procedure may still complete in the database
    } else {
      console.error('Failed to classify new customers:', error);
      console.warn('Continuing despite classification failure');
      // Don't throw error, just log it and continue
    }
  }
}

/**
 * Get customer IDs from database for order association
 * @returns {Object} - Mapping of Shopify customer IDs to database UUIDs
 */
async function getCustomerIds() {
  console.log('Fetching customer IDs from database...');
  const supabase = initSupabaseClient();
  
  try {
    // Use a more robust query with pagination to ensure we get ALL customers
    let allCustomers = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('customers')
        .select('id, shopify_customer_id')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error(`Error fetching customer IDs (page ${page}):`, error);
        throw new Error(`Failed to fetch customer IDs: ${error.message}`);
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        hasMore = false;
      } else {
        allCustomers = allCustomers.concat(data);
        page++;
        console.log(`Fetched ${data.length} customers (total: ${allCustomers.length})`);
        
        // Check if we've reached the end
        if (data.length < pageSize) {
          hasMore = false;
        }
      }
    }
    
    // Create a mapping of Shopify customer IDs to database IDs
    const customerIdMap = {};
    allCustomers.forEach(customer => {
      if (customer.shopify_customer_id && customer.id) {
        customerIdMap[customer.shopify_customer_id] = customer.id;
      }
    });
    
    console.log(`Fetched ${Object.keys(customerIdMap).length} customer IDs`);
    
    // Log any customers without Shopify IDs
    const missingShopifyIds = allCustomers.filter(c => !c.shopify_customer_id).length;
    if (missingShopifyIds > 0) {
      console.warn(`Found ${missingShopifyIds} customers without Shopify IDs`);
    }
    
    return customerIdMap;
  } catch (error) {
    console.error('Error in getCustomerIds:', error);
    throw error;
  }
}

module.exports = {
  extractCustomersFromOrders,
  fetchExistingCustomerIds,
  insertCustomers,
  classifyNewCustomers,
  getCustomerIds,
  extractIdFromGid, // Export this utility function as well
  processCustomerTags
};
