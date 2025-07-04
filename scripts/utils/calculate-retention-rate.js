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

async function calculateRetentionRate(productCohortFilter) {
  try {
    console.log('Fetching all customers and orders...');
    const allCustomers = await fetchAll('customers');
    const orders = await fetchAll('orders');

    // Filter customers by product cohort if a filter is provided
    let filteredCustomers = allCustomers;
    if (productCohortFilter) {
        console.log(`\nFiltering for product cohort: ${productCohortFilter}`);
        filteredCustomers = allCustomers.filter(c => c.primary_product_cohort === productCohortFilter);
        console.log(`Found ${filteredCustomers.length} customers in this cohort.`);
    }

    console.log('\nProcessing data by grouping orders per customer...');

    // Group customers by ID for quick lookup
    const customersById = new Map(filteredCustomers.map(c => [c.id, c]));

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

    // Iterate through each customer in the filtered set who has orders
    for (const [customerId, customerOrders] of ordersByCustomer.entries()) {
        const customer = customersById.get(customerId);
        if (!customer) continue; // Skip if customer is not in the filtered cohort

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

            if (!cohortData[cohortMonth]) {
                cohortData[cohortMonth] = { newCustomers: 0, secondOrders: 0 };
            }

            cohortData[cohortMonth].newCustomers++;

            if (customerOrders.length >= 2) {
                cohortData[cohortMonth].secondOrders++;
            }
        }
    }

    console.log(`\n## Cohort Retention Rate Verification (${productCohortFilter || 'ALL'})`);
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

// Read product cohort from command line arguments
const productCohortFilter = process.argv[2];
calculateRetentionRate(productCohortFilter);
