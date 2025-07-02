require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with schema set to 'production'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'production' }
  }
);

// Create a separate client for RPC calls (without schema setting)
const rpcClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reference data from Image 4
const referenceData = {
  '2025-01': { newCustomers: 147, secondOrders: 65, retentionRate: 44.2 },
  '2025-02': { newCustomers: 181, secondOrders: 76, retentionRate: 42.0 },
  '2025-03': { newCustomers: 282, secondOrders: 139, retentionRate: 49.3 },
  '2025-04': { newCustomers: 369, secondOrders: 141, retentionRate: 38.2 },
  '2025-05': { newCustomers: 453, secondOrders: 157, retentionRate: 34.7 },
  '2025-06': { newCustomers: 526, secondOrders: 121, retentionRate: 23.0 }
};

// Product types for distribution
const productTypes = ['深睡寶寶', '天皇丸', '皇后丸'];

// Generate a unique timestamp suffix for this run
const timestamp = Date.now();

// Function to create a customer
async function createCustomer(month, index) {
  const monthNum = parseInt(month.split('-')[1]);
  const email = `customer_${month}_${index}_${timestamp}@example.com`;
  const firstName = `Customer`;
  const lastName = `${month}-${index}`;
  
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        shopify_customer_id: `shopify_${month}_${index}_${timestamp}`,
        email,
        first_name: firstName,
        last_name: lastName,
        total_spent: 0,
        orders_count: 0,
        created_at: new Date(`${month}-15T12:00:00Z`),
        updated_at: new Date(`${month}-15T12:00:00Z`)
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating customer ${email}:`, error);
      return null;
    }

    console.log(`Customer created with ID: ${customer.id}`);
    return customer;
  } catch (error) {
    console.error(`Exception creating customer ${email}:`, error);
    return null;
  }
}

// Function to create an order
async function createOrder(customer, orderNumber, month, isSecondOrder = false) {
  // For second orders, add 1-3 months to the original month
  let orderMonth = month;
  if (isSecondOrder) {
    const monthParts = month.split('-');
    let monthNum = parseInt(monthParts[1]) + Math.floor(Math.random() * 3) + 1;
    let yearNum = parseInt(monthParts[0]);
    
    // Handle month overflow
    if (monthNum > 12) {
      monthNum -= 12;
      yearNum += 1;
    }
    
    // Format month with leading zero if needed
    const formattedMonth = monthNum.toString().padStart(2, '0');
    orderMonth = `${yearNum}-${formattedMonth}`;
  }
  
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        shopify_order_id: `shopify_order_${orderNumber}_${timestamp}`,
        customer_id: customer.id,
        shopify_customer_id: customer.shopify_customer_id,
        order_number: `#${orderNumber}`,
        total_price: Math.floor(Math.random() * 10000) / 100,
        processed_at: new Date(`${orderMonth}-${15 + Math.floor(Math.random() * 10)}T12:00:00Z`),
        updated_at: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating order #${orderNumber}:`, error);
      return null;
    }

    console.log(`Order created with ID: ${order.id}`);
    return order;
  } catch (error) {
    console.error(`Exception creating order #${orderNumber}:`, error);
    return null;
  }
}

