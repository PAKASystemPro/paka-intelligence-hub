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

// Reference data for second orders from cohort-analysis-logic.md (Image 4)
const referenceData = {
  '2025-01': 65,
  '2025-02': 76,
  '2025-03': 139,
  '2025-04': 141,
  '2025-05': 157,
  '2025-06': 121,
};

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

async function calculateSecondOrdersStrict() {
  try {
    console.log('Fetching all customers and orders...');
    const customers = await fetchAll('customers');
    const orders = await fetchAll('orders');

    const customerInfo = {};
    for (const customer of customers) {
        customerInfo[customer.id] = {
            createdAt: new Date(customer.created_at),
            ordersCount: customer.orders_count
        };
    }

    const customerOrders = {};
    const sortedOrders = orders.sort((a, b) => new Date(a.processed_at) - new Date(b.processed_at));
    
    for (const order of sortedOrders) {
        if (order.customer_id) {
            if (!customerOrders[order.customer_id]) {
                customerOrders[order.customer_id] = [];
            }
            customerOrders[order.customer_id].push(order);
        }
    }

    const cohortCounts = {};
    for (const customerId in customerInfo) {
        const custInfo = customerInfo[customerId];
        const custOrders = customerOrders[customerId];

        if (custInfo && custOrders && custOrders.length > 0) {
            const createdAt = custInfo.createdAt;
            const firstOrderAt = new Date(custOrders[0].processed_at);

            const createdYear = createdAt.getFullYear();
            const createdMonth = createdAt.getMonth();
            const firstOrderYear = firstOrderAt.getFullYear();
            const firstOrderMonth = firstOrderAt.getMonth();

            if (createdYear === 2025 && createdYear === firstOrderYear && createdMonth === firstOrderMonth) {
                if (custInfo.ordersCount >= 2 && custOrders.length >= 2) {
                    const cohortMonth = `${createdYear}-${String(createdMonth + 1).padStart(2, '0')}`;
                    if (!cohortCounts[cohortMonth]) {
                        cohortCounts[cohortMonth] = 0;
                    }
                    cohortCounts[cohortMonth]++;
                }
            }
        }
    }

    console.log('\n## Second Order Retention Verification (Strict Logic)');
    console.log('| Cohort Month | Calculated 2nd Orders | Reference 2nd Orders | Difference | % Difference |');
    console.log('|--------------|-------------------------|------------------------|------------|--------------|');

    const sortedMonths = Object.keys(referenceData).sort();

    for (const month of sortedMonths) {
        const calculated = cohortCounts[month] || 0;
        const reference = referenceData[month];
        const difference = calculated - reference;
        const percentageDifference = reference > 0 ? ((difference / reference) * 100).toFixed(2) : 'N/A';
        console.log(`| ${month}      | ${String(calculated).padEnd(23)} | ${String(reference).padEnd(22)} | ${String(difference).padEnd(10)} | ${String(percentageDifference + '%').padEnd(12)} |`);
    }

  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
  }
}

calculateSecondOrdersStrict();
