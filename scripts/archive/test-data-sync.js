// Test script for data sync and cohort analysis
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to insert data using RPC
async function insertData(tableName, data) {
  const { data: result, error } = await supabase.rpc(
    `insert_${tableName}`,
    { data_json: data }
  );
  
  if (error) throw error;
  return result;
}

async function main() {
  try {
    console.log('Starting data sync test...');

    // Step 1: Insert mock data for January 2025
    console.log('Inserting mock data for January 2025...');
    
    // Insert customers for different product cohorts
    const customersToInsert = [
      // 深睡寶寶 cohort (32 customers)
      ...Array(32).fill().map((_, i) => ({
        shopify_customer_id: `cust_ss_jan_${i + 1}`,
        email: `customer_ss_${i + 1}@example.com`,
        first_name: 'Customer',
        last_name: `SS ${i + 1}`,
        total_spent: 0,
        orders_count: 0,
        created_at: new Date('2025-01-15T00:00:00Z'),
        updated_at: new Date('2025-01-15T00:00:00Z')
      })),
      
      // 天皇丸 cohort (42 customers)
      ...Array(42).fill().map((_, i) => ({
        shopify_customer_id: `cust_tw_jan_${i + 1}`,
        email: `customer_tw_${i + 1}@example.com`,
        first_name: 'Customer',
        last_name: `TW ${i + 1}`,
        total_spent: 0,
        orders_count: 0,
        created_at: new Date('2025-01-15T00:00:00Z'),
        updated_at: new Date('2025-01-15T00:00:00Z')
      })),
      
      // 皇后丸 cohort (68 customers)
      ...Array(68).fill().map((_, i) => ({
        shopify_customer_id: `cust_hh_jan_${i + 1}`,
        email: `customer_hh_${i + 1}@example.com`,
        first_name: 'Customer',
        last_name: `HH ${i + 1}`,
        total_spent: 0,
        orders_count: 0,
        created_at: new Date('2025-01-15T00:00:00Z'),
        updated_at: new Date('2025-01-15T00:00:00Z')
      })),
      
      // Other cohort (5 customers)
      ...Array(5).fill().map((_, i) => ({
        shopify_customer_id: `cust_other_jan_${i + 1}`,
        email: `customer_other_${i + 1}@example.com`,
        first_name: 'Customer',
        last_name: `Other ${i + 1}`,
        total_spent: 0,
        orders_count: 0,
        created_at: new Date('2025-01-15T00:00:00Z'),
        updated_at: new Date('2025-01-15T00:00:00Z')
      }))
    ];
    
    console.log('Inserting customers into production schema...');
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .insert(customersToInsert)
      .select();
    
    if (customersError) throw customersError;
    console.log(`Inserted ${customersData.length} customers`);
    
    // Get all customers to link orders to them
    console.log('Querying customers to link orders...');
    const { data: customers, error: customersQueryError } = await supabase
      .from('customers')
      .select('id, shopify_customer_id')
      .like('shopify_customer_id', 'cust_%_jan_%');
    
    if (customersQueryError) throw customersQueryError;
    
    // Insert first orders for all customers
    const firstOrders = customers.map(customer => ({
      shopify_order_id: `order_first_${customer.shopify_customer_id}`,
      customer_id: customer.id,
      shopify_customer_id: customer.shopify_customer_id,
      order_number: `#${Math.floor(100000 + Math.random() * 900000)}`,
      total_price: Math.floor(500 + Math.random() * 1500),
      processed_at: new Date('2025-01-15T00:00:00Z'),
      updated_at: new Date('2025-01-15T00:00:00Z')
    }));
    
    console.log('Inserting first orders...');
    const { data: firstOrdersData, error: firstOrdersError } = await supabase
      .from('orders')
      .insert(firstOrders)
      .select();
    
    if (firstOrdersError) throw firstOrdersError;
    console.log(`Inserted ${firstOrdersData.length} first orders`);
    
    // Insert second orders for some customers
    // 17 second orders for 深睡寶寶 cohort
    const ssCustomers = customers.filter(c => c.shopify_customer_id.includes('cust_ss_jan_')).slice(0, 17);
    // 15 second orders for 天皇丸 cohort
    const twCustomers = customers.filter(c => c.shopify_customer_id.includes('cust_tw_jan_')).slice(0, 15);
    // 33 second orders for 皇后丸 cohort
    const hhCustomers = customers.filter(c => c.shopify_customer_id.includes('cust_hh_jan_')).slice(0, 33);
    
    const secondOrders = [
      ...ssCustomers.map(customer => ({
        shopify_order_id: `order_second_${customer.shopify_customer_id}`,
        customer_id: customer.id,
        shopify_customer_id: customer.shopify_customer_id,
        order_number: `#${Math.floor(100000 + Math.random() * 900000)}`,
        total_price: Math.floor(500 + Math.random() * 1500),
        processed_at: new Date('2025-01-25T00:00:00Z'),
        updated_at: new Date('2025-01-25T00:00:00Z')
      })),
      ...twCustomers.map(customer => ({
        shopify_order_id: `order_second_${customer.shopify_customer_id}`,
        customer_id: customer.id,
        shopify_customer_id: customer.shopify_customer_id,
        order_number: `#${Math.floor(100000 + Math.random() * 900000)}`,
        total_price: Math.floor(500 + Math.random() * 1500),
        processed_at: new Date('2025-01-25T00:00:00Z'),
        updated_at: new Date('2025-01-25T00:00:00Z')
      })),
      ...hhCustomers.map(customer => ({
        shopify_order_id: `order_second_${customer.shopify_customer_id}`,
        customer_id: customer.id,
        shopify_customer_id: customer.shopify_customer_id,
        order_number: `#${Math.floor(100000 + Math.random() * 900000)}`,
        total_price: Math.floor(500 + Math.random() * 1500),
        processed_at: new Date('2025-01-25T00:00:00Z'),
        updated_at: new Date('2025-01-25T00:00:00Z')
      }))
    ];
    
    console.log('Inserting second orders...');
    const { data: secondOrdersData, error: secondOrdersError } = await supabase
      .from('orders')
      .insert(secondOrders)
      .select();
    
    if (secondOrdersError) throw secondOrdersError;
    console.log(`Inserted ${secondOrdersData.length} second orders`);
    
    // Get all orders to link line items to them
    const { data: orders, error: ordersQueryError } = await supabase
      .from('orders')
      .select('id, shopify_order_id, shopify_customer_id');
    
    if (ordersQueryError) throw ordersQueryError;
    
    // Insert line items for all orders
    const lineItems = orders.map(order => {
      // Determine product type based on customer ID
      let productTitle = 'Other Product';
      
      if (order.shopify_customer_id.includes('cust_ss_jan_')) {
        productTitle = '深睡寶寶';
      } else if (order.shopify_customer_id.includes('cust_tw_jan_')) {
        productTitle = '天皇丸';
      } else if (order.shopify_customer_id.includes('cust_hh_jan_')) {
        productTitle = '皇后丸';
      }
      
      return {
        order_id: order.id,
        shopify_order_id: order.shopify_order_id,
        product_id: `prod_${productTitle}_${Math.floor(1000 + Math.random() * 9000)}`,
        variant_id: `var_${Math.floor(1000 + Math.random() * 9000)}`,
        title: productTitle,
        quantity: Math.floor(1 + Math.random() * 3),
        price: Math.floor(300 + Math.random() * 700),
        sku: `SKU-${productTitle}-${Math.floor(100 + Math.random() * 900)}`,
        product_type: 'Supplement',
        vendor: 'PAKA Wellness',
        updated_at: new Date('2025-01-15T00:00:00Z')
      };
    });
    
    console.log('Inserting line items...');
    const { data: lineItemsData, error: lineItemsError } = await supabase
      .from('order_line_items')
      .insert(lineItems)
      .select();
    
    if (lineItemsError) throw lineItemsError;
    console.log(`Inserted ${lineItemsData.length} line items`);
    
    // Step 2: Classify customers
    console.log('Classifying customers...');
    const { data: classifyResult, error: classifyError } = await supabase.rpc(
      'classify_new_customers'
    );
    
    if (classifyError) throw classifyError;
    console.log(`Classified ${classifyResult} customers`);
    
    // Step 3: Refresh materialized views
    console.log('Refreshing materialized views...');
    const { data: refreshResult, error: refreshError } = await supabase.rpc(
      'refresh_all_materialized_views'
    );
    
    if (refreshError) throw refreshError;
    console.log(`Refreshed ${refreshResult} materialized views`);
    
    // Step 4: Query cohort data to verify
    console.log('Querying cohort data to verify...');
    
    // Query for all products (ALL cohort)
    const { data: allCohortData, error: allCohortError } = await supabase
      .from('cohort_heatmap')
      .select('*');
    
    if (allCohortError) throw allCohortError;
    
    // Query for 深睡寶寶 cohort
    const { data: ssCohortData, error: ssCohortError } = await supabase
      .from('cohort_heatmap')
      .select('*')
      .eq('primary_product_cohort', '深睡寶寶');
    
    if (ssCohortError) throw ssCohortError;
    
    // Query for 天皇丸 cohort
    const { data: twCohortData, error: twCohortError } = await supabase
      .from('cohort_heatmap')
      .select('*')
      .eq('primary_product_cohort', '天皇丸');
    
    if (twCohortError) throw twCohortError;
    
    // Query for 皇后丸 cohort
    const { data: hhCohortData, error: hhCohortError } = await supabase
      .from('cohort_heatmap')
      .select('*')
      .eq('primary_product_cohort', '皇后丸');
    
    if (hhCohortError) throw hhCohortError;
    
    // Print results
    console.log('\n=== ALL COHORT DATA ===');
    printCohortSummary(allCohortData);
    
    console.log('\n=== 深睡寶寶 COHORT DATA ===');
    printCohortSummary(ssCohortData);
    
    console.log('\n=== 天皇丸 COHORT DATA ===');
    printCohortSummary(twCohortData);
    
    console.log('\n=== 皇后丸 COHORT DATA ===');
    printCohortSummary(hhCohortData);
    
    console.log('\nData sync test completed successfully!');
  } catch (error) {
    console.error('Error in data sync test:', error);
    if (error.code) {
  }
});

// Helper function to print cohort summary
function printCohortSummary(cohortData) {
  if (!cohortData || cohortData.length === 0) {
    console.log('No data available');
    return;
  }
  
  // Calculate totals
  let totalNewCustomers = 0;
  let totalSecondOrders = 0;
  
  cohortData.forEach(row => {
    totalNewCustomers += row.cohort_size || 0;
    totalSecondOrders += row.second_orders || 0;
  });
  
  const retentionRate = totalNewCustomers > 0 ? (totalSecondOrders / totalNewCustomers * 100).toFixed(1) : '0.0';
  
  console.log(`Total: ${totalNewCustomers} new customers, ${totalSecondOrders} second orders (${retentionRate}% retention)`);
  
  // Print by cohort month
  cohortData.forEach(row => {
    const monthRetention = row.cohort_size > 0 ? (row.second_orders / row.cohort_size * 100).toFixed(1) : '0.0';
    console.log(`${row.cohort_month}: ${row.cohort_size} new customers, ${row.second_orders} second orders (${monthRetention}% retention)`);
  });
}

// Run the main function
main();
