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

// Reference data from cohort-analysis-logic.md for Product Cohort: ALL (Image 4)
const referenceData = {
  '2025-01': 147,
  '2025-02': 181,
  '2025-03': 282,
  '2025-04': 369,
  '2025-05': 453,
  '2025-06': 526,
};

async function calculateNewCustomersFromScratch() {
  try {
    console.log('Fetching all orders to determine customer first order dates...');
    let allOrders = [];
    let lastProcessedAt = null;
    const BATCH_SIZE = 1000;

    while (true) {
      let query = supabase
        .from('orders')
        .select('customer_id, processed_at')
        .order('processed_at', { ascending: true })
        .limit(BATCH_SIZE);

      if (lastProcessedAt) {
        query = query.gt('processed_at', lastProcessedAt);
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) {
        console.error('Error fetching orders:', ordersError.message);
        return;
      }

      if (orders.length === 0) {
        break;
      }

      allOrders = allOrders.concat(orders);
      lastProcessedAt = orders[orders.length - 1].processed_at;
    }
    console.log(`Successfully fetched ${allOrders.length} total orders.`);

    const orders = allOrders;

    const customerFirstOrder = {};
    for (const order of orders) {
        if (order.customer_id && !customerFirstOrder[order.customer_id]) {
            customerFirstOrder[order.customer_id] = new Date(order.processed_at);
        }
    }

    const cohortCounts = {};
    for (const customerId in customerFirstOrder) {
        const firstOrderDate = customerFirstOrder[customerId];
        const year = firstOrderDate.getFullYear();
        const month = firstOrderDate.getMonth();

        if (year === 2025 && month >= 0 && month <= 5) { // January to June
            const cohortMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (!cohortCounts[cohortMonth]) {
                cohortCounts[cohortMonth] = 0;
            }
            cohortCounts[cohortMonth]++;
        }
    }

    console.log('\n## New Customer Count Verification (From Scratch)');
    console.log('| Cohort Month | Calculated New Customers | Reference New Customers | Difference |');
    console.log('|--------------|--------------------------|-------------------------|------------|');

    const sortedMonths = Object.keys(referenceData).sort();

    for (const month of sortedMonths) {
        const calculated = cohortCounts[month] || 0;
        const reference = referenceData[month];
        const difference = calculated - reference;
        console.log(`| ${month}      | ${String(calculated).padEnd(24)} | ${String(reference).padEnd(23)} | ${String(difference).padEnd(10)} |`);
    }

  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
  }
}

calculateNewCustomersFromScratch();
