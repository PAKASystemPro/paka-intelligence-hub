/**
 * Utility functions for Shopify data sync
 */
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { BATCH_SIZE, API_CONFIG, DB_CONFIG } = require('./shopify-sync-config');

/**
 * Initialize Supabase client with production schema
 */
/**
 * Initialize a Supabase client with the specified schema
 * @param {string} schema - The database schema to use (default: 'production')
 * @returns {SupabaseClient} - Initialized Supabase client
 */
function initSupabaseClient(schema = DB_CONFIG.schema) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: { schema }
  });
}

/**
 * Get a Supabase client for public schema functions
 * @returns {SupabaseClient} - Supabase client configured for public schema
 */
function getPublicSchemaClient() {
  return initSupabaseClient('public');
}

/**
 * Helper function to fetch data from Shopify GraphQL API with robust retry logic
 */
async function fetchShopifyGraphQL(query, variables = {}, retries = API_CONFIG.maxRetries, backoff = API_CONFIG.initialBackoff) {
  // Support for both Edge Functions and regular Node.js environments
  const SHOPIFY_SHOP = process.env.SHOPIFY_STORE_URL;
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  
  if (!SHOPIFY_SHOP || !SHOPIFY_ACCESS_TOKEN) {
    throw new ApiError('Missing Shopify environment variables', 'ENV_ERROR');
  }
  
  // Create an AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  
  try {
    // Set up fetch options with timeout
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal
    };
    
    // Updated API version to 2025-04
    // Fix URL format - use SHOPIFY_SHOP directly as it likely already includes the protocol
    const apiUrl = SHOPIFY_SHOP.includes('http') 
      ? `${SHOPIFY_SHOP}/admin/api/2025-04/graphql.json`
      : `https://${SHOPIFY_SHOP}/admin/api/2025-04/graphql.json`;
    
    console.log(`Connecting to Shopify API at: ${apiUrl}`);
    const response = await fetch(apiUrl, fetchOptions);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        `Shopify API error: ${response.status} ${response.statusText}`, 
        'API_ERROR',
        response.status,
        errorText
      );
    }
    
    const data = await response.json();
    
    if (data.errors) {
      throw new ApiError(
        `GraphQL errors: ${JSON.stringify(data.errors)}`, 
        'GRAPHQL_ERROR', 
        null, 
        data.errors
      );
    }
    
    // Basic validation of response data
    if (!data.data) {
      throw new ApiError('Invalid API response: missing data', 'INVALID_RESPONSE');
    }
    
    return data.data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout errors
    if (error.name === 'AbortError') {
      throw new ApiError(
        `Shopify API request timed out after ${API_CONFIG.timeout}ms`, 
        'TIMEOUT_ERROR'
      );
    }
    
    // If it's already our custom error, just rethrow it
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors with retry logic
    if (retries > 0) {
      console.warn(`Shopify API request failed, retrying (${retries} attempts left): ${error.message}`);
      
      // Exponential backoff with jitter
      const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15
      const waitTime = Math.min(backoff * jitter, API_CONFIG.maxBackoff);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Retry with exponential backoff
      return fetchShopifyGraphQL(query, variables, retries - 1, backoff * 2);
    }
    
    throw new ApiError(
      `Shopify API request failed after all retries: ${error.message}`,
      'MAX_RETRIES_EXCEEDED',
      null,
      null,
      error
    );
  }
}

/**
 * Check if data already exists for a specific month
 */
