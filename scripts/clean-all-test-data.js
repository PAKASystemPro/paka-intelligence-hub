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

// Function to clean all test data in the correct order
async function cleanAllTestData() {
  try {
    console.log('Starting comprehensive test data cleanup...');
    
    // Step 1: Find all test customers
    console.log('\nStep 1: Finding all test customers...');
    const { data: testCustomers, error: customersError } = await supabase
      .from('customers')
      .select('id, email')
      .or('email.like.customer_%@example.com,email.like.%_test_%@example.com');
    
    if (customersError) {
      console.error('Error finding test customers:', customersError);
      return;
    }
    
    console.log(`Found ${testCustomers.length} test customers`);
    
    // Step 2: For each customer, find and delete their orders and line items
    console.log('\nStep 2: Processing each customer...');
    for (const customer of testCustomers) {
      console.log(`\nProcessing customer ${customer.id} (${customer.email})...`);
      
      // Find all orders for this customer
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, shopify_order_id')
        .eq('customer_id', customer.id);
      
      if (ordersError) {
        console.error(`Error finding orders for customer ${customer.id}:`, ordersError);
        continue;
      }
      
      console.log(`Found ${orders.length} orders for customer ${customer.id}`);
      
      // For each order, delete its line items
      for (const order of orders) {
        console.log(`Processing order ${order.id}...`);
        
        // Delete line items for this order
        const { error: lineItemsError } = await supabase
          .from('order_line_items')
          .delete()
          .eq('order_id', order.id);
        
        if (lineItemsError) {
          console.error(`Error deleting line items for order ${order.id}:`, lineItemsError);
          continue;
        }
        
        console.log(`Deleted line items for order ${order.id}`);
      }
      
      // Delete all orders for this customer
      if (orders.length > 0) {
        const { error: deleteOrdersError } = await supabase
          .from('orders')
          .delete()
          .eq('customer_id', customer.id);
        
        if (deleteOrdersError) {
          console.error(`Error deleting orders for customer ${customer.id}:`, deleteOrdersError);
          continue;
        }
        
        console.log(`Deleted all orders for customer ${customer.id}`);
      }
    }
    
    // Step 3: Now that all orders and line items are deleted, delete the customers
    console.log('\nStep 3: Deleting all test customers...');
    const { error: deleteCustomersError } = await supabase
      .from('customers')
      .delete()
      .or('email.like.customer_%@example.com,email.like.%_test_%@example.com');
    
    if (deleteCustomersError) {
      console.error('Error deleting test customers:', deleteCustomersError);
      return;
    }
    
    console.log('Successfully deleted all test customers');
    
    // Step 4: Double-check for any remaining test data
    console.log('\nStep 4: Verifying cleanup...');
    
    // Check for any remaining line items
    const { data: remainingLineItems, error: lineItemCheckError } = await supabase
      .from('order_line_items')
      .select('count', { count: 'exact' })
      .or('shopify_order_id.like.shopify_order_%,shopify_order_id.like.%_test_%');
    
    if (lineItemCheckError) {
      console.error('Error checking remaining line items:', lineItemCheckError);
    } else {
      console.log(`Remaining test line items: ${remainingLineItems.count || 0}`);
    }
    
    // Check for any remaining orders
    const { data: remainingOrders, error: orderCheckError } = await supabase
      .from('orders')
      .select('count', { count: 'exact' })
      .or('shopify_order_id.like.shopify_order_%,shopify_order_id.like.%_test_%');
    
    if (orderCheckError) {
      console.error('Error checking remaining orders:', orderCheckError);
    } else {
      console.log(`Remaining test orders: ${remainingOrders.count || 0}`);
    }
    
    // Check for any remaining customers
    const { data: remainingCustomers, error: customerCheckError } = await supabase
      .from('customers')
      .select('count', { count: 'exact' })
      .or('email.like.customer_%@example.com,email.like.%_test_%@example.com');
    
    if (customerCheckError) {
      console.error('Error checking remaining customers:', customerCheckError);
    } else {
      console.log(`Remaining test customers: ${remainingCustomers.count || 0}`);
    }
    
    console.log('\nTest data cleanup completed!');
  } catch (error) {
    console.error('Exception during cleanup operation:', error);
  }
}

// Run the function
cleanAllTestData().catch(error => {
  console.error('Fatal error:', error);
});