// Function to create a line item
async function createLineItem(order, productType) {
  try {
    const { data: lineItem, error } = await supabase
      .from('order_line_items')
      .insert({
        order_id: order.id,
        shopify_order_id: order.shopify_order_id,
        product_id: `product_${Math.floor(Math.random() * 1000)}_${timestamp}`,
        variant_id: `variant_${Math.floor(Math.random() * 1000)}_${timestamp}`,
        title: `${productType} Product`,
        quantity: 1,
        price: Math.floor(Math.random() * 10000) / 100,
        sku: `SKU-${productType}-${Math.floor(Math.random() * 1000)}`,
        product_type: productType,
        vendor: 'PAKA',
        updated_at: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating line item for order ${order.id}:`, error);
      return null;
    }

    console.log(`Line item created successfully`);
    return lineItem;
  } catch (error) {
    console.error(`Exception creating line item for order ${order.id}:`, error);
    return null;
  }
}

// Function to clear existing test data
async function clearExistingTestData() {
  console.log('Attempting to clear existing test data...');
  
  try {
    // First, delete all test line items
    console.log('Deleting existing line items...');
    const { error: lineItemError } = await supabase
      .from('order_line_items')
      .delete()
      .or('shopify_order_id.like.shopify_order_%,shopify_order_id.like.%_test_%');
    
    if (lineItemError) {
      console.error('Error deleting line items:', lineItemError);
      return false;
    }
    console.log('Cleared line items successfully');

    // Then, delete all test orders
    console.log('Deleting existing orders...');
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .or('shopify_order_id.like.shopify_order_%,shopify_order_id.like.%_test_%');
    
    if (orderError) {
      console.error('Error deleting orders:', orderError);
      return false;
    }
    console.log('Cleared orders successfully');

    // Finally, delete all test customers
    console.log('Deleting existing customers...');
    const { error: customerError } = await supabase
      .from('customers')
      .delete()
      .or('email.like.customer_%@example.com,email.like.%_test_%@example.com');
    
    if (customerError) {
      console.error('Error deleting customers:', customerError);
      return false;
    }
    console.log('Cleared customers successfully');

    return true;
  } catch (error) {
    console.error('Exception clearing test data:', error);
    return false;
  }
}

// Main function to run the test data insertion
async function insertTestData() {
  console.log('Starting January-June 2025 test data insertion...');

  // Note: We're skipping the deletion step as it's done manually via SQL
  console.log('\nStep 1: Skipping deletion step (done manually via SQL)...');

  // Step 2: Create test customers and orders for each month
  console.log('\nStep 2: Creating test customers and orders...');
  
  const months = Object.keys(referenceData);
  let totalCustomersCreated = 0;
  let totalSecondOrdersCreated = 0;
  
  for (const month of months) {
    console.log(`\nProcessing ${month}...`);
    const { newCustomers, secondOrders } = referenceData[month];
    
    // Create customers for this month
    for (let i = 1; i <= newCustomers; i++) {
      // Create customer
      const customer = await createCustomer(month, i);
      if (!customer) continue;
      
      // Randomly select a product type
      const productType = productTypes[Math.floor(Math.random() * productTypes.length)];
      
      // Create first order
      const orderNumber = `${month.replace('-', '')}${i.toString().padStart(4, '0')}`;
      const firstOrder = await createOrder(customer, orderNumber, month);
      if (!firstOrder) continue;
      
      // Create line item for first order
      await createLineItem(firstOrder, productType);
      
      totalCustomersCreated++;
      
      // Determine if this customer will have a second order
      if (i <= secondOrders) {
        // Create second order (with a later date)
        const secondOrderNumber = `2${orderNumber}`;
        const secondOrder = await createOrder(customer, secondOrderNumber, month, true);
        if (!secondOrder) continue;
        
        // Create line item for second order
        await createLineItem(secondOrder, productType);
        
        totalSecondOrdersCreated++;
      }
      
      // Add some delay to avoid overwhelming the database
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  console.log(`\nCreated ${totalCustomersCreated} test customers with ${totalSecondOrdersCreated} second orders.`);

  // Step 3: Classify customers
  console.log('\nStep 3: Classifying customers...');
  try {
    const { data: classifyResult, error: classifyError } = await rpcClient.rpc('classify_new_customers');
    
    if (classifyError) {
      console.error('Error classifying customers:', classifyError);
      console.error('Full error details:', JSON.stringify(classifyError, null, 2));
    } else {
      console.log(`Customer classification completed successfully. Updated ${classifyResult} customers.`);
    }
  } catch (error) {
    console.error('Exception classifying customers:', error);
  }

  // Step 4: Refresh materialized views
  console.log('\nStep 4: Refreshing materialized views...');
  try {
    const { data: refreshResult, error: refreshError } = await rpcClient.rpc('refresh_materialized_views');
    
    if (refreshError) {
      console.error('Error refreshing materialized views:', refreshError);
      console.error('Full error details:', JSON.stringify(refreshError, null, 2));
    } else {
      console.log('Materialized views refreshed successfully.');
    }
  } catch (error) {
    console.error('Exception refreshing materialized views:', error);
  }

  // Step 5: Get cohort heatmap data
  console.log('\nStep 5: Getting cohort heatmap data...');
  
  // Get ALL cohort heatmap
  try {
    const { data: allCohortData, error: allCohortError } = await rpcClient.rpc('get_cohort_heatmap');
    
    if (allCohortError) {
      console.error('Error getting ALL cohort heatmap:', allCohortError);
      console.error('Full error details:', JSON.stringify(allCohortError, null, 2));
    } else {
      console.log('\nALL Cohort Heatmap:');
      
      // Group by cohort month and calculate totals
      const cohortSummary = {};
      let grandTotal = { newCustomers: 0, secondOrders: 0 };
      
      allCohortData.forEach(row => {
        if (!cohortSummary[row.cohort_month]) {
          cohortSummary[row.cohort_month] = {
            newCustomers: row.cohort_size,
            secondOrders: 0,
            retentionRate: 0
          };
        }
        
        if (row.month_number !== null) {
          cohortSummary[row.cohort_month].secondOrders += row.second_orders;
        }
        
        grandTotal.newCustomers += row.cohort_size;
        if (row.month_number !== null) {
          grandTotal.secondOrders += row.second_orders;
        }
      });
      
      // Calculate retention rates
      Object.keys(cohortSummary).forEach(month => {
        const { newCustomers, secondOrders } = cohortSummary[month];
        cohortSummary[month].retentionRate = (secondOrders / newCustomers * 100).toFixed(1);
      });
      
      // Calculate grand total retention rate
      grandTotal.retentionRate = (grandTotal.secondOrders / grandTotal.newCustomers * 100).toFixed(1);
      
      // Print the summary table
      console.log('Cohort Month | New Customers | 2nd Orders | Retention Rate');
      console.log('-------------|--------------|------------|---------------');
      
      Object.keys(cohortSummary).sort().forEach(month => {
        const { newCustomers, secondOrders, retentionRate } = cohortSummary[month];
        console.log(`${month}      | ${newCustomers.toString().padStart(12, ' ')} | ${secondOrders.toString().padStart(10, ' ')} | ${retentionRate.toString().padStart(12, ' ')}%`);
      });
      
      console.log('-------------|--------------|------------|---------------');
      console.log(`Total        | ${grandTotal.newCustomers.toString().padStart(12, ' ')} | ${grandTotal.secondOrders.toString().padStart(10, ' ')} | ${grandTotal.retentionRate.toString().padStart(12, ' ')}%`);
      
      // Compare with reference data
      console.log('\nComparison with Reference Data:');
      console.log('Month    | Actual New | Reference New | Actual 2nd | Reference 2nd | Actual Rate | Reference Rate');
      console.log('---------|------------|---------------|------------|---------------|-------------|---------------');
      
      let totalActualNew = 0;
      let totalReferenceNew = 0;
      let totalActual2nd = 0;
      let totalReference2nd = 0;
      
      Object.keys(referenceData).sort().forEach(month => {
        const actual = cohortSummary[month] || { newCustomers: 0, secondOrders: 0, retentionRate: '0.0' };
        const reference = referenceData[month];
        
        console.log(`${month} | ${actual.newCustomers.toString().padStart(10, ' ')} | ${reference.newCustomers.toString().padStart(13, ' ')} | ${actual.secondOrders.toString().padStart(10, ' ')} | ${reference.secondOrders.toString().padStart(13, ' ')} | ${actual.retentionRate.toString().padStart(11, ' ')}% | ${reference.retentionRate.toString().padStart(13, ' ')}%`);
        
        totalActualNew += actual.newCustomers;
        totalReferenceNew += reference.newCustomers;
        totalActual2nd += actual.secondOrders;
        totalReference2nd += reference.secondOrders;
      });
      
      const totalActualRate = totalActualNew > 0 ? (totalActual2nd / totalActualNew * 100).toFixed(1) : '0.0';
      const totalReferenceRate = (totalReference2nd / totalReferenceNew * 100).toFixed(1);
      
      console.log('---------|------------|---------------|------------|---------------|-------------|---------------');
      console.log(`Total    | ${totalActualNew.toString().padStart(10, ' ')} | ${totalReferenceNew.toString().padStart(13, ' ')} | ${totalActual2nd.toString().padStart(10, ' ')} | ${totalReference2nd.toString().padStart(13, ' ')} | ${totalActualRate.toString().padStart(11, ' ')}% | ${totalReferenceRate.toString().padStart(13, ' ')}%`);
    }
  } catch (error) {
    console.error('Exception getting ALL cohort heatmap:', error);
  }

  console.log('\nJanuary-June 2025 test data insertion completed successfully!');
}

// Run the main function
insertTestData().catch(error => {
  console.error('Fatal error:', error);
});
