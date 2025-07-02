// Script to insert cohort test data with fixed logic
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key for table operations (production schema)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'production'
    }
  }
);

// Initialize a separate client for RPC calls (public schema)
const rpcClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reference data from Image 4 (ALL cohort)
const referenceData = {
  '2025-01': { new: 147, second: 65, retention: 44.2 },
  '2025-02': { new: 181, second: 76, retention: 42.0 },
  '2025-03': { new: 282, second: 139, retention: 49.3 },
  '2025-04': { new: 369, second: 141, retention: 38.2 },
  '2025-05': { new: 453, second: 157, retention: 34.7 },
  '2025-06': { new: 526, second: 121, retention: 23.0 },
  'total': { new: 1958, second: 699, retention: 35.7 }
};

// Product types for cohort classification
const productTypes = ['深睡寶寶', '天皇丸', '皇后丸', 'Other'];

// Timestamp suffix for this test run
const timestamp = Date.now();

async function main() {
  try {
    console.log('Starting cohort test data insertion with fixed logic...');
    console.log('Using reference data from Image 4 (ALL cohort)');
    
    // Step 1: Clear existing test data
    console.log('\nStep 1: Clearing existing test data...');
    await clearExistingData();
    
    // Step 2: Insert customers for each cohort month (Jan-Jun 2025)
    console.log('\nStep 2: Creating test customers...');
    const customers = await createTestCustomers();
    console.log(`Created ${customers.length} test customers`);
    
    // Step 3: Create first orders for all customers
    console.log('\nStep 3: Creating first orders...');
    const firstOrders = await createFirstOrders(customers);
    console.log(`Created ${firstOrders.length} first orders`);
    
    // Step 4: Create second orders for some customers
    console.log('\nStep 4: Creating second orders...');
    const secondOrders = await createSecondOrders(customers, firstOrders);
    console.log(`Created ${secondOrders.length} second orders`);
    
    // Step 5: Classify customers based on first order product type
    console.log('\nStep 5: Classifying customers...');
    await classifyCustomers();
    
    // Step 6: Refresh materialized views
    console.log('\nStep 6: Refreshing materialized views...');
    await refreshViews();
    
    // Step 7: Get and validate cohort heatmap data
    console.log('\nStep 7: Validating cohort heatmap data...');
    const cohortData = await getCohortHeatmap();
    
    // Print summary and compare with reference data
    printCohortSummary(cohortData);
    compareWithReference(cohortData);
    
    console.log('\nCohort data insertion complete!');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Helper function to clear existing test data
async function clearExistingData() {
  try {
    console.log('Deleting test data with timestamp pattern...');
    
    // Delete order line items first (respecting foreign key constraints)
    const { error: lineItemsError } = await supabase
      .from('order_line_items')
      .delete()
      .like('sku', `%_${timestamp}%`);
    
    if (lineItemsError) {
      console.error('Error deleting line items:', lineItemsError);
    } else {
      console.log('Cleared any existing line items with matching timestamp');
    }
    
    // Then delete orders
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .like('shopify_order_id', `%_${timestamp}%`);
    
    if (ordersError) {
      console.error('Error deleting orders:', ordersError);
    } else {
      console.log('Cleared any existing orders with matching timestamp');
    }
    
    // Finally delete customers
    const { error: customersError } = await supabase
      .from('customers')
      .delete()
      .like('shopify_customer_id', `%_${timestamp}%`);
    
    if (customersError) {
      console.error('Error deleting customers:', customersError);
    } else {
      console.log('Cleared any existing customers with matching timestamp');
    }
    
    return true;
  } catch (error) {
    console.error('Error in clearExistingData:', error);
    return false;
  }
}

// Create test customers for each cohort month
async function createTestCustomers() {
  const allCustomers = [];
  
  // Process each month (Jan-Jun 2025)
  for (let month = 0; month < 6; month++) {
    const cohortMonth = `2025-${String(month + 1).padStart(2, '0')}`;
    const customerCount = referenceData[cohortMonth].new;
    
    console.log(`Creating ${customerCount} customers for cohort ${cohortMonth}...`);
    
    // Create customers for this cohort month
    for (let i = 1; i <= customerCount; i++) {
      const customerId = `${cohortMonth}_${i}_${timestamp}`;
      const shopifyCustomerId = `cust_${customerId}`;
      const email = `customer_${customerId}@example.com`;
      const firstName = `Test${month+1}`;
      const lastName = `Customer${i}`;
      
      // Customer creation date (doesn't affect cohort)
      const createdAt = new Date(Date.UTC(2025, month, Math.min(i % 28, 28), 10, 0, 0)).toISOString();
      
      // Determine if this customer will have a second order based on reference data
      const hasSecondOrder = i <= referenceData[cohortMonth].second;
      
      try {
        const { data, error } = await supabase
          .from('customers')
          .insert({
            shopify_customer_id: shopifyCustomerId,
            email: email,
            first_name: firstName,
            last_name: lastName,
            total_spent: hasSecondOrder ? 250 : 100,
            orders_count: hasSecondOrder ? 2 : 1,
            created_at: createdAt,
            updated_at: createdAt
          })
          .select();
        
        if (error) {
          console.error(`Error creating customer ${email}:`, error);
          continue;
        }
        
        if (data && data.length > 0) {
          const customer = data[0];
          customer.cohort_month = cohortMonth;
          customer.has_second_order = hasSecondOrder;
          allCustomers.push(customer);
          
          if (i % 50 === 0) {
            console.log(`Progress: Created ${i}/${customerCount} customers for ${cohortMonth}`);
          }
        }
      } catch (error) {
        console.error(`Error creating customer ${email}:`, error);
      }
    }
    
    console.log(`Completed creating ${customerCount} customers for cohort ${cohortMonth}`);
  }
  
  return allCustomers;
}

// Create first orders for all customers
async function createFirstOrders(customers) {
  const firstOrders = [];
  
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const cohortMonth = customer.cohort_month;
    
    // Extract month and year from cohort_month
    const [year, month] = cohortMonth.split('-').map(Number);
    
    // Generate a processed_at date within the cohort month
    // This is critical: cohort month is determined by first order's processed_at date
    const day = Math.min((i % 28) + 1, 28);
    const processedAt = new Date(Date.UTC(year, month - 1, day, 10, 0, 0)).toISOString();
    
    const orderId = `order1_${customer.shopify_customer_id}`;
    const orderNumber = `#${10000 + i}`;
    
    // Randomly assign a product type to this order
    const productType = productTypes[Math.floor(Math.random() * productTypes.length)];
    
    try {
      // Create the first order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          shopify_order_id: orderId,
          customer_id: customer.id,
          shopify_customer_id: customer.shopify_customer_id,
          order_number: orderNumber,
          total_price: 100 + (i % 50),
          processed_at: processedAt,
          updated_at: processedAt
        })
        .select();
      
      if (orderError) {
        console.error(`Error creating first order for ${customer.email}:`, orderError);
        continue;
      }
      
      if (orderData && orderData.length > 0) {
        const order = orderData[0];
        firstOrders.push(order);
        
        // Create order line item with the product type
        const { error: lineItemError } = await supabase
          .from('order_line_items')
          .insert({
            order_id: order.id,
            shopify_order_id: order.shopify_order_id,
            product_id: `prod_${i}_${timestamp}`,
            variant_id: `var_${i}_${timestamp}`,
            title: `${productType} Product`,
            quantity: 1,
            price: order.total_price,
            sku: `sku_${i}_${timestamp}`,
            product_type: productType,
            vendor: 'Test Vendor',
            updated_at: processedAt
          });
        
        if (lineItemError) {
          console.error(`Error creating line item for order ${orderNumber}:`, lineItemError);
        }
      }
      
      if (i % 100 === 0) {
        console.log(`Progress: Created ${i}/${customers.length} first orders`);
      }
    } catch (error) {
      console.error(`Error creating first order for ${customer.email}:`, error);
    }
  }
  
  return firstOrders;
}

