import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
// These will need to be set in your .env.local file

// Supabase URL and anon key - for client-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Supabase service role key - for server-side usage only
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Check if we're in development mode or if the URL is a placeholder
const isDevelopment = process.env.NODE_ENV === 'development';
const isPlaceholder = supabaseUrl === 'https://placeholder-url.supabase.co';

// Create clients based on environment
let supabaseClient;
let supabaseAdmin;

// TEMPORARILY MODIFIED: Using real Supabase calls even in development mode for testing
// Original condition: if (isDevelopment) {
if (false) {
  console.log('Development mode: Using mock data');
  // Create dummy clients for development
  supabaseClient = { rpc: () => Promise.resolve({ data: [], error: null }) };
  supabaseAdmin = { from: () => ({ select: () => ({ gte: () => ({ lte: () => ({ eq: () => Promise.resolve({ data: [], error: null }), execute: () => Promise.resolve({ data: [], error: null }) }), eq: () => Promise.resolve({ data: [], error: null }), execute: () => Promise.resolve({ data: [], error: null }) }), eq: () => Promise.resolve({ data: [], error: null }), execute: () => Promise.resolve({ data: [], error: null }) }) }), rpc: () => Promise.resolve({ data: [], error: null }) };
} else if (!isPlaceholder) {
  // Production mode with valid credentials
  console.log('Production mode: Using real Supabase clients');
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
} else {
  // No valid environment variables, create dummy clients
  console.warn('Using dummy Supabase clients (no valid environment variables)');
  supabaseClient = { rpc: () => Promise.resolve({ data: [], error: null }) };
  supabaseAdmin = { from: () => ({ select: () => ({ gte: () => ({ lte: () => ({ eq: () => Promise.resolve({ data: [], error: null }), execute: () => Promise.resolve({ data: [], error: null }) }), eq: () => Promise.resolve({ data: [], error: null }), execute: () => Promise.resolve({ data: [], error: null }) }), eq: () => Promise.resolve({ data: [], error: null }), execute: () => Promise.resolve({ data: [], error: null }) }) }), rpc: () => Promise.resolve({ data: [], error: null }) };
}

export { supabaseClient, supabaseAdmin };

/**
 * Fetch cohort data from Supabase
 * 
 * @param {string} productType - Product type to filter by (optional)
 * @returns {Promise<Object>} - Cohort data
 */
/**
 * Fetch cohort data from Supabase
 * 
 * @param {string} productType - Product type to filter by (optional)
 * @returns {Promise<Object>} - Cohort data
 */
export async function fetchCohortData(productType = 'All') {
  try {
    // In development mode, always use mock data
    if (isDevelopment) {
      console.log('Development mode: Using mock cohort data');
      return getMockCohortData(productType);
    }
    
    // In production with valid credentials, use real data
    if (!isPlaceholder) {
      console.log('Production mode: Using real Supabase data for cohort analysis');
      
      // Call the appropriate RPC function based on product type
      const functionName = 'get_test_cohort_heatmap';
      
      let { data, error } = productType === 'All'
        ? await supabaseClient.rpc(functionName)
        : await supabaseClient.rpc(`${functionName}_by_product`, { product_type: productType });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      // Format the data for the heatmap
      const formattedData = {};
      
      if (data && data.length > 0) {
        data.forEach(row => {
          formattedData[row.cohort_month] = {
            newCustomers: row.new_customers,
            secondOrders: row.second_orders,
            ...Object.fromEntries(
              Array.from({ length: 12 }, (_, i) => [`m${i}`, row[`m${i}`] || 0])
            )
          };
        });
        return formattedData;
      }
    }
    
    // Fall back to mock data if no valid Supabase credentials or no data returned
    console.warn('Using mock cohort data');
    return getMockCohortData(productType);

    // Format the data for the heatmap
    const formattedData = {};
    
    if (data && data.length > 0) {
      data.forEach(row => {
        formattedData[row.cohort_month] = {
          newCustomers: row.new_customers,
          secondOrders: row.second_orders,
          ...Object.fromEntries(
            Array.from({ length: 12 }, (_, i) => [`m${i}`, row[`m${i}`] || 0])
          )
        };
      });
    }

    return formattedData;
  } catch (error) {
    console.error('Error fetching cohort data:', error);
    // Return mock data on error
    return getMockCohortData(productType);
  }
}

