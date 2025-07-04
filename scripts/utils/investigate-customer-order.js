import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase URL or Service Role Key is missing. Make sure .env.local is configured correctly.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'production' }
});

async function investigateOrder(orderName) {
  try {
    console.log(`🔍 Investigating order: ${orderName}...`);

    // 1. Find the order by its name (more flexible search)
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .ilike('name', `%${orderName}%`);

    if (orderError) {
      console.error(`🔴 Error searching for order '${orderName}'. Error: ${orderError.message}`);
      return;
    }

    if (orders.length === 0) {
        console.error(`🔴 Could not find any order with a name like '${orderName}'.`);
        return;
    }

    if (orders.length > 1) {
        console.warn(`🟡 Found multiple orders matching '${orderName}'. Investigating the first result.`);
    }

    const order = orders[0];
    console.log('\n--- Order Details ---');
    console.log(JSON.stringify(order, null, 2));

    const customerId = order.customer_id;
    if (!customerId) {
      console.log('\n🟡 This order has no associated customer_id.');
      return;
    }

    // 2. Find the associated customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      console.error(`🔴 Could not find customer with id '${customerId}'. Error: ${customerError?.message}`);
      return;
    }

    console.log('\n--- Customer Details ---');
    console.log(JSON.stringify(customer, null, 2));

    // 3. Find all orders for that customer to determine their first order
    const { data: customerOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('name, processed_at')
      .eq('customer_id', customerId)
      .order('processed_at', { ascending: true });

    if (allOrdersError) {
      console.error(`🔴 Could not fetch all orders for customer '${customerId}'. Error: ${allOrdersError.message}`);
      return;
    }

    console.log('\n--- Customer Order History ---');
    customerOrders.forEach((o, index) => {
      console.log(`  Order ${index + 1}: ${o.name}, Processed: ${o.processed_at}`);
    });

    // 4. Determine the customer's cohort
    const firstOrderDate = new Date(customerOrders[0].processed_at);
    const customerCreatedAt = new Date(customer.created_at);

    const cohortMonth = `${firstOrderDate.getFullYear()}-${String(firstOrderDate.getMonth() + 1).padStart(2, '0')}`;
    const createdMonth = `${customerCreatedAt.getFullYear()}-${String(customerCreatedAt.getMonth() + 1).padStart(2, '0')}`;

    console.log('\n--- Analysis ---');
    console.log(`Customer Account Created Month: ${createdMonth}`);
    console.log(`Customer First Order Month:   ${cohortMonth}`);
    console.log(`Total Orders in DB for Customer: ${customerOrders.length}`);
    console.log(`Customer Record 'orders_count':  ${customer.orders_count}`);

    if (cohortMonth === createdMonth) {
      console.log(`✅ This customer belongs to the ${cohortMonth} cohort.`);
    } else {
      console.log(`❌ This customer does NOT belong to a strict cohort (creation month and first order month do not match).`);
    }

  } catch (error) {
    console.error('An unexpected error occurred during investigation:', error.message);
  }
}

// The order name provided by the user
investigateOrder('#PPL28273');