// Create second orders for customers marked to have them
async function createSecondOrders(customers, firstOrders) {
  const secondOrders = [];
  
  // Filter customers who should have second orders
  const customersWithSecondOrders = customers.filter(c => c.has_second_order);
  
  console.log(`Creating second orders for ${customersWithSecondOrders.length} customers...`);
  
  for (let i = 0; i < customersWithSecondOrders.length; i++) {
    const customer = customersWithSecondOrders[i];
    
    // Find the customer's first order
    const firstOrder = firstOrders.find(o => o.customer_id === customer.id);
    if (!firstOrder) {
      console.error(`First order not found for customer ${customer.email}`);
      continue;
    }
    
    // Get first order processed date
    const firstOrderDate = new Date(firstOrder.processed_at);
    
    // Determine months since first order (0-3 months)
    // This creates a realistic distribution of second orders
    // m0: same month, m1: next month, m2: two months later, m3: three months later
    const monthsSinceFirst = Math.floor(Math.random() * 4); // 0-3
    
    // Calculate second order date
    const secondOrderDate = new Date(firstOrderDate);
    secondOrderDate.setUTCMonth(secondOrderDate.getUTCMonth() + monthsSinceFirst);
    
    // Ensure day is valid for the month
    const maxDay = new Date(secondOrderDate.getUTCFullYear(), secondOrderDate.getUTCMonth() + 1, 0).getUTCDate();
    if (secondOrderDate.getUTCDate() > maxDay) {
      secondOrderDate.setUTCDate(maxDay);
    }
    
    const processedAt = secondOrderDate.toISOString();
    const orderId = `order2_${customer.shopify_customer_id}`;
    const orderNumber = `#${20000 + i}`;
    
    try {
      // Create the second order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          shopify_order_id: orderId,
          customer_id: customer.id,
          shopify_customer_id: customer.shopify_customer_id,
          order_number: orderNumber,
          total_price: 150 + (i % 50),
          processed_at: processedAt,
          updated_at: processedAt
        })
        .select();
      
      if (orderError) {
        console.error(`Error creating second order for ${customer.email}:`, orderError);
        continue;
      }
      
      if (orderData && orderData.length > 0) {
        const order = orderData[0];
        secondOrders.push(order);
        
        // Create order line item (use same product type as first order for consistency)
        const { error: lineItemError } = await supabase
          .from('order_line_items')
          .insert({
            order_id: order.id,
            shopify_order_id: order.shopify_order_id,
            product_id: `prod2_${i}_${timestamp}`,
            variant_id: `var2_${i}_${timestamp}`,
            title: `Follow-up Product`,
            quantity: 1,
            price: order.total_price,
            sku: `sku2_${i}_${timestamp}`,
            product_type: 'Follow-up',
            vendor: 'Test Vendor',
            updated_at: processedAt
          });
        
        if (lineItemError) {
          console.error(`Error creating line item for second order ${orderNumber}:`, lineItemError);
        }
      }
      
      if (i % 50 === 0) {
        console.log(`Progress: Created ${i}/${customersWithSecondOrders.length} second orders`);
      }
    } catch (error) {
      console.error(`Error creating second order for ${customer.email}:`, error);
    }
  }
  
  return secondOrders;
}