async function checkExistingData(year, month) {
  const supabase = initSupabaseClient();
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  let endDate;
  
  // Calculate the last day of the month
  if (month === 12) {
    endDate = `${year + 1}-01-01`;
  } else {
    endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
  }
  
  try {
    // First check if we have a sync status record for this month
    // Try to handle the case where sync_status might be in public schema
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    let syncStatus = null;
    let syncError = null;
    
    try {
      // First try with production schema
      const result = await supabase
        .from('sync_status')
        .select('*')
        .eq('month', monthKey)
        .single();
      
      syncStatus = result.data;
      syncError = result.error;
    } catch (err) {
      console.log('Error accessing sync_status table, might not exist yet:', err.message);
    }
    
    if (syncError && syncError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      console.warn(`Error checking sync status: ${syncError.message}`);
      // Continue with the order check even if this fails
    } else if (syncStatus && syncStatus.is_complete) {
      return {
        hasExistingData: true,
        orderCount: syncStatus.orders_count,
        syncStatus: syncStatus
      };
    }
    
    // Check for existing orders in this month - using processed_at based on schema
    const { count: orderCount, error: orderError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('processed_at', startDate)
      .lt('processed_at', endDate);
    
    if (orderError) {
      throw new DatabaseError('Error checking existing orders', 'QUERY_ERROR', orderError);
    }
    
    // Also check for customers created in this month
    const { count: customerCount, error: customerError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lt('created_at', endDate);
    
    if (customerError) {
      throw new DatabaseError('Error checking existing customers', 'QUERY_ERROR', customerError);
    }
    
    return {
      hasExistingData: orderCount > 0 || customerCount > 0,
      orderCount,
      customerCount,
      syncStatus: syncStatus || null
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    console.error('Error checking existing data:', error);
    throw new DatabaseError('Error checking existing data', 'UNKNOWN_ERROR', error);
  }
}

/**
 * Create batches from an array
 */
function createBatches(items, batchSize = BATCH_SIZE) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Execute database operation with retry logic
 */
async function executeWithRetry(operation, maxRetries = DB_CONFIG.maxRetries, initialBackoff = DB_CONFIG.initialBackoff) {
  let retries = 0;
  
  while (true) {
    try {
      return await operation();
    } catch (error) {
      retries++;
      
      if (retries > maxRetries) {
        throw error;
      }
      
      const backoff = initialBackoff * Math.pow(2, retries - 1);
      console.log(`Retrying operation in ${backoff}ms (${retries}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}

/**
 * Log validation results
 */
function logValidationResults(year, month, actual, expected) {
  const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
  
  console.log('\n===== VALIDATION RESULTS =====');
  console.log(`Month: ${monthKey}`);
  
  // Extract actual counts, handling both direct values and database response objects
  const actualOrders = typeof actual.orders === 'number' ? actual.orders : 0;
  const actualCustomers = typeof actual.customers === 'number' ? actual.customers : 
    (actual.customers?.count ? parseInt(actual.customers.count, 10) : 0);
  const actualLineItems = typeof actual.lineItems === 'number' ? actual.lineItems : 
    (actual.lineItems?.count ? parseInt(actual.lineItems.count, 10) : 0);
  
  // Orders validation
  console.log('Orders:');
  console.log(`  Actual: ${actualOrders}`);
  console.log(`  Expected: ${expected.orders || 0}`);
  console.log(`  Match: ${actualOrders === expected.orders ? '✅' : '❌'}`);
  
  // Customers validation
  console.log('Customers:');
  console.log(`  Actual: ${actualCustomers}`);
  console.log(`  Expected: ${expected.customers || 0}`);
  console.log(`  Match: ${actualCustomers === expected.customers ? '✅' : '❌'}`);
  
  // Line items validation (if available)
  if (expected.lineItems !== undefined || actualLineItems > 0) {
    console.log('Line Items:');
    console.log(`  Actual: ${actualLineItems}`);
    console.log(`  Expected: ${expected.lineItems || 'N/A'}`);
    if (expected.lineItems !== undefined) {
      console.log(`  Match: ${actualLineItems === expected.lineItems ? '✅' : '❌'}`);
    } else {
      console.log(`  Match: N/A`);
    }
  }
  
  // New customers validation (if available)
  if (expected.newCustomers !== undefined) {
    console.log('New Customers:');
    console.log(`  Expected: ${expected.newCustomers || 0}`);
    // We don't have actual new customers count in the result, so we can't compare
    console.log(`  Actual: To be verified with SQL query`);
  }
  
  // Second orders validation (if available)
  if (expected.secondOrders !== undefined) {
    console.log('Second Orders:');
    console.log(`  Expected: ${expected.secondOrders || 0}`);
    // We don't have actual second orders count in the result, so we can't compare
    console.log(`  Actual: To be verified with SQL query`);
  }
  
  // Calculate completion percentages
  const percentageOrders = expected.orders ? Math.round((actualOrders / expected.orders) * 100) : 0;
  const percentageCustomers = expected.customers ? Math.round((actualCustomers / expected.customers) * 100) : 0;
  const percentageLineItems = (expected.lineItems !== undefined && actualLineItems > 0) ? 
    Math.round((actualLineItems / expected.lineItems) * 100) : 'N/A';
  
  console.log('\nCompletion Percentage:');
  console.log(`  Orders: ${percentageOrders}%`);
  console.log(`  Customers: ${percentageCustomers}%`);
  if (percentageLineItems !== 'N/A') {
    console.log(`  Line Items: ${percentageLineItems}%`);
  }
  
  // Overall status
  const isComplete = percentageOrders >= 95 && percentageCustomers >= 95;
  console.log(`\nOverall Status: ${isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  
  return {
    isComplete,
    percentages: {
      orders: percentageOrders,
      customers: percentageCustomers,
      lineItems: percentageLineItems
    }
  };
}

/**
 * Record sync status in the database
 */
async function recordSyncStatus(year, month, status) {
  const supabase = initSupabaseClient();
  const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
  
  try {
    // Create a record to store sync status
    const record = {
      month: monthKey,
      status: status.status || 'completed',
      orders_count: status.orders || 0,
      customers_count: status.customers || 0,
      line_items_count: status.lineItems || 0,
      is_complete: status.isComplete || false,
      sync_date: new Date().toISOString(),
      details: status
    };
    
    try {
      // Check if a record already exists
      const { data, error: checkError } = await supabase
        .from('sync_status')
        .select('*')
        .eq('month', monthKey)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
        console.warn(`Warning checking sync status: ${checkError.message}`);
      }
      
      if (data) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('sync_status')
          .update(record)
          .eq('month', monthKey);
        
        if (updateError) {
          console.warn(`Warning updating sync status: ${updateError.message}`);
        } else {
          console.log(`Sync status updated for ${monthKey}`);
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('sync_status')
          .insert([record]);
        
        if (insertError) {
          console.warn(`Warning inserting sync status: ${insertError.message}`);
        } else {
          console.log(`Sync status recorded for ${monthKey}`);
        }
      }
    } catch (tableError) {
      // The sync_status table might not exist yet
      console.log(`Note: Unable to record sync status for ${monthKey} - table might not exist yet`);
      console.log(`Would have recorded: ${JSON.stringify(record)}`);
    }
    
    // Always return true to avoid blocking the import process
    return true;
  } catch (error) {
    console.error(`Error recording sync status for ${monthKey}:`, error);
    // Still return true to avoid blocking the import process
    return true;
  }
}

/**
 * Custom error classes for better error handling
 */
class ApiError extends Error {
  constructor(message, code, status = null, details = null, originalError = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.originalError = originalError;
  }
}

class DatabaseError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.originalError = originalError;
  }
}

module.exports = {
  initSupabaseClient,
  getPublicSchemaClient,
  fetchShopifyGraphQL,
  executeWithRetry,
  checkExistingData,
  createBatches,
  logValidationResults,
  recordSyncStatus,
  ApiError,
  DatabaseError
};
