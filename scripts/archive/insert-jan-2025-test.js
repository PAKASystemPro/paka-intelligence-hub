// Script to insert January 2025 test data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    },
    db: {
      schema: 'production'
    }
  }
);

async function main() {
  try {
    console.log('Starting January 2025 test data insertion...');
    
    // Step 1: Clear existing test data (optional)
    console.log('\nStep 1: Clearing existing test data...');
    await clearExistingData();
    
    // Step 2: Insert January 2025 customers
    console.log('\nStep 2: Inserting January 2025 customers...');
    
    // Generate a timestamp to make IDs unique for this test run
    const timestamp = Date.now();
    
    // Insert 3 customers for 深睡寶寶 cohort
    console.log('Inserting 深睡寶寶 customers...');
    for (let i = 1; i <= 3; i++) {
      const { data, error } = await supabase.rpc('insert_test_customer', {
        p_shopify_customer_id: `cust_jan_ss_${timestamp}_${i}`,
        p_email: `ss_customer${timestamp}_${i}@example.com`,
        p_first_name: `SS`,
        p_last_name: `Customer ${i}`,
        p_total_spent: 100 * i,
        p_orders_count: i % 2 === 0 ? 2 : 1,
        p_created_at: `2025-01-${5 + i}T10:00:00Z`,
        p_updated_at: `2025-01-${5 + i}T10:00:00Z`
      });
      
      if (error) {
        console.error(`Error inserting 深睡寶寶 customer ${i}:`, error);
        return;
      }
    }
    
    // Insert 3 customers for 天皇丸 cohort
    console.log('Inserting 天皇丸 customers...');
    for (let i = 1; i <= 3; i++) {
      const { data, error } = await supabase.rpc('insert_test_customer', {
        p_shopify_customer_id: `cust_jan_tw_${timestamp}_${i}`,
        p_email: `tw_customer${timestamp}_${i}@example.com`,
        p_first_name: `TW`,
        p_last_name: `Customer ${i}`,
        p_total_spent: 150 * i,
        p_orders_count: i % 2 === 0 ? 2 : 1,
        p_created_at: `2025-01-${10 + i}T10:00:00Z`,
        p_updated_at: `2025-01-${10 + i}T10:00:00Z`
      });
      
      if (error) {
        console.error(`Error inserting 天皇丸 customer ${i}:`, error);
        return;
      }
    }
    
    // Insert 3 customers for 皇后丸 cohort
    console.log('Inserting 皇后丸 customers...');
    for (let i = 1; i <= 3; i++) {
      const { data, error } = await supabase.rpc('insert_test_customer', {
        p_shopify_customer_id: `cust_jan_hh_${timestamp}_${i}`,
        p_email: `hh_customer${timestamp}_${i}@example.com`,
        p_first_name: `HH`,
        p_last_name: `Customer ${i}`,
        p_total_spent: 200 * i,
        p_orders_count: i % 2 === 0 ? 2 : 1,
        p_created_at: `2025-01-${15 + i}T10:00:00Z`,
        p_updated_at: `2025-01-${15 + i}T10:00:00Z`
      });
      
      if (error) {
        console.error(`Error inserting 皇后丸 customer ${i}:`, error);
        return;
      }
    }
    
    // Step 3: Create a simplified approach - insert customers and orders directly
    console.log('\nStep 3: Creating test customers and orders directly...');
    
    // Track customers for later reference
    const testCustomers = [];
    
    // Insert customers and their first orders for each product type
    const productTypes = ['深睡寶寶', '天皇丸', '皇后丸'];
    let customerCounter = 1;
    
    for (const productType of productTypes) {
      console.log(`\nProcessing ${productType} customers and orders...`);
      
      // Insert 3 customers of this product type
      for (let i = 1; i <= 3; i++) {
        const customerId = customerCounter++;
        const shopifyCustomerId = `cust_jan_${productType}_${timestamp}_${customerId}`;
        const email = `customer_${timestamp}_${customerId}@example.com`;
        const firstName = productType.substring(0, 1);
        const lastName = `Customer ${customerId}`;
        const createdAt = new Date(`2025-01-${5 + customerId}T10:00:00Z`).toISOString();
        
        console.log(`Creating customer ${customerId} (${productType})...`);
        
        // Create customer
        const { data: customerData, error: customerError } = await supabase.rpc('insert_test_customer', {
          p_shopify_customer_id: shopifyCustomerId,
          p_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_total_spent: 100 * customerId,
          p_orders_count: customerId % 2 === 0 ? 2 : 1,
          p_created_at: createdAt,
          p_updated_at: createdAt
        });
        
        if (customerError) {
          console.error(`Error creating ${productType} customer ${customerId}:`, customerError);
          return;
        }
        
        if (!customerData || customerData.length === 0) {
          console.error(`No customer data returned for ${productType} customer ${customerId}`);
          return;
        }
        
        const customer = customerData[0];
        testCustomers.push(customer);
        
        // Create first order for this customer
        const orderNum = 1000 + customerId;
        
        console.log(`Creating first order for customer ${customerId}...`);
        
        const { data: orderData, error: orderError } = await supabase.rpc('insert_test_order', {
          p_shopify_order_id: `order_first_${timestamp}_${orderNum}`,
          p_customer_id: customer.id,
          p_shopify_customer_id: shopifyCustomerId,
          p_order_number: `#${orderNum}`,
          p_total_price: 100 + Math.floor(Math.random() * 100),
          p_processed_at: createdAt,
          p_updated_at: createdAt
        });
        
        if (orderError) {
          console.error(`Error creating first order for customer ${customerId}:`, orderError);
          console.error('Error details:', orderError);
          return;
        }
        
        if (!orderData || orderData.length === 0) {
          console.error(`No order data returned for customer ${customerId}'s first order`);
          return;
        }
        
        const order = orderData[0];
        
        // Create line item for this order
        console.log(`Creating line item for order ${orderNum}...`);
        
        const { data: lineItemData, error: lineItemError } = await supabase.rpc('insert_test_line_item', {
          p_order_id: order.id,
          p_shopify_order_id: order.shopify_order_id,
          p_product_id: `prod_${productType}_${timestamp}_${customerId}`,
          p_variant_id: `var_${timestamp}_${customerId}`,
          p_title: `${productType} Product`,
          p_quantity: 1,
          p_price: order.total_price,
          p_sku: `SKU${timestamp}_${customerId}`,
          p_product_type: productType,
          p_vendor: 'PAKA',
          p_updated_at: createdAt
        });
        
        if (lineItemError) {
          console.error(`Error creating line item for order ${orderNum}:`, lineItemError);
          return;
        }
        
        // Create second order for every other customer
        if (customerId % 2 === 0) {
          // Second order date is 2 months after first order
          const secondOrderDate = new Date(createdAt);
          secondOrderDate.setMonth(secondOrderDate.getMonth() + 2);
          const secondOrderDateStr = secondOrderDate.toISOString();
          const secondOrderNum = 2000 + customerId;
          
          console.log(`Creating second order for customer ${customerId}...`);
          
          const { data: secondOrderData, error: secondOrderError } = await supabase.rpc('insert_test_order', {
            p_shopify_order_id: `order_second_${timestamp}_${secondOrderNum}`,
            p_customer_id: customer.id,
            p_shopify_customer_id: shopifyCustomerId,
            p_order_number: `#${secondOrderNum}`,
            p_total_price: 150 + Math.floor(Math.random() * 100),
            p_processed_at: secondOrderDateStr,
            p_updated_at: secondOrderDateStr
          });
          
          if (secondOrderError) {
            console.error(`Error creating second order for customer ${customerId}:`, secondOrderError);
            return;
          }
          
          if (!secondOrderData || secondOrderData.length === 0) {
            console.error(`No order data returned for customer ${customerId}'s second order`);
            return;
          }
          
          const secondOrder = secondOrderData[0];
          
          // Create line item for second order
          console.log(`Creating line item for second order ${secondOrderNum}...`);
          
          const { data: secondLineItemData, error: secondLineItemError } = await supabase.rpc('insert_test_line_item', {
            p_order_id: secondOrder.id,
            p_shopify_order_id: secondOrder.shopify_order_id,
            p_product_id: `prod_${productType}_${timestamp}_${customerId}_2`,
            p_variant_id: `var_${timestamp}_${customerId}_2`,
            p_title: `${productType} Product`,
            p_quantity: 1,
            p_price: secondOrder.total_price,
            p_sku: `SKU${timestamp}_${customerId}_2`,
            p_product_type: productType,
            p_vendor: 'PAKA',
            p_updated_at: secondOrderDateStr
          });
          
          if (secondLineItemError) {
            console.error(`Error creating line item for second order ${secondOrderNum}:`, secondLineItemError);
            return;
          }
    console.log(`\nCreated ${testCustomers.length} test customers with orders.`);
    
    // Step 6: Classify customers
    console.log('\nStep 6: Classifying customers...');
    const { data: classifyResult, error: classifyError } = await supabase.rpc('classify_new_customers');
    
    if (classifyError) {
      console.error('Error classifying customers:', classifyError);
      return;
    }
    
    console.log('Classification complete:', classifyResult);
    
    // Step 7: Refresh materialized views
    console.log('\nStep 7: Refreshing materialized views...');
    const { data: refreshResult, error: refreshError } = await supabase.rpc('refresh_all_materialized_views');
    
    if (refreshError) {
      console.error('Error refreshing materialized views:', refreshError);
      return;
    }
    
    console.log('Materialized views refreshed:', refreshResult);
    
    // Step 8: Get cohort heatmap data
    console.log('\nStep 8: Getting cohort heatmap data...');
    
    // Get ALL cohort heatmap
    const { data: allHeatmap, error: allHeatmapError } = await supabase.rpc('get_test_cohort_heatmap');
    
    if (allHeatmapError) {
      console.error('Error getting ALL cohort heatmap:', allHeatmapError);
    } else {
      console.log('\nALL Cohort Heatmap:');
      printCohortSummary(allHeatmap);
    }
    
    // Get 深睡寶寶 cohort heatmap
    const { data: ssHeatmap, error: ssHeatmapError } = await supabase.rpc('get_test_cohort_heatmap_by_product', { 
      p_product_cohort: '深睡寶寶' 
    });
    
    if (ssHeatmapError) {
      console.error('Error getting 深睡寶寶 cohort heatmap:', ssHeatmapError);
    } else {
      console.log('\n深睡寶寶 Cohort Heatmap:');
      printCohortSummary(ssHeatmap);
    }
    
    // Get 天皇丸 cohort heatmap
    const { data: twHeatmap, error: twHeatmapError } = await supabase.rpc('get_test_cohort_heatmap_by_product', { 
      p_product_cohort: '天皇丸' 
    });
    
    if (twHeatmapError) {
      console.error('Error getting 天皇丸 cohort heatmap:', twHeatmapError);
    } else {
      console.log('\n天皇丸 Cohort Heatmap:');
      printCohortSummary(twHeatmap);
    }
    
    // Get 皇后丸 cohort heatmap
    const { data: hhHeatmap, error: hhHeatmapError } = await supabase.rpc('get_test_cohort_heatmap_by_product', { 
      p_product_cohort: '皇后丸' 
    });
    
    if (hhHeatmapError) {
      console.error('Error getting 皇后丸 cohort heatmap:', hhHeatmapError);
    } else {
      console.log('\n皇后丸 Cohort Heatmap:');
      printCohortSummary(hhHeatmap);
    }
    
    console.log('\nJanuary 2025 test data insertion completed successfully!');
  } catch (error) {
    console.error('Unexpected error:', error);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
    }
  }
}

// Helper function to clear existing test data
async function clearExistingData() {
  try {
    // Use RPC functions to clear data from production schema
    console.log('Attempting to clear existing data via RPC...');
    
    // Try to use RPC functions if they exist
    try {
      // Delete line items first
      const { data: lineItemsResult, error: lineItemsError } = await supabase.rpc('clear_test_line_items');
      if (lineItemsError) {
        console.log('RPC function clear_test_line_items not available:', lineItemsError.message);
      } else {
        console.log('Cleared line items via RPC');
      }
      
      // Then delete orders
      const { data: ordersResult, error: ordersError } = await supabase.rpc('clear_test_orders');
      if (ordersError) {
        console.log('RPC function clear_test_orders not available:', ordersError.message);
      } else {
        console.log('Cleared orders via RPC');
      }
      
      // Finally delete customers
      const { data: customersResult, error: customersError } = await supabase.rpc('clear_test_customers');
      if (customersError) {
        console.log('RPC function clear_test_customers not available:', customersError.message);
      } else {
        console.log('Cleared customers via RPC');
      }
    } catch (rpcError) {
      console.log('Error using RPC functions:', rpcError.message);
    }
    
    // Since we're using RPC functions for everything else, we'll skip direct table access
    // as it would require schema qualification which the Supabase client doesn't handle well
    
    return true;
  } catch (error) {
    console.error('Error in clearExistingData:', error);
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
    if (!cohortsByMonth[row.cohort_month]) {
      cohortsByMonth[row.cohort_month] = {
        cohort_size: row.cohort_size || 0,
        second_orders: 0
      };
    }
    cohortsByMonth[row.cohort_month].second_orders += (row.second_orders || 0);
  });
  
  // Print summary
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
}

// Run the main function
main();
