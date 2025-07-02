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
    console.log('Starting RPC-based data sync test...');
    
    // Step 1: Insert mock customers for January 2025
    console.log('Inserting mock customers for January 2025...');
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
    
    const { data: insertedCustomers, error: customersError } = await supabase
      .rpc('insert_customers', { data_json: customersToInsert });
    
    if (customersError) {
      console.error('Error inserting customers:', customersError);
      if (customersError.code) {
        console.error('Error code:', customersError.code);
        console.error('Error message:', customersError.message);
        console.error('Error details:', customersError.details);
      }
      return;
    }
    
    console.log(`Inserted ${insertedCustomers ? insertedCustomers.length : 0} customers.`);
    
    // Step 2: Get inserted customers to link orders
    console.log('Querying customers to link orders...');
    const { data: customers, error: customersQueryError } = await supabase
      .rpc('test_customers');
    
    if (customersQueryError) {
      console.error('Error querying customers:', customersQueryError);
      return;
    }
    
    if (!customers || customers.length === 0) {
      console.log('No customers found to link orders.');
      return;
    }
    
    console.log(`Found ${customers.length} customers to link orders.`);
    
    // Step 3: Insert first orders (January 2025)
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
    
    const { data: insertedFirstOrders, error: firstOrdersError } = await supabase
      .rpc('insert_orders', { data_json: firstOrders });
    
    if (firstOrdersError) {
      console.error('Error inserting first orders:', firstOrdersError);
      return;
    }
    
    console.log(`Inserted ${insertedFirstOrders ? insertedFirstOrders.length : 0} first orders.`);
    
    // Step 4: Insert line items for first orders
    console.log('Inserting line items for first orders...');
    const firstOrderLineItems = [];
    
    insertedFirstOrders.forEach((order, index) => {
      const productType = index % 3 === 0 ? '深睡寶寶' : (index % 3 === 1 ? '天皇丸' : '皇后丸');
      
      firstOrderLineItems.push({
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
    
    const { data: insertedFirstLineItems, error: firstLineItemsError } = await supabase
      .rpc('insert_order_line_items', { data_json: firstOrderLineItems });
    
    if (firstLineItemsError) {
      console.error('Error inserting first line items:', firstLineItemsError);
      return;
    }
    
    console.log(`Inserted ${insertedFirstLineItems ? insertedFirstLineItems.length : 0} first order line items.`);
    
    // Step 5: Insert second orders (March 2025)
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
    
    const { data: insertedSecondOrders, error: secondOrdersError } = await supabase
      .rpc('insert_orders', { data_json: secondOrders });
    
    if (secondOrdersError) {
      console.error('Error inserting second orders:', secondOrdersError);
      return;
    }
    
    console.log(`Inserted ${insertedSecondOrders ? insertedSecondOrders.length : 0} second orders.`);
    
    // Step 6: Insert line items for second orders
    console.log('Inserting line items for second orders...');
    const secondOrderLineItems = [];
    
    insertedSecondOrders.forEach((order, index) => {
      const productType = index % 3 === 0 ? '深睡寶寶' : (index % 3 === 1 ? '天皇丸' : '皇后丸');
      
      secondOrderLineItems.push({
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
    
    const { data: insertedSecondLineItems, error: secondLineItemsError } = await supabase
      .rpc('insert_order_line_items', { data_json: secondOrderLineItems });
    
    if (secondLineItemsError) {
      console.error('Error inserting second line items:', secondLineItemsError);
      return;
    }
    
    console.log(`Inserted ${insertedSecondLineItems ? insertedSecondLineItems.length : 0} second order line items.`);
    
    // Step 7: Classify customers by product cohort
    console.log('Classifying customers by product cohort...');
    const { data: classifyResult, error: classifyError } = await supabase
      .rpc('classify_customers');
    
    if (classifyError) {
      console.error('Error classifying customers:', classifyError);
      return;
    }
    
    console.log(`Classified ${classifyResult} customers.`);
    
    // Step 8: Refresh materialized views
    console.log('Refreshing materialized views...');
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_materialized_views');
    
    if (refreshError) {
      console.error('Error refreshing views:', refreshError);
      return;
    }
    
    console.log(`Refreshed ${refreshResult} materialized views.`);
    
    // Step 9: Query cohort heatmap data
    console.log('Querying cohort heatmap data...');
    const { data: cohortData, error: cohortError } = await supabase
      .rpc('get_cohort_heatmap');
    
    if (cohortError) {
      console.error('Error querying cohort heatmap:', cohortError);
      return;
    }
    
    console.log('Cohort heatmap data:');
    console.log(JSON.stringify(cohortData, null, 2));
    
    // Step 10: Query cohort sizes
    console.log('Querying cohort sizes...');
    const { data: sizeData, error: sizeError } = await supabase
      .rpc('get_cohort_sizes');
    
    if (sizeError) {
      console.error('Error querying cohort sizes:', sizeError);
      return;
    }
    
    console.log('Cohort sizes:');
    console.log(JSON.stringify(sizeData, null, 2));
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error in test:', error);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
    }
  }
}

// Run the main function
main();
