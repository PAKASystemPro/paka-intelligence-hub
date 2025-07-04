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

async function fetchAll(table) {
    let allRows = [];
    const BATCH_SIZE = 1000;
    let offset = 0;

    while (true) {
        const { data: rows, error } = await supabase
            .from(table)
            .select('*')
            .range(offset, offset + BATCH_SIZE - 1);

        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
            return [];
        }

        if (rows.length === 0) {
            break;
        }

        allRows = allRows.concat(rows);
        offset += BATCH_SIZE;
    }
    console.log(`Successfully fetched ${allRows.length} total rows from ${table}.`);
    return allRows;
}

async function calculateRetentionRate() {
  try {
    console.log('Fetching all customers and orders...');
    const customers = await fetchAll('customers');
    const orders = await fetchAll('orders');

    console.log('Processing data by grouping orders per customer...');

    // Group customers by ID for quick lookup
    const customersById = new Map(customers.map(c => [c.id, c]));

    // Group orders by customer ID
    const ordersByCustomer = new Map();
    for (const order of orders) {
        if (order.customer_id) {
            if (!ordersByCustomer.has(order.customer_id)) {
                ordersByCustomer.set(order.customer_id, []);
            }
            ordersByCustomer.get(order.customer_id).push(order);
        }
    }

    const cohortData = {};

    // Iterate through each customer who has orders to determine their cohort and order count
    for (const [customerId, customerOrders] of ordersByCustomer.entries()) {
        const customer = customersById.get(customerId);
        if (!customer) continue; // Skip if customer record doesn't exist

        // Sort orders by date to reliably find the first one
        customerOrders.sort((a, b) => new Date(a.processed_at) - new Date(b.processed_at));
        const firstOrder = customerOrders[0];
        const firstOrderDate = new Date(firstOrder.processed_at);
        const customerCreationDate = new Date(customer.created_at);

        // Strict cohort definition: customer created and first order in the same month of 2025
        if (
            firstOrderDate.getFullYear() === 2025 &&
            firstOrderDate.getFullYear() === customerCreationDate.getFullYear() &&
            firstOrderDate.getMonth() === customerCreationDate.getMonth()
        ) {
            const cohortMonth = `${firstOrderDate.getFullYear()}-${String(firstOrderDate.getMonth() + 1).padStart(2, '0')}`;

            // Initialize cohort if it's the first time we see it
            if (!cohortData[cohortMonth]) {
                cohortData[cohortMonth] = { newCustomers: 0, secondOrders: 0 };
            }

            // This customer is a new customer for this cohort
            cohortData[cohortMonth].newCustomers++;

            // If they have 2 or more orders, they count towards 2nd order retention
            if (customerOrders.length >= 2) {
                cohortData[cohortMonth].secondOrders++;
            }
        }
    }

    console.log('\n## Cohort Retention Rate Verification (Corrected Logic)');
    console.log('| Cohort Month | New Customers | 2nd Orders | Retention Rate (RPR%) |');
    console.log('|--------------|---------------|------------|-----------------------|');

    const sortedCohorts = Object.keys(cohortData).sort();

    for (const cohortMonth of sortedCohorts) {
        const { newCustomers, secondOrders } = cohortData[cohortMonth];
        const retentionRate = newCustomers > 0 ? ((secondOrders / newCustomers) * 100).toFixed(2) + '%' : '0.00%';
        console.log(`| ${cohortMonth.padEnd(12)} | ${String(newCustomers).padEnd(13)} | ${String(secondOrders).padEnd(10)} | ${retentionRate.padEnd(21)} |`);
    }

  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
  }
}

calculateRetentionRate();
