// Script to insert January 2025 test data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Starting January 2025 test data insertion...');
    
    // Step 1: Clear existing test data (optional)
    console.log('\nStep 1: Clearing existing test data...');
    await clearExistingData();
    
    // Generate a timestamp to make IDs unique for this test run
    const timestamp = Date.now();
    
    // Step 2: Insert test customers and their orders for each product cohort
    console.log('\nStep 2: Creating test customers and orders...');
    
    // Define product cohorts
    const productCohorts = ['深睡寶寶', '天皇丸', '皇后丸'];
    
    // Track created customers for reporting
    const createdCustomers = [];
    
    // Process each product cohort
    for (const productCohort of productCohorts) {
      console.log(`\nProcessing ${productCohort} cohort...`);
      
      // Create 3 customers per cohort
      for (let i = 1; i <= 3; i++) {
        const customerId = `${productCohort}_${i}_${timestamp}`;
        const shopifyCustomerId = `cust_${customerId}`;
        const email = `customer_${customerId}@example.com`;
        const firstName = `${productCohort.substring(0, 1)}${i}`;
        const lastName = `Customer`;
        
        // Create date in January 2025 (different day for each customer)
        const dayOffset = (productCohorts.indexOf(productCohort) * 5) + i;
        // Make sure day is valid (max 28 for January)
        const day = Math.min(5 + dayOffset, 28);
        const createdAt = new Date(Date.UTC(2025, 0, day, 10, 0, 0)).toISOString();
        
        // Determine if this customer will have a second order
        const hasSecondOrder = i % 2 === 0; // Every even-numbered customer gets a second order
        const ordersCount = hasSecondOrder ? 2 : 1;
        const totalSpent = hasSecondOrder ? 250 : 100;
        
        console.log(`Creating customer: ${firstName} ${lastName} (${email})`);
        
        // Insert customer using RPC function in public schema
        const { data: customerData, error: customerError } = await supabase.rpc('insert_test_customer', {
          p_shopify_customer_id: shopifyCustomerId,
          p_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_total_spent: totalSpent, // Corresponds to totalSpent in Shopify
          p_orders_count: ordersCount, // Corresponds to numberOfOrders in Shopify
          p_created_at: createdAt,
          p_updated_at: createdAt
        });
        
        if (customerError) {
          console.error(`Error creating customer ${firstName} ${lastName}:`, customerError);
          return;
        }
        
        if (!customerData || customerData.length === 0) {
          console.error(`No data returned when creating customer ${firstName} ${lastName}`);
          return;
        }
        
        const customer = customerData[0];
        createdCustomers.push(customer);
        
        // Create first order for this customer
        const firstOrderId = `order_first_${customerId}`;
        const firstOrderNumber = `#${1000 + createdCustomers.length}`;
        const firstOrderPrice = 100 + (i * 10); // Different price for each customer
        
        console.log(`Creating first order for ${firstName} ${lastName}: ${firstOrderNumber}`);
        
        // Use a numeric ID for the customer since insert_test_order expects an integer
        const customerNumericId = i + (productCohorts.indexOf(productCohort) * 10);
        
        const { data: firstOrderData, error: firstOrderError } = await supabase.rpc('insert_test_order', {
          p_shopify_order_id: firstOrderId,
          p_customer_id: customerNumericId, // Use numeric ID
          p_shopify_customer_id: shopifyCustomerId,
          p_order_number: firstOrderNumber,
          p_total_price: firstOrderPrice, // Corresponds to a value in totalPriceSet in Shopify
          p_processed_at: createdAt, // Corresponds to processedAt in Shopify
          p_updated_at: createdAt
        });
        
        if (firstOrderError) {
          console.error(`Error creating first order for ${firstName} ${lastName}:`, firstOrderError);
          return;
        }
        
        if (!firstOrderData || firstOrderData.length === 0) {
          console.error(`No data returned when creating first order for ${firstName} ${lastName}`);
          return;
        }
        
        const firstOrder = firstOrderData[0];
        
        // Create line item for first order
        console.log(`Creating line item for order ${firstOrderNumber}`);
        
        const { data: firstLineItemData, error: firstLineItemError } = await supabase.rpc('insert_test_line_item', {
          p_order_id: firstOrder.id,
          p_shopify_order_id: firstOrderId,
          p_product_id: `prod_${productCohort}_${i}`,
          p_variant_id: `var_${productCohort}_${i}`,
          p_title: `${productCohort} Product`,
          p_quantity: 1,
          p_price: firstOrderPrice,
          p_sku: `SKU_${productCohort}_${i}`,
          p_product_type: productCohort, // This is the key field for cohort classification
          p_vendor: 'PAKA',
          p_updated_at: createdAt
        });
        
        if (firstLineItemError) {
          console.error(`Error creating line item for first order:`, firstLineItemError);
          return;
        }
        
        // Create second order for customers with even numbers
        if (hasSecondOrder) {
          // Second order is 2 months after first order
          // Create a new date for March 2025 (2 months after January)
          const secondOrderDate = new Date(Date.UTC(2025, 2, day, 10, 0, 0));
          const secondOrderDateStr = secondOrderDate.toISOString();
          
          const secondOrderId = `order_second_${customerId}`;
          const secondOrderNumber = `#${2000 + createdCustomers.length}`;
          const secondOrderPrice = 150 + (i * 10); // Different price for second order
          
          console.log(`Creating second order for ${firstName} ${lastName}: ${secondOrderNumber}`);
          
          // Use the same numeric customer ID for the second order
          const { data: secondOrderData, error: secondOrderError } = await supabase.rpc('insert_test_order', {
            p_shopify_order_id: secondOrderId,
            p_customer_id: customerNumericId, // Use numeric ID
            p_shopify_customer_id: shopifyCustomerId,
            p_order_number: secondOrderNumber,
            p_total_price: secondOrderPrice,
            p_processed_at: secondOrderDateStr,
            p_updated_at: secondOrderDateStr
          });
          
          if (secondOrderError) {
            console.error(`Error creating second order for ${firstName} ${lastName}:`, secondOrderError);
            return;
          }
          
          if (!secondOrderData || secondOrderData.length === 0) {
            console.error(`No data returned when creating second order for ${firstName} ${lastName}`);
            return;
          }
          
          const secondOrder = secondOrderData[0];
          
          // Create line item for second order
          console.log(`Creating line item for order ${secondOrderNumber}`);
          
          const { data: secondLineItemData, error: secondLineItemError } = await supabase.rpc('insert_test_line_item', {
            p_order_id: secondOrder.id,
            p_shopify_order_id: secondOrderId,
            p_product_id: `prod_${productCohort}_${i}_2`,
            p_variant_id: `var_${productCohort}_${i}_2`,
            p_title: `${productCohort} Product`,
            p_quantity: 1,
            p_price: secondOrderPrice,
            p_sku: `SKU_${productCohort}_${i}_2`,
            p_product_type: productCohort,
            p_vendor: 'PAKA',
            p_updated_at: secondOrderDateStr
          });
          
          if (secondLineItemError) {
            console.error(`Error creating line item for second order:`, secondLineItemError);
            return;
          }
        }
      }
    }
    
    console.log(`\nCreated ${createdCustomers.length} test customers with orders.`);
    
    // Step 3: Classify customers to assign product cohorts
    console.log('\nStep 3: Classifying customers...');
    const { data: classifyData, error: classifyError } = await supabase.rpc('classify_new_customers');
    
    if (classifyError) {
      console.error('Error classifying customers:', classifyError);
    } else {
      console.log('Customer classification completed successfully.');
    }
    
    // Step 4: Refresh materialized views
    console.log('\nStep 4: Refreshing materialized views...');
    const { data: refreshData, error: refreshError } = await supabase.rpc('refresh_materialized_views');
    
    if (refreshError) {
      console.error('Error refreshing materialized views:', refreshError);
    } else {
      console.log('Materialized views refreshed successfully.');
    }
    
    // Step 5: Get cohort heatmap data
    console.log('\nStep 5: Getting cohort heatmap data...');
    
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
    console.log('Attempting to clear existing test data...');
    
    // Try direct table access with proper schema handling
    try {
      // Delete line items first due to foreign key constraints
      console.log('Deleting existing line items...');
      const { error: lineItemsError } = await supabase
        .from('order_line_items')
        .delete()
        .filter('shopify_order_id', 'like', 'order_%');
        
      if (lineItemsError) {
        console.error('Error deleting line items:', lineItemsError);
      } else {
        console.log('Cleared line items successfully');
      }
      
      // Then delete orders
      console.log('Deleting existing orders...');
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .filter('shopify_order_id', 'like', 'order_%');
        
      if (ordersError) {
        console.error('Error deleting orders:', ordersError);
      } else {
        console.log('Cleared orders successfully');
      }
      
      // Finally delete customers
      console.log('Deleting existing customers...');
      const { error: customersError } = await supabase
        .from('customers')
        .delete()
        .filter('shopify_customer_id', 'like', 'cust_%');
        
      if (customersError) {
        console.error('Error deleting customers:', customersError);
      } else {
        console.log('Cleared customers successfully');
      }
    } catch (deleteError) {
      console.error('Error during delete operations:', deleteError);
    }
    
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