// Classify customers based on their first order's product type
async function classifyCustomers() {
  try {
    console.log('Calling classify_new_customers() RPC function...');
    
    // Call the RPC function to classify customers
    const { data, error } = await rpcClient.rpc('classify_new_customers');
    
    if (error) {
      console.error('Error classifying customers:', error);
      return false;
    }
    
    console.log('Customer classification completed successfully');
    return true;
  } catch (error) {
    console.error('Error in classifyCustomers:', error);
    return false;
  }
}

// Refresh materialized views
async function refreshViews() {
  try {
    console.log('Calling refresh_materialized_views() RPC function...');
    
    // Call the RPC function to refresh views
    const { data, error } = await rpcClient.rpc('refresh_materialized_views');
    
    if (error) {
      console.error('Error refreshing materialized views:', error);
      return false;
    }
    
    console.log('Materialized views refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error in refreshViews:', error);
    return false;
  }
}

// Get cohort heatmap data
async function getCohortHeatmap() {
  try {
    console.log('Getting cohort heatmap data...');
    
    // Call the RPC function to get cohort heatmap data
    const { data, error } = await rpcClient.rpc('get_cohort_heatmap');
    
    if (error) {
      console.error('Error getting cohort heatmap data:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getCohortHeatmap:', error);
    return [];
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
    const month = row.cohort_month;
    if (!cohortsByMonth[month]) {
      cohortsByMonth[month] = {
        cohort_size: row.cohort_size || 0,
        second_orders: 0
      };
    }
    
    // Add second orders for this month
    if (row.months_since_first !== null) {
      cohortsByMonth[month].second_orders += (row.second_orders || 0);
    }
  });
  
  // Print summary
  console.log('\nCOHORT HEATMAP SUMMARY:');
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

// Compare inserted data with reference data
function compareWithReference(cohortData) {
  if (!cohortData || cohortData.length === 0) {
    console.log('No cohort data available for comparison.');
    return;
  }
  
  // Group by cohort month
  const cohortsByMonth = {};
  cohortData.forEach(row => {
    const month = row.cohort_month;
    if (!cohortsByMonth[month]) {
      cohortsByMonth[month] = {
        cohort_size: row.cohort_size || 0,
        second_orders: 0
      };
    }
    
    // Add second orders for this month
    if (row.months_since_first !== null) {
      cohortsByMonth[month].second_orders += (row.second_orders || 0);
    }
  });
  
  // Calculate totals
  let totalNew = 0;
  let totalSecond = 0;
  
  Object.keys(cohortsByMonth).forEach(month => {
    totalNew += cohortsByMonth[month].cohort_size;
    totalSecond += cohortsByMonth[month].second_orders;
  });
  
  // Print comparison
  console.log('\nCOMPARISON WITH REFERENCE DATA:');
  console.log('Cohort Month | Inserted New | Reference New | Inserted 2nd | Reference 2nd | Inserted % | Reference %');
  console.log('-------------|-------------|--------------|-------------|--------------|------------|------------');
  
  Object.keys(referenceData).sort().forEach(month => {
    if (month === 'total') return;
    
    const inserted = cohortsByMonth[month] || { cohort_size: 0, second_orders: 0 };
    const reference = referenceData[month];
    
    const insertedNew = inserted.cohort_size;
    const referenceNew = reference.new;
    const insertedSecond = inserted.second_orders;
    const referenceSecond = reference.second;
    
    const insertedRate = insertedNew > 0 ? (insertedSecond / insertedNew * 100).toFixed(1) : '0.0';
    const referenceRate = reference.retention.toFixed(1);
    
    console.log(`${month}      | ${insertedNew.toString().padStart(11)} | ${referenceNew.toString().padStart(12)} | ${insertedSecond.toString().padStart(11)} | ${referenceSecond.toString().padStart(12)} | ${insertedRate.padStart(10)}% | ${referenceRate.padStart(10)}%`);
  });
  
  // Print total comparison
  const insertedTotalRate = totalNew > 0 ? (totalSecond / totalNew * 100).toFixed(1) : '0.0';
  const referenceTotalRate = referenceData.total.retention.toFixed(1);
  
  console.log('-------------|-------------|--------------|-------------|--------------|------------|------------');
  console.log(`Total        | ${totalNew.toString().padStart(11)} | ${referenceData.total.new.toString().padStart(12)} | ${totalSecond.toString().padStart(11)} | ${referenceData.total.second.toString().padStart(12)} | ${insertedTotalRate.padStart(10)}% | ${referenceTotalRate.padStart(10)}%`);
}

// Run the main function
main();
