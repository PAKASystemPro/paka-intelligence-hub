/**
 * Script to verify new customers for January 2025
 */
require('dotenv').config({ path: '.env.local' });
const { initSupabaseClient } = require('./shopify-sync-utils');

async function verifyNewCustomers() {
  try {
    console.log('Verifying new customers for January 2025...');
    const supabase = initSupabaseClient();
    
    // Method 1: Query customers created in January 2025 with orders_count >= 1
    // For UTC+8, January 1st 00:00:00 local time is December 31st 16:00:00 UTC
    // And February 1st 00:00:00 local time is January 31st 16:00:00 UTC
    console.log('\nMethod 1: Customers created in January 2025 with orders_count >= 1');
    const { data: newCustomersByCreation, error: error1 } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, orders_count')
      .gte('created_at', '2024-12-31T16:00:00Z')
      .lt('created_at', '2025-01-31T16:00:00Z')
      .gte('orders_count', 1);
    
    if (error1) {
      console.error('Error querying new customers by creation date:', error1);
      return;
    }
    
    console.log(`Found ${newCustomersByCreation.length} new customers created in January 2025`);
    console.log(`Expected: 147, Actual: ${newCustomersByCreation.length}`);
    console.log(`Match: ${newCustomersByCreation.length === 147 ? '✅' : '❌'}`);
    
    // Show sample of new customers
    console.log('\nSample of new customers by creation date:');
    const sampleSize1 = Math.min(5, newCustomersByCreation.length);
    for (let i = 0; i < sampleSize1; i++) {
      const customer = newCustomersByCreation[i];
      console.log(`- ${customer.first_name || ''} ${customer.last_name || ''} (${customer.email || 'No email'}) - Orders: ${customer.orders_count}`);
    }
    
    // Method 2: Find new customers in January 2025 by combining order date and creation date
    console.log('\nMethod 2: New customers in January 2025 (refined approach)');
    
    // Step 1: Get all customers who placed orders in January 2025
    const { data: january2025Orders, error: error2 } = await supabase
      .from('orders')
      .select('customer_id')
      .gte('processed_at', '2024-12-31T16:00:00Z')
      .lt('processed_at', '2025-01-31T16:00:00Z');
    
    if (error2) {
      console.error('Error getting January orders:', error2);
      return;
    }
    
    // Step 2: Get all customers who placed orders before 2025
    const { data: pre2025Orders, error: error3 } = await supabase
      .from('orders')
      .select('customer_id')
      .lt('processed_at', '2024-12-31T16:00:00Z');
    
    if (error3) {
      console.error('Error getting pre-2025 orders:', error3);
      return;
    }
    
    // Step 3: Extract unique customer IDs from January 2025 orders
    const january2025CustomerIds = new Set();
    january2025Orders.forEach(order => january2025CustomerIds.add(order.customer_id));
    
    // Step 4: Extract unique customer IDs from pre-2025 orders
    const pre2025CustomerIds = new Set();
    pre2025Orders.forEach(order => pre2025CustomerIds.add(order.customer_id));
    
    // Step 5: Find potential new customers in January 2025 (customers who ordered in January but not before)
    const potentialNewCustomerIds = Array.from(january2025CustomerIds)
      .filter(id => !pre2025CustomerIds.has(id));
    
    console.log(`Found ${potentialNewCustomerIds.length} potential new customers (ordered in January but not before)`);
    
    // Step 6: Process customer details in batches to avoid timeout
    console.log('Processing customer details in batches...');
    const batchSize = 50;
    const batches = [];
    const potentialNewCustomerIdsArray = Array.from(potentialNewCustomerIds);
    
    // Create batches of customer IDs
    for (let i = 0; i < potentialNewCustomerIdsArray.length; i += batchSize) {
      batches.push(potentialNewCustomerIdsArray.slice(i, i + batchSize));
    }
    
    console.log(`Processing ${batches.length} batches of up to ${batchSize} customers each`);
    
    // Process each batch
    let allCustomerDetails = [];
    for (let i = 0; i < batches.length; i++) {
      const batchIds = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batchIds.length} customers)...`);
      
      const { data: batchCustomerDetails, error: batchError } = await supabase
        .from('customers')
        .select('id, email, first_name, last_name, orders_count, created_at')
        .in('id', batchIds);
        
      if (batchError) {
        console.error(`Error getting customer details for batch ${i + 1}:`, batchError);
        continue;
      }
      
      allCustomerDetails = allCustomerDetails.concat(batchCustomerDetails);
    }
    
    console.log(`Retrieved details for ${allCustomerDetails.length} customers`);
    
    // Step 7: Further filter to only include customers created in January 2025
    const newJanuaryCustomers = allCustomerDetails.filter(customer => {
      const createdAt = new Date(customer.created_at);
      return createdAt >= new Date('2024-12-31T16:00:00Z') && createdAt < new Date('2025-01-31T16:00:00Z');
    });
    
    console.log(`Found ${newJanuaryCustomers.length} new customers in January 2025 (ordered in January AND created in January)`);
    console.log(`Expected: 147, Actual: ${newJanuaryCustomers.length}`);
    console.log(`Match: ${newJanuaryCustomers.length === 147 ? '\u2705' : '\u274c'}`);
    
    // Step 8: Show sample of these new customers
    if (newJanuaryCustomers.length > 0) {
      const sampleSize = Math.min(5, newJanuaryCustomers.length);
      console.log('\nSample of new January 2025 customers:');
      for (let i = 0; i < sampleSize; i++) {
        const customer = newJanuaryCustomers[i];
        console.log(`- ${customer.first_name || ''} ${customer.last_name || ''} (${customer.email || 'No email'}) - Orders: ${customer.orders_count} - Created: ${customer.created_at}`);
      }
    }
    
    // Calculate total unique customers who placed orders in January 2025
    console.log('\nTotal unique customers who placed orders in January 2025:');
    console.log(`Total unique customers: ${january2025CustomerIds.size}`);
    
    console.log('\nVerification complete!');
  } catch (error) {
    console.error('Error verifying new customers:', error);
  }
}

// Run the function
verifyNewCustomers().catch(console.error);