/**
 * Fetch multi-order cohort data from Supabase
 * 
 * @param {string} productType - Product type to filter by (optional)
 * @param {number} orderNumber - The order number to analyze (3rd, 4th, etc.)
 * @returns {Promise<Object>} - Multi-order cohort data
 */
export async function fetchMultiOrderCohortData(productType = 'All', orderNumber = 3) {
  try {
    // In development mode, always use mock data
    if (isDevelopment) {
      console.log('Development mode: Using mock multi-order cohort data');
      return getMockMultiOrderCohortData(productType, orderNumber);
    }
    
    // In production with valid credentials, use real data
    if (!isPlaceholder) {
      console.log(`Production mode: Using real Supabase data for ${orderNumber}th order cohort analysis`);
      
      // Call the appropriate RPC function based on product type
      const functionName = 'get_multi_order_cohort_heatmap';
      
      let { data, error } = productType === 'All'
        ? await supabaseClient.rpc(functionName, { order_number: orderNumber })
        : await supabaseClient.rpc(functionName, { 
            product_type: productType,
            order_number: orderNumber 
          });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      // Format the data for the heatmap
      const formattedData = {};
      
      if (data && data.length > 0) {
        data.forEach(row => {
          formattedData[row.cohort_month] = {
            previousOrderCustomers: row.previous_order_customers,
            nthOrders: row.nth_orders,
            ...Object.fromEntries(
              Array.from({ length: 12 }, (_, i) => [`m${i}`, row[`m${i}`] || 0])
            )
          };
        });
        return formattedData;
      }
    }
    
    // Fall back to mock data if no valid Supabase credentials or no data returned
    console.warn(`Using mock ${orderNumber}th order cohort data`);
    return getMockMultiOrderCohortData(productType, orderNumber);
  } catch (error) {
    console.error(`Error fetching ${orderNumber}th order cohort data:`, error);
    // Return mock data on error
    return getMockMultiOrderCohortData(productType, orderNumber);
  }
}

/**
 * Fetch customers for a specific cohort
 * 
 * @param {string} cohortMonth - Cohort month in YYYY-MM format
 * @param {number} monthIndex - Month index (0-11) to filter by
 * @param {string} productType - Product type to filter by (optional)
 * @param {number} orderNumber - Order number to filter by (default: 2 for second orders)
 * @returns {Promise<Array>} - List of customers
 */
