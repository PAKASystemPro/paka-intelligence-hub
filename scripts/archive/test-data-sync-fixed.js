// Test script for data sync and cohort analysis
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Starting data sync test...');
    console.log('Inserting mock data for January 2025...');
    
    // Step 1: Insert customers
    console.log('Inserting customers into production schema...');
    const customersToInsert = [
      {
        shopify_customer_id: 'cust_1_jan_ss',
        email: 'customer1@example.com',
        first_name: 'Customer',
        last_name: '1',
        total_spent: 500,
        orders_count: 2,
        created_at: '2025-01-05T08:00:00Z',
        updated_at: '2025-01-05T08:00:00Z'
      },
      {
        shopify_customer_id: 'cust_2_jan_ss',
        email: 'customer2@example.com',
        first_name: 'Customer',
        last_name: '2',
        total_spent: 300,
        orders_count: 1,
        created_at: '2025-01-10T10:00:00Z',
        updated_at: '2025-01-10T10:00:00Z'
      },
      {
        shopify_customer_id: 'cust_3_jan_tw',
        email: 'customer3@example.com',
        first_name: 'Customer',
        last_name: '3',
        total_spent: 800,
        orders_count: 2,
        created_at: '2025-01-15T12:00:00Z',
        updated_at: '2025-01-15T12:00:00Z'
      },
      {
        shopify_customer_id: 'cust_4_jan_hh',
        email: 'customer4@example.com',
        first_name: 'Customer',
        last_name: '4',
        total_spent: 400,
        orders_count: 1,
        created_at: '2025-01-20T14:00:00Z',
        updated_at: '2025-01-20T14:00:00Z'
      }
    ];
    
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .insert(customersToInsert)
      .select();
    
    if (customersError) {
      throw customersError;
    }
    
    console.log(`Inserted ${customersData.length} customers.`);
    
    // Step 2: Query customers to link orders
    console.log('Querying customers to link orders...');
    const { data: customers, error: customersQueryError } = await supabase
      .from('customers')
      .select('id, shopify_customer_id')
      .like('shopify_customer_id', 'cust_%_jan_%');
    
    if (customersQueryError) {
      throw customersQueryError;
    }
    
    console.log(`Found ${customers.length} customers to link orders.`);
    
    // Step 3: Insert first orders
    console.log('Inserting first orders...');
    const firstOrders = customers.map((customer, index) => ({
      shopify_order_id: `order_first_${index + 1}`,
      customer_id: customer.id,
      shopify_customer_id: customer.shopify_customer_id,
      order_number: `#10${index + 1}`,
      total_price: 100 + (index * 50),
      processed_at: `2025-01-${5 + (index * 5)}T10:00:00Z`,
      updated_at: `2025-01-${5 + (index * 5)}T10:00:00Z`
    }));
    
    const { data: firstOrdersData, error: firstOrdersError } = await supabase
      .from('orders')
      .insert(firstOrders)
      .select();
    
    if (firstOrdersError) {
      throw firstOrdersError;
    }
    
    console.log(`Inserted ${firstOrdersData.length} first orders.`);
    
    // Step 4: Insert second orders
    console.log('Inserting second orders...');
    const secondOrders = customers.slice(0, 2).map((customer, index) => ({
      shopify_order_id: `order_second_${index + 1}`,
      customer_id: customer.id,
      shopify_customer_id: customer.shopify_customer_id,
      order_number: `#20${index + 1}`,
      total_price: 150 + (index * 50),
      processed_at: `2025-03-${10 + (index * 5)}T14:00:00Z`,
      updated_at: `2025-03-${10 + (index * 5)}T14:00:00Z`
    }));
    
    const { data: secondOrdersData, error: secondOrdersError } = await supabase
      .from('orders')
      .insert(secondOrders)
      .select();
    
    if (secondOrdersError) {
      throw secondOrdersError;
    }
    
    console.log(`Inserted ${secondOrdersData.length} second orders.`);
    
    // Step 5: Insert line items
    console.log('Inserting line items...');
    const lineItems = [];
    
    // Add line items for first orders
    firstOrdersData.forEach((order, index) => {
      const productType = index % 3 === 0 ? '深睡寶寶' : (index % 3 === 1 ? '天皇丸' : '皇后丸');
      
      lineItems.push({
        order_id: order.id,
        shopify_order_id: order.shopify_order_id,
        product_id: `prod_${productType}_${index + 1}`,
        variant_id: `var_${index + 1}`,
        title: `${productType} Product`,
        quantity: 1,
        price: 100 + (index * 50),
        sku: `SKU${index + 1}`,
        product_type: productType,
        vendor: 'PAKA',
        updated_at: order.processed_at
      });
    });
    
    // Add line items for second orders
    secondOrdersData.forEach((order, index) => {
      const productType = index % 3 === 0 ? '深睡寶寶' : (index % 3 === 1 ? '天皇丸' : '皇后丸');
      
      lineItems.push({
        order_id: order.id,
        shopify_order_id: order.shopify_order_id,
        product_id: `prod_${productType}_${index + 10}`,
        variant_id: `var_${index + 10}`,
        title: `${productType} Product`,
        quantity: 1,
        price: 150 + (index * 50),
        sku: `SKU${index + 10}`,
        product_type: productType,
        vendor: 'PAKA',
        updated_at: order.processed_at
      });
    });
    
    const { data: lineItemsData, error: lineItemsError } = await supabase
      .from('order_line_items')
      .insert(lineItems)
      .select();
    
    if (lineItemsError) {
      throw lineItemsError;
    }
    
    console.log(`Inserted ${lineItemsData.length} line items.`);
    
    // Step 6: Classify customers
    console.log('Classifying customers by product cohort...');
    const { data: classifyResult, error: classifyError } = await supabase
      .rpc('classify_new_customers');
    
    if (classifyError) {
      throw classifyError;
    }
    
    console.log('Classification complete:', classifyResult);
    
    // Step 7: Refresh materialized views
    console.log('Refreshing materialized views...');
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_all_materialized_views');
    
    if (refreshError) {
      throw refreshError;
    }
    
    console.log('Materialized views refreshed:', refreshResult);
    
    // Step 8: Query cohort heatmap data
    console.log('Querying cohort heatmap data...');
    
    // Query for all products (ALL cohort)
    const { data: allCohortData, error: allCohortError } = await supabase
      .from('cohort_heatmap')
      .select('*');
    
    if (allCohortError) {
      throw allCohortError;
    }
    
    console.log('\nALL Products Cohort Heatmap:');
    printCohortSummary(allCohortData);
    
    // Query for 深睡寶寶 cohort
    const { data: ssCohortData, error: ssCohortError } = await supabase
      .from('cohort_heatmap')
      .select('*')
      .eq('primary_product_cohort', '深睡寶寶');
    
    if (ssCohortError) {
      throw ssCohortError;
    }
    
    console.log('\n深睡寶寶 Cohort Heatmap:');
    printCohortSummary(ssCohortData);
    
    // Query for 天皇丸 cohort
    const { data: twCohortData, error: twCohortError } = await supabase
      .from('cohort_heatmap')
      .select('*')
      .eq('primary_product_cohort', '天皇丸');
    
    if (twCohortError) {
      throw twCohortError;
    }
    
    console.log('\n天皇丸 Cohort Heatmap:');
    printCohortSummary(twCohortData);
    
    // Query for 皇后丸 cohort
    const { data: hhCohortData, error: hhCohortError } = await supabase
      .from('cohort_heatmap')
      .select('*')
      .eq('primary_product_cohort', '皇后丸');
    
    if (hhCohortError) {
      throw hhCohortError;
    }
    
    console.log('\n皇后丸 Cohort Heatmap:');
    printCohortSummary(hhCohortData);
    
    console.log('\nData sync test completed successfully!');
  } catch (error) {
    console.error('Error in data sync test:', error);
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
