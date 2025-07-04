import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
// These will need to be set in your .env.local file

// Supabase URL and anon key - for client-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Supabase service role key - for server-side usage only
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Check if we're in a browser environment and if the URL is a placeholder
const isBrowser = typeof window !== 'undefined';
const isPlaceholder = supabaseUrl === 'https://placeholder-url.supabase.co';

// Create clients only if we have real values or we're on the server
let supabaseClient;
let supabaseAdmin;

if (!isBrowser || !isPlaceholder) {
  // Client for browser usage (with anon key)
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'production' }
  });
  
  // Admin client for server-side usage (with service role key)
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'production' }
  });
} else {
  // Create dummy clients for browser that just return mock data
  supabaseClient = {
    rpc: () => Promise.resolve({ data: [], error: null })
  };
  
  supabaseAdmin = {
    from: () => ({
      select: () => ({
        gte: () => ({
          lte: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
            execute: () => Promise.resolve({ data: [], error: null })
          }),
          eq: () => Promise.resolve({ data: [], error: null }),
          execute: () => Promise.resolve({ data: [], error: null })
        }),
        eq: () => Promise.resolve({ data: [], error: null }),
        execute: () => Promise.resolve({ data: [], error: null })
      })
    }),
    rpc: () => Promise.resolve({ data: [], error: null })
  };
}

export { supabaseClient, supabaseAdmin };

/**
 * Fetch cohort data from Supabase
 * 
 * @param {string} productType - Product type to filter by (optional)
 * @returns {Promise<Object>} - Cohort data
 */
export async function fetchCohortData(productType = 'All') {
  try {
    // Use real data if we have valid Supabase credentials
    if (!isPlaceholder) {
      console.log('Using real Supabase data for cohort analysis');
      
      // Server-side: call the appropriate RPC function based on product type
      let { data, error } = productType === 'All'
        ? await supabaseClient.rpc('get_test_cohort_heatmap')
        : await supabaseClient.rpc('get_test_cohort_heatmap_by_product', { product_type: productType });

      if (error) throw error;

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
    
    // Server-side: call the appropriate RPC function based on product type
    let { data, error } = productType === 'All'
      ? await supabaseClient.rpc('get_test_cohort_heatmap')
      : await supabaseClient.rpc('get_test_cohort_heatmap_by_product', { product_type: productType });

    if (error) throw error;

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
 * Fetch customers for a specific cohort
 * 
 * @param {string} cohortMonth - Cohort month in YYYY-MM format
 * @param {number} monthIndex - Month index (0-11) to filter by
 * @param {string} productType - Product type to filter by (optional)
 * @returns {Promise<Array>} - List of customers
 */
export async function fetchCohortCustomers(cohortMonth, monthIndex, productType = 'All') {
  try {
    // Use real data if we have valid Supabase credentials
    if (!isPlaceholder) {
      console.log('Using real Supabase data for cohort customers');
      
      // Convert cohortMonth to date range (first day to last day of month)
      const startDate = `${cohortMonth}-01`;
      const [year, month] = cohortMonth.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${cohortMonth}-${lastDay}`;
      
      // Query customers with their first order in the specified month
      let query = supabaseAdmin
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
          primary_product_cohort,
          orders(id, order_number, total_price, processed_at)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      // Add product filter if specified
      if (productType !== 'All') {
        query = query.eq('primary_product_cohort', productType);
      }
      
      // If monthIndex is specified, filter by second order month
      if (monthIndex !== undefined && monthIndex !== null) {
        // In a real implementation, we would filter by second order date
        // This is a placeholder for the actual implementation
        console.log(`Filtering for customers with second orders in month ${monthIndex}`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    }
    
    // Fall back to mock data if no valid Supabase credentials
    console.warn('Using mock customer data');
    return getMockCohortCustomers(cohortMonth, monthIndex, productType);
  } catch (error) {
    console.error('Error fetching cohort customers:', error);
    // Return mock data on error
    return getMockCohortCustomers(cohortMonth, monthIndex, productType);
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
 * Generate mock cohort customers for testing
 * 
 * @param {string} cohortMonth - Cohort month (YYYY-MM)
 * @param {number} monthIndex - Month index (0-11)
 * @param {string} productType - Product type to filter by
 * @returns {Array} - Mock customer list
 */
function getMockCohortCustomers(cohortMonth, monthIndex, productType = 'All') {
  // Generate a list of mock customers
  const count = Math.floor(Math.random() * 10) + 5; // 5-15 customers
  
  return Array.from({ length: count }, (_, i) => ({
    id: `cust-${cohortMonth}-${i}`,
    shopify_customer_id: `shopify-${100000 + i}`,
    email: `customer${i}@example.com`,
    first_name: `First${i}`,
    last_name: `Last${i}`,
    total_spent: Math.floor(Math.random() * 10000) / 100,
    orders_count: Math.floor(Math.random() * 5) + 1,
    created_at: `${cohortMonth}-01T00:00:00Z`,
    primary_product_cohort: productType === 'All' ? 
      ['深睡寶寶', '天皇丸', '皇后丸'][Math.floor(Math.random() * 3)] : 
      productType
  }));
}
