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

// Function to identify and fix constraint issues
async function fixConstraintIssues() {
  try {
    console.log('Identifying problematic customer ID...');
    
    // Get the problematic customer ID
    const problematicCustomerId = 'bdd79882-e6cd-4dbb-b94a-1437c2471981';
    
    console.log(`Found problematic customer ID: ${problematicCustomerId}`);
    
    // Find all orders for this customer
    console.log('Finding orders for this customer...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, shopify_order_id')
      .eq('customer_id', problematicCustomerId);
    
    if (ordersError) {
      console.error('Error finding orders:', ordersError);
      return;
    }
    
    console.log(`Found ${orders.length} orders for this customer:`, orders);
    
    // For each order, delete its line items first
    for (const order of orders) {
      console.log(`Deleting line items for order ${order.id}...`);
      const { error: lineItemsError } = await supabase
        .from('order_line_items')
        .delete()
        .eq('order_id', order.id);
      
      if (lineItemsError) {
        console.error(`Error deleting line items for order ${order.id}:`, lineItemsError);
        return;
      }
      
      console.log(`Successfully deleted line items for order ${order.id}`);
    }
    
    // Now delete the orders
    console.log('Deleting orders...');
    const { error: deleteOrdersError } = await supabase
      .from('orders')
      .delete()
      .eq('customer_id', problematicCustomerId);
    
    if (deleteOrdersError) {
      console.error('Error deleting orders:', deleteOrdersError);
      return;
    }
    
    console.log('Successfully deleted orders');
    
    // Finally, delete the customer
    console.log('Deleting customer...');
    const { error: deleteCustomerError } = await supabase
      .from('customers')
      .delete()
      .eq('id', problematicCustomerId);
    
    if (deleteCustomerError) {
      console.error('Error deleting customer:', deleteCustomerError);
      return;
    }
    
    console.log('Successfully deleted customer');
    
    // Now try to delete all test data
    console.log('\nAttempting to delete all test data...');
    
    // Delete line items first
    console.log('Deleting test line items...');
    const { error: testLineItemsError } = await supabase
      .from('order_line_items')
      .delete()
      .or('shopify_order_id.like.shopify_order_%,shopify_order_id.like.%_test_%');
    
    if (testLineItemsError) {
      console.error('Error deleting test line items:', testLineItemsError);
      return;
    }
    
    console.log('Successfully deleted test line items');
    
    // Then delete orders
    console.log('Deleting test orders...');
    const { error: testOrdersError } = await supabase
      .from('orders')
      .delete()
      .or('shopify_order_id.like.shopify_order_%,shopify_order_id.like.%_test_%');
    
    if (testOrdersError) {
      console.error('Error deleting test orders:', testOrdersError);
      return;
    }
    
    console.log('Successfully deleted test orders');
    
    // Finally delete customers
    console.log('Deleting test customers...');
    const { error: testCustomersError } = await supabase
      .from('customers')
      .delete()
      .or('email.like.customer_%@example.com,email.like.%_test_%@example.com');
    
    if (testCustomersError) {
      console.error('Error deleting test customers:', testCustomersError);
      return;
    }
    
    console.log('Successfully deleted test customers');
    
    console.log('\nAll constraint issues fixed and test data cleared successfully!');
  } catch (error) {
    console.error('Exception during fix operation:', error);
  }
}

// Run the function
fixConstraintIssues().catch(error => {
  console.error('Fatal error:', error);
});