export async function fetchCohortCustomers(cohortMonth, monthIndex, productType = 'All', orderNumber = 2) {
  try {
    // TEMPORARILY MODIFIED: Using real Supabase calls even in development mode for testing
    // Original condition: if (isDevelopment) {
    if (false) {
      console.log('Development mode: Using mock customer data');
      return getMockCohortCustomers(cohortMonth, monthIndex, productType);
    }
    
    // In production with valid credentials, use real data
    if (!isPlaceholder) {
      console.log('Production mode: Using real Supabase data for cohort customers');
      
      // Convert cohortMonth to date range (first day to last day of month)
      const startDate = `${cohortMonth}-01`;
      const [year, month] = cohortMonth.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${cohortMonth}-${lastDay}`;
      
      try {
        // Try RPC function first
        let rpcFunction = 'get_test_cohort_customers';
        
        // Use multi-order cohort RPC function for orders beyond 2nd
        if (orderNumber > 2) {
          rpcFunction = 'get_multi_order_cohort_customers';
        }
        
        const { data, error } = await supabaseClient.rpc(rpcFunction, {
          cohort_start_date: startDate,
          cohort_end_date: endDate,
          product_type: productType === 'All' ? null : productType,
          month_index: monthIndex,
          order_number: orderNumber
        });
        
        if (error) {
          console.error('Supabase RPC error:', error);
          throw error;
        }
        
        console.log(`Found ${data?.length || 0} customers for cohort ${cohortMonth}`);
        return data || [];
      } catch (rpcError) {
        console.error('Failed to fetch with RPC, falling back to direct query:', rpcError);
        
        // Fallback to direct query if RPC fails
        let query = supabaseClient
          .from('customers')
          .select(`
            id,
            shopify_customer_id,
            email,
            first_name,
            last_name,
            total_spent,
            orders_count,
            created_at,
            primary_product_cohort
          `)
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        // Add product filter if specified
        if (productType !== 'All') {
          query = query.eq('primary_product_cohort', productType);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }
        
        return data || [];
      }
    }
    
    // Fall back to mock data if no valid Supabase credentials
    console.warn('Using mock customer data');
    return getMockCohortCustomers(cohortMonth, monthIndex, productType, orderNumber);
  } catch (error) {
    console.error('Error fetching cohort customers:', error);
    // Return mock data on error
    return getMockCohortCustomers(cohortMonth, monthIndex, productType, orderNumber);
  }
}

/**
 * Generate mock cohort data for testing
 * Based on the reference heatmap data
 * 
 * @param {string} productType - Product type to filter by
 * @returns {Object} - Mock cohort data
 */
function getMockCohortData(productType = 'All') {
  // Mock data based on the reference heatmaps
  const mockData = {
    'All': {
      '2025-01': { newCustomers: 147, secondOrders: 65, m0: 20, m1: 31, m2: 7, m3: 5, m4: 1, m5: 1, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-02': { newCustomers: 181, secondOrders: 76, m0: 16, m1: 37, m2: 11, m3: 9, m4: 3, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-03': { newCustomers: 282, secondOrders: 139, m0: 40, m1: 75, m2: 15, m3: 9, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-04': { newCustomers: 369, secondOrders: 140, m0: 46, m1: 77, m2: 17, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-05': { newCustomers: 453, secondOrders: 157, m0: 81, m1: 76, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-06': { newCustomers: 526, secondOrders: 121, m0: 121, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
    },
    '深睡寶寶': {
      '2025-01': { newCustomers: 32, secondOrders: 17, m0: 5, m1: 7, m2: 2, m3: 2, m4: 0, m5: 1, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-02': { newCustomers: 50, secondOrders: 20, m0: 4, m1: 10, m2: 3, m3: 2, m4: 1, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-03': { newCustomers: 106, secondOrders: 57, m0: 15, m1: 30, m2: 7, m3: 5, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-04': { newCustomers: 125, secondOrders: 45, m0: 15, m1: 25, m2: 5, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-05': { newCustomers: 116, secondOrders: 45, m0: 25, m1: 20, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-06': { newCustomers: 149, secondOrders: 41, m0: 41, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
    },
    '天皇丸': {
      '2025-01': { newCustomers: 42, secondOrders: 15, m0: 5, m1: 7, m2: 1, m3: 1, m4: 0, m5: 1, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-02': { newCustomers: 49, secondOrders: 18, m0: 4, m1: 9, m2: 3, m3: 2, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-03': { newCustomers: 83, secondOrders: 44, m0: 12, m1: 22, m2: 6, m3: 4, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-04': { newCustomers: 172, secondOrders: 69, m0: 19, m1: 38, m2: 12, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-05': { newCustomers: 217, secondOrders: 78, m0: 40, m1: 38, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-06': { newCustomers: 225, secondOrders: 48, m0: 48, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
    },
    '皇后丸': {
      '2025-01': { newCustomers: 68, secondOrders: 33, m0: 10, m1: 15, m2: 4, m3: 2, m4: 1, m5: 1, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-02': { newCustomers: 58, secondOrders: 32, m0: 8, m1: 15, m2: 5, m3: 3, m4: 1, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-03': { newCustomers: 82, secondOrders: 36, m0: 11, m1: 18, m2: 4, m3: 3, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-04': { newCustomers: 60, secondOrders: 25, m0: 10, m1: 12, m2: 3, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-05': { newCustomers: 105, secondOrders: 34, m0: 16, m1: 18, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
      '2025-06': { newCustomers: 140, secondOrders: 31, m0: 31, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
    }
  };
  
  return productType === 'All' ? mockData['All'] : mockData[productType] || {};
}

/**
 * Generate mock multi-order cohort data for testing
 * 
 * @param {string} productType - Product type to filter by
 * @param {number} orderNumber - The order number to analyze (3rd, 4th, etc.)
 * @returns {Object} - Mock multi-order cohort data
 */
function getMockMultiOrderCohortData(productType = 'All', orderNumber = 3) {
  // Base cohort data structure
  const baseCohorts = {
    '2025-01': { previousOrderCustomers: 65, nthOrders: 0, m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
    '2025-02': { previousOrderCustomers: 76, nthOrders: 0, m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
    '2025-03': { previousOrderCustomers: 139, nthOrders: 0, m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
    '2025-04': { previousOrderCustomers: 141, nthOrders: 0, m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
    '2025-05': { previousOrderCustomers: 157, nthOrders: 0, m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
    '2025-06': { previousOrderCustomers: 121, nthOrders: 0, m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0 },
  };
  
  // Create a deep copy of the base cohort data
  const cohortData = JSON.parse(JSON.stringify(baseCohorts));
  
  // Calculate retention rate based on order number (decreasing with higher orders)
  const baseRetentionRate = Math.max(0.2, 0.6 - ((orderNumber - 3) * 0.1));
  
  // Fill in the data for each cohort month
  Object.keys(cohortData).forEach((month, idx) => {
    // Skip the last few months for higher order numbers to simulate incomplete data
    if (idx >= 6 - orderNumber && idx < 6) {
      return; // Skip this month
    }
    
    const cohort = cohortData[month];
    const previousOrderCustomers = cohort.previousOrderCustomers;
    
    // Calculate total nth orders based on retention rate and previous order customers
    // Apply a small random variation
    const retentionVariation = (Math.random() * 0.2) - 0.1; // -10% to +10%
    const adjustedRetention = Math.max(0.1, Math.min(0.9, baseRetentionRate + retentionVariation));
    const totalNthOrders = Math.round(previousOrderCustomers * adjustedRetention);
    
    // Set the total nth orders
    cohort.nthOrders = totalNthOrders;
    
    // Distribute the nth orders across months (m0-m11)
    // More orders in earlier months, fewer in later months
    let remainingOrders = totalNthOrders;
    
    // m0: 40-60% of orders
    const m0Percentage = 0.4 + (Math.random() * 0.2);
    const m0Orders = Math.min(remainingOrders, Math.round(totalNthOrders * m0Percentage));
    cohort.m0 = m0Orders;
    remainingOrders -= m0Orders;
    
    // m1: 20-40% of orders
    if (remainingOrders > 0) {
      const m1Percentage = 0.2 + (Math.random() * 0.2);
      const m1Orders = Math.min(remainingOrders, Math.round(totalNthOrders * m1Percentage));
      cohort.m1 = m1Orders;
      remainingOrders -= m1Orders;
    }
    
    // m2: 10-20% of orders
    if (remainingOrders > 0) {
      const m2Percentage = 0.1 + (Math.random() * 0.1);
      const m2Orders = Math.min(remainingOrders, Math.round(totalNthOrders * m2Percentage));
      cohort.m2 = m2Orders;
      remainingOrders -= m2Orders;
    }
    
    // m3: 0-10% of orders
    if (remainingOrders > 0) {
      const m3Percentage = Math.random() * 0.1;
      const m3Orders = Math.min(remainingOrders, Math.round(totalNthOrders * m3Percentage));
      cohort.m3 = m3Orders;
      remainingOrders -= m3Orders;
    }
    
    // Any remaining orders go to m4
    if (remainingOrders > 0) {
      cohort.m4 = remainingOrders;
    }
    
    // Verify that the sum of monthly values equals nthOrders
    const monthSum = cohort.m0 + cohort.m1 + cohort.m2 + cohort.m3 + cohort.m4 + 
                    cohort.m5 + cohort.m6 + cohort.m7 + cohort.m8 + cohort.m9 + 
                    cohort.m10 + cohort.m11;
    
    // Adjust if there's a discrepancy
    if (monthSum !== cohort.nthOrders) {
      const diff = cohort.nthOrders - monthSum;
      cohort.m0 += diff; // Add or subtract the difference from m0
    }
  });
  
  // Create product-specific mock data
  const mockData = {
    'All': cohortData,
    '深睡寶寶': JSON.parse(JSON.stringify(cohortData)),
    '天皇丸': JSON.parse(JSON.stringify(cohortData)),
    '皇后丸': JSON.parse(JSON.stringify(cohortData))
  };
  
  // Apply some variations to product-specific data
  Object.keys(mockData).forEach(product => {
    if (product !== 'All') {
      Object.keys(mockData[product]).forEach(month => {
        const cohort = mockData[product][month];
        const variation = 0.7 + (Math.random() * 0.6); // 70-130% of the original value
        
        cohort.previousOrderCustomers = Math.round(cohort.previousOrderCustomers * variation * 0.33);
        cohort.nthOrders = Math.round(cohort.nthOrders * variation * 0.33);
        
        // Adjust monthly values proportionally
        for (let i = 0; i <= 11; i++) {
          const monthKey = `m${i}`;
          cohort[monthKey] = Math.round(cohort[monthKey] * variation * 0.33);
        }
      });
    }
  });
  
  return productType === 'All' ? mockData['All'] : mockData[productType] || {};
} 

/**
 * Generate a list of mock customers for a specific cohort
 * 
 * @param {string} cohortMonth - Cohort month (YYYY-MM)
 * @param {number} monthIndex - Month index (0-11)
 * @param {string} productType - Product type to filter by
 * @param {number} orderNumber - Order number to filter by (default: 2 for second orders)
 * @returns {Array} - Mock customer list
 */
function getMockCohortCustomers(cohortMonth, monthIndex, productType = 'All', orderNumber = 2) {
  // Generate a list of mock customers
  // Decrease the count for higher order numbers to simulate customer drop-off
  const baseCount = Math.floor(Math.random() * 10) + 5; // 5-15 customers for 2nd orders
  const orderFactor = Math.max(0.2, 1 - ((orderNumber - 2) * 0.2)); // Reduce by 20% for each order level
  const count = Math.max(2, Math.floor(baseCount * orderFactor)); // Ensure at least 2 customers
  
  return Array.from({ length: count }, (_, i) => ({
    id: `cust-${cohortMonth}-${i}-order${orderNumber}`,
    shopify_customer_id: `shopify-${100000 + i}`,
    email: `customer${i}@example.com`,
    first_name: `First${i}`,
    last_name: `Last${i}`,
    total_spent: Math.floor(Math.random() * 10000) / 100,
    // For higher order numbers, ensure orders_count is at least equal to orderNumber
    orders_count: Math.max(orderNumber, Math.floor(Math.random() * 5) + orderNumber),
    created_at: `${cohortMonth}-01T00:00:00Z`,
    primary_product_cohort: productType === 'All' ? 
      ['深睡寶寶', '天皇丸', '皇后丸'][Math.floor(Math.random() * 3)] : 
      productType
  }));
}
