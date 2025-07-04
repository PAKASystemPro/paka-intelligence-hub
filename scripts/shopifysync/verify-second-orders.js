/**
 * Script to verify second order counts for January 2025
 */
require('dotenv').config({ path: '.env.local' });
const { initSupabaseClient } = require('./shopify-sync-utils');

async function verifySecondOrders() {
  try {
    console.log('Verifying second order counts for January 2025...');
    const supabase = initSupabaseClient();
    
    // Get customers with 2 or more orders
    const { data: customersWithMultipleOrders, error: customerError } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, orders_count')
      .gte('orders_count', 2);
    
    if (customerError) {
      console.error('Error fetching customers with multiple orders:', customerError);
      return;
    }
    
    console.log(`Found ${customersWithMultipleOrders.length} customers with 2 or more orders total`);
    
    // For January 2025 m0 cohort (both first and second orders in January), we expect 20 customers
    console.log(`Expected m0 cohort second orders for January 2025: 20`);
    
    // Process in batches to avoid timeout
    console.log('\nFinding customers who made their second order in January 2025...');
    const batchSize = 20;
    const batches = [];
    
    // Create batches of customers
    for (let i = 0; i < customersWithMultipleOrders.length; i += batchSize) {
      batches.push(customersWithMultipleOrders.slice(i, i + batchSize));
    }
    
    console.log(`Processing ${batches.length} batches of up to ${batchSize} customers each`);
    
    // Process each batch
    let secondOrdersInJanuary = 0;
    const secondOrderCustomers = [];
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batchCustomers = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batchCustomers.length} customers)...`);
      
      for (const customer of batchCustomers) {
        const { data: orders, error: orderError } = await supabase
          .from('orders')
          .select('shopify_order_id, order_number, processed_at')
          .eq('customer_id', customer.id)
          .order('processed_at', { ascending: true });
        
        if (orderError) {
          console.error(`Error fetching orders for customer ${customer.id}:`, orderError);
          continue;
        }
        
        // Check if this customer has at least 2 orders
        if (orders.length >= 2) {
          // Get the first and second orders
          const firstOrder = orders[0];
          const secondOrder = orders[1];
          const firstOrderDate = new Date(firstOrder.processed_at);
          const secondOrderDate = new Date(secondOrder.processed_at);
          
          // For UTC+8, January 1st 00:00:00 local time is December 31st 16:00:00 UTC
          // And February 1st 00:00:00 local time is January 31st 16:00:00 UTC
          const januaryStart = new Date('2024-12-31T16:00:00Z');
          const januaryEnd = new Date('2025-01-31T16:00:00Z');
          
          const firstOrderInJanuary = firstOrderDate >= januaryStart && firstOrderDate < januaryEnd;
          const secondOrderInJanuary = secondOrderDate >= januaryStart && secondOrderDate < januaryEnd;
          
          // Check if both first and second orders were in January 2025 (m0 cohort)
          if (firstOrderInJanuary && secondOrderInJanuary) {
            secondOrdersInJanuary++;
            secondOrderCustomers.push({
              customer,
              firstOrder: firstOrder,
              secondOrder: secondOrder
            });
          }
        }
      }
    }
    
    console.log(`\nFound ${secondOrdersInJanuary} customers who made both first and second orders in January 2025 (m0 cohort)`);
    console.log(`Expected: 20, Actual: ${secondOrdersInJanuary}`);
    console.log(`Match: ${secondOrdersInJanuary === 20 ? '\u2705' : '\u274c'}`);
    
    // Show sample of customers who made their second order in January 2025
    if (secondOrderCustomers.length > 0) {
      console.log('\nSample of customers who made their second order in January 2025:');
      const sampleSize = Math.min(5, secondOrderCustomers.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const { customer, firstOrder, secondOrder } = secondOrderCustomers[i];
        console.log(`\nCustomer: ${customer.first_name || ''} ${customer.last_name || ''} (${customer.email || 'No email'})`);
        console.log(`First order: #${firstOrder.order_number} (${firstOrder.processed_at})`);
        console.log(`Second order: #${secondOrder.order_number} (${secondOrder.processed_at})`);
      }
    }
    
    console.log('\nVerification complete!');
  } catch (error) {
    console.error('Error verifying second orders:', error);
  }
}

verifySecondOrders().catch(console.error);
