// RPC-based test script for data sync and cohort analysis
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Starting RPC-based test...');
    
    // Step 1: Insert test customers
    console.log('\nStep 1: Inserting test customers...');
    
    // Customer 1 - 深睡寶寶 product
    const { data: customer1, error: error1 } = await supabase
      .rpc('insert_test_customer', {
        p_shopify_customer_id: 'cust_1_jan_ss',
        p_email: 'customer1@example.com',
        p_first_name: 'Customer',
        p_last_name: '1',
        p_total_spent: 500,
        p_orders_count: 2,
        p_created_at: '2025-01-05T08:00:00Z',
        p_updated_at: '2025-01-05T08:00:00Z'
      });
    
    if (error1) {
      console.error('Error inserting customer 1:', error1);
      return;
    }
    
    // Customer 2 - 深睡寶寶 product
    const { data: customer2, error: error2 } = await supabase
      .rpc('insert_test_customer', {
        p_shopify_customer_id: 'cust_2_jan_ss',
        p_email: 'customer2@example.com',
        p_first_name: 'Customer',
        p_last_name: '2',
        p_total_spent: 300,
        p_orders_count: 1,
        p_created_at: '2025-01-10T10:00:00Z',
        p_updated_at: '2025-01-10T10:00:00Z'
      });
    
    if (error2) {
      console.error('Error inserting customer 2:', error2);
      return;
    }
    
    // Customer 3 - 天皇丸 product
    const { data: customer3, error: error3 } = await supabase
      .rpc('insert_test_customer', {
        p_shopify_customer_id: 'cust_3_jan_tw',
        p_email: 'customer3@example.com',
        p_first_name: 'Customer',
        p_last_name: '3',
        p_total_spent: 800,
        p_orders_count: 2,
        p_created_at: '2025-01-15T12:00:00Z',
        p_updated_at: '2025-01-15T12:00:00Z'
      });
    
    if (error3) {
      console.error('Error inserting customer 3:', error3);
      return;
    }
    
    // Customer 4 - 皇后丸 product
    const { data: customer4, error: error4 } = await supabase
      .rpc('insert_test_customer', {
        p_shopify_customer_id: 'cust_4_jan_hh',
        p_email: 'customer4@example.com',
        p_first_name: 'Customer',
        p_last_name: '4',
        p_total_spent: 400,
        p_orders_count: 1,
        p_created_at: '2025-01-20T14:00:00Z',
        p_updated_at: '2025-01-20T14:00:00Z'
      });
    
    if (error4) {
      console.error('Error inserting customer 4:', error4);
      return;
    }
    
    console.log('Successfully inserted test customers');
    
    // Step 2: Get inserted customers
    console.log('\nStep 2: Getting inserted customers...');
    const { data: customers, error: customersError } = await supabase
      .rpc('get_test_customers');
    
    if (customersError) {
      console.error('Error getting customers:', customersError);
      return;
    }
    
    console.log(`Found ${customers.length} customers`);
    
    // Step 3: Insert first orders
    console.log('\nStep 3: Inserting first orders...');
    
    // First order for customer 1
    const { data: order1, error: orderError1 } = await supabase
      .rpc('insert_test_order', {
        p_shopify_order_id: 'order_first_1',
        p_customer_id: customers[0].id,
        p_shopify_customer_id: customers[0].shopify_customer_id,
        p_order_number: '#101',
        p_total_price: 100,
        p_processed_at: '2025-01-05T10:00:00Z',
        p_updated_at: '2025-01-05T10:00:00Z'
      });
    
    if (orderError1) {
      console.error('Error inserting first order for customer 1:', orderError1);
      return;
    }
    
    // First order for customer 2
    const { data: order2, error: orderError2 } = await supabase
      .rpc('insert_test_order', {
        p_shopify_order_id: 'order_first_2',
        p_customer_id: customers[1].id,
        p_shopify_customer_id: customers[1].shopify_customer_id,
        p_order_number: '#102',
        p_total_price: 150,
        p_processed_at: '2025-01-10T10:00:00Z',
        p_updated_at: '2025-01-10T10:00:00Z'
      });
    
    if (orderError2) {
      console.error('Error inserting first order for customer 2:', orderError2);
      return;
    }
    
    // First order for customer 3
    const { data: order3, error: orderError3 } = await supabase
      .rpc('insert_test_order', {
        p_shopify_order_id: 'order_first_3',
        p_customer_id: customers[2].id,
        p_shopify_customer_id: customers[2].shopify_customer_id,
        p_order_number: '#103',
        p_total_price: 200,
        p_processed_at: '2025-01-15T10:00:00Z',
        p_updated_at: '2025-01-15T10:00:00Z'
      });
    
    if (orderError3) {
      console.error('Error inserting first order for customer 3:', orderError3);
      return;
    }
    
    // First order for customer 4
    const { data: order4, error: orderError4 } = await supabase
      .rpc('insert_test_order', {
        p_shopify_order_id: 'order_first_4',
        p_customer_id: customers[3].id,
        p_shopify_customer_id: customers[3].shopify_customer_id,
        p_order_number: '#104',
        p_total_price: 250,
        p_processed_at: '2025-01-20T10:00:00Z',
        p_updated_at: '2025-01-20T10:00:00Z'
      });
    
    if (orderError4) {
      console.error('Error inserting first order for customer 4:', orderError4);
      return;
    }
    
    console.log('Successfully inserted first orders');
    
    // Step 4: Insert second orders for customers 1 and 3
    console.log('\nStep 4: Inserting second orders...');
    
    // Second order for customer 1
    const { data: secondOrder1, error: secondOrderError1 } = await supabase
      .rpc('insert_test_order', {
        p_shopify_order_id: 'order_second_1',
        p_customer_id: customers[0].id,
        p_shopify_customer_id: customers[0].shopify_customer_id,
        p_order_number: '#201',
        p_total_price: 150,
        p_processed_at: '2025-03-10T14:00:00Z',
        p_updated_at: '2025-03-10T14:00:00Z'
      });
    
    if (secondOrderError1) {
      console.error('Error inserting second order for customer 1:', secondOrderError1);
      return;
    }
    
    // Second order for customer 3
    const { data: secondOrder3, error: secondOrderError3 } = await supabase
      .rpc('insert_test_order', {
        p_shopify_order_id: 'order_second_3',
        p_customer_id: customers[2].id,
        p_shopify_customer_id: customers[2].shopify_customer_id,
        p_order_number: '#203',
        p_total_price: 250,
        p_processed_at: '2025-03-20T14:00:00Z',
        p_updated_at: '2025-03-20T14:00:00Z'
      });
    
    if (secondOrderError3) {
      console.error('Error inserting second order for customer 3:', secondOrderError3);
      return;
    }
    
    console.log('Successfully inserted second orders');
    
    // Step 5: Get all orders
    console.log('\nStep 5: Getting all orders...');
    const { data: orders, error: ordersError } = await supabase
      .rpc('get_test_orders');
    
    if (ordersError) {
      console.error('Error getting orders:', ordersError);
      return;
    }
    
    console.log(`Found ${orders.length} orders`);
    
    // Step 6: Insert line items for first orders
    console.log('\nStep 6: Inserting line items for first orders...');
    
    // Line item for order 1 - 深睡寶寶 product
    const { data: lineItem1, error: lineItemError1 } = await supabase
      .rpc('insert_test_line_item', {
        p_order_id: orders[0].id,
        p_shopify_order_id: orders[0].shopify_order_id,
        p_product_id: 'prod_ss_1',
        p_variant_id: 'var_1',
        p_title: '深睡寶寶 Product',
        p_quantity: 1,
        p_price: 100,
        p_sku: 'SKU1',
        p_product_type: '深睡寶寶',
        p_vendor: 'PAKA',
        p_updated_at: orders[0].processed_at
      });
    
    if (lineItemError1) {
      console.error('Error inserting line item for order 1:', lineItemError1);
      return;
    }
    
    // Line item for order 2 - 深睡寶寶 product
    const { data: lineItem2, error: lineItemError2 } = await supabase
      .rpc('insert_test_line_item', {
        p_order_id: orders[1].id,
        p_shopify_order_id: orders[1].shopify_order_id,
        p_product_id: 'prod_ss_2',
        p_variant_id: 'var_2',
        p_title: '深睡寶寶 Product',
        p_quantity: 1,
        p_price: 150,
        p_sku: 'SKU2',
        p_product_type: '深睡寶寶',
        p_vendor: 'PAKA',
        p_updated_at: orders[1].processed_at
      });
    
    if (lineItemError2) {
      console.error('Error inserting line item for order 2:', lineItemError2);
      return;
    }
    
    // Line item for order 3 - 天皇丸 product
    const { data: lineItem3, error: lineItemError3 } = await supabase
      .rpc('insert_test_line_item', {
        p_order_id: orders[2].id,
        p_shopify_order_id: orders[2].shopify_order_id,
        p_product_id: 'prod_tw_3',
        p_variant_id: 'var_3',
        p_title: '天皇丸 Product',
        p_quantity: 1,
        p_price: 200,
        p_sku: 'SKU3',
        p_product_type: '天皇丸',
        p_vendor: 'PAKA',
        p_updated_at: orders[2].processed_at
      });
    
    if (lineItemError3) {
      console.error('Error inserting line item for order 3:', lineItemError3);
      return;
    }
    
    // Line item for order 4 - 皇后丸 product
    const { data: lineItem4, error: lineItemError4 } = await supabase
      .rpc('insert_test_line_item', {
        p_order_id: orders[3].id,
        p_shopify_order_id: orders[3].shopify_order_id,
        p_product_id: 'prod_hh_4',
        p_variant_id: 'var_4',
        p_title: '皇后丸 Product',
        p_quantity: 1,
        p_price: 250,
        p_sku: 'SKU4',
        p_product_type: '皇后丸',
        p_vendor: 'PAKA',
        p_updated_at: orders[3].processed_at
      });
    
    if (lineItemError4) {
      console.error('Error inserting line item for order 4:', lineItemError4);
      return;
    }
    
    // Step 7: Insert line items for second orders
    console.log('\nStep 7: Inserting line items for second orders...');
    
    // Line item for second order 1 - 深睡寶寶 product
    const { data: secondLineItem1, error: secondLineItemError1 } = await supabase
      .rpc('insert_test_line_item', {
        p_order_id: orders[4].id,
        p_shopify_order_id: orders[4].shopify_order_id,
        p_product_id: 'prod_ss_5',
        p_variant_id: 'var_5',
        p_title: '深睡寶寶 Product',
        p_quantity: 1,
        p_price: 150,
        p_sku: 'SKU5',
        p_product_type: '深睡寶寶',
        p_vendor: 'PAKA',
        p_updated_at: orders[4].processed_at
      });
    
    if (secondLineItemError1) {
      console.error('Error inserting line item for second order 1:', secondLineItemError1);
      return;
    }
    
    // Line item for second order 3 - 天皇丸 product
    const { data: secondLineItem3, error: secondLineItemError3 } = await supabase
      .rpc('insert_test_line_item', {
        p_order_id: orders[5].id,
        p_shopify_order_id: orders[5].shopify_order_id,
        p_product_id: 'prod_tw_6',
        p_variant_id: 'var_6',
        p_title: '天皇丸 Product',
        p_quantity: 1,
        p_price: 250,
        p_sku: 'SKU6',
        p_product_type: '天皇丸',
        p_vendor: 'PAKA',
        p_updated_at: orders[5].processed_at
      });
    
    if (secondLineItemError3) {
      console.error('Error inserting line item for second order 3:', secondLineItemError3);
      return;
    }
    
    console.log('Successfully inserted line items');
    
    // Step 8: Classify customers
    console.log('\nStep 8: Classifying customers...');
    const { data: classifyResult, error: classifyError } = await supabase
      .rpc('classify_new_customers');
    
    if (classifyError) {
      console.error('Error classifying customers:', classifyError);
      return;
    }
    
    console.log('Classification complete:', classifyResult);
    
    // Step 9: Refresh materialized views
    console.log('\nStep 9: Refreshing materialized views...');
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_all_materialized_views');
    
    if (refreshError) {
      console.error('Error refreshing views:', refreshError);
      return;
    }
    
    console.log('Materialized views refreshed:', refreshResult);
    
    // Step 10: Query cohort heatmap data
    console.log('\nStep 10: Querying cohort heatmap data...');
    const { data: heatmapData, error: heatmapError } = await supabase
      .rpc('get_test_cohort_heatmap');
    
    if (heatmapError) {
      console.error('Error querying cohort heatmap:', heatmapError);
      return;
    }
    
    console.log('Cohort heatmap data:');
    printCohortSummary(heatmapData);
    
    // Step 11: Query cohort heatmap data by product
    console.log('\nStep 11: Querying cohort heatmap data by product...');
    
    // 深睡寶寶 product cohort
    const { data: ssHeatmapData, error: ssHeatmapError } = await supabase
      .rpc('get_test_cohort_heatmap_by_product', { p_product_cohort: '深睡寶寶' });
    
    if (ssHeatmapError) {
      console.error('Error querying 深睡寶寶 cohort heatmap:', ssHeatmapError);
    } else {
      console.log('\n深睡寶寶 Cohort Heatmap:');
      printCohortSummary(ssHeatmapData);
    }
    
    // 天皇丸 product cohort
    const { data: twHeatmapData, error: twHeatmapError } = await supabase
      .rpc('get_test_cohort_heatmap_by_product', { p_product_cohort: '天皇丸' });
    
    if (twHeatmapError) {
      console.error('Error querying 天皇丸 cohort heatmap:', twHeatmapError);
    } else {
      console.log('\n天皇丸 Cohort Heatmap:');
      printCohortSummary(twHeatmapData);
    }
    
    // 皇后丸 product cohort
    const { data: hhHeatmapData, error: hhHeatmapError } = await supabase
      .rpc('get_test_cohort_heatmap_by_product', { p_product_cohort: '皇后丸' });
    
    if (hhHeatmapError) {
      console.error('Error querying 皇后丸 cohort heatmap:', hhHeatmapError);
    } else {
      console.log('\n皇后丸 Cohort Heatmap:');
      printCohortSummary(hhHeatmapData);
    }
    
    console.log('\nRPC-based test completed successfully!');
  } catch (error) {
    console.error('Unexpected error in test:', error);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
    }
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
      cohortsByMonth[row.cohort_month] = [];
    }
    cohortsByMonth[row.cohort_month].push(row);
  });
  
  // Print summary
  console.log('Cohort Month | New Customers | 2nd Orders | Retention Rate');
  console.log('-------------|--------------|------------|---------------');
  
  let totalNew = 0;
  let totalSecond = 0;
  
  Object.keys(cohortsByMonth).sort().forEach(month => {
    const cohort = cohortsByMonth[month];
    const newCustomers = cohort[0].cohort_size || 0;
    const secondOrders = cohort.reduce((sum, row) => sum + (row.second_orders || 0), 0);
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
