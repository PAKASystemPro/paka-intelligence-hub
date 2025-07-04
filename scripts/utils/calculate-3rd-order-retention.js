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

async function calculate3rdOrderRetention() {
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

    const customerFirstOrder = {};
    const sortedOrders = orders.sort((a, b) => new Date(a.processed_at) - new Date(b.processed_at));
    for (const order of sortedOrders) {
        if (order.customer_id && !customerFirstOrder[order.customer_id]) {
            customerFirstOrder[order.customer_id] = new Date(order.processed_at);
        }
    }

    const cohortSecondOrders = {};
    const cohortThirdOrders = {};

    for (const customerId in customerInfo) {
        const custInfo = customerInfo[customerId];
        if (custInfo && customerFirstOrder[customerId]) {
            const createdAt = custInfo.createdAt;
            const firstOrderAt = customerFirstOrder[customerId];

            const createdYear = createdAt.getFullYear();
            const createdMonth = createdAt.getMonth();
            const firstOrderYear = firstOrderAt.getFullYear();
            const firstOrderMonth = firstOrderAt.getMonth();

            if (createdYear === 2025 && createdYear === firstOrderYear && createdMonth === firstOrderMonth) {
                const cohortMonth = `${createdYear}-${String(createdMonth + 1).padStart(2, '0')}`;
                
                if (custInfo.ordersCount >= 2) {
                    if (!cohortSecondOrders[cohortMonth]) {
                        cohortSecondOrders[cohortMonth] = 0;
                    }
                    cohortSecondOrders[cohortMonth]++;
                }

                if (custInfo.ordersCount >= 3) {
                    if (!cohortThirdOrders[cohortMonth]) {
                        cohortThirdOrders[cohortMonth] = 0;
                    }
                    cohortThirdOrders[cohortMonth]++;
                }
            }
        }
    }

    console.log('\n## 3rd Order Repurchase Rate (RPR%) Verification');
    console.log('| Cohort Month | Customers w/ >=2 Orders | Customers w/ >=3 Orders | 3rd Order RPR% |');
    console.log('|--------------|--------------------------|-------------------------|----------------|');

    const sortedMonths = Object.keys(cohortSecondOrders).sort();

    for (const month of sortedMonths) {
        const secondOrders = cohortSecondOrders[month] || 0;
        const thirdOrders = cohortThirdOrders[month] || 0;
        const retentionRate = secondOrders > 0 ? ((thirdOrders / secondOrders) * 100).toFixed(2) : '0.00';
        
        console.log(`| ${month}      | ${String(secondOrders).padEnd(24)} | ${String(thirdOrders).padEnd(23)} | ${String(retentionRate + '%').padEnd(14)} |`);
    }

  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
  }
}

calculate3rdOrderRetention();
