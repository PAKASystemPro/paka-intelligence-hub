require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// --- Configuration ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("🔴 Supabase URL or Service Role Key is missing. Make sure .env.local is configured correctly.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'production' }
});

const BATCH_SIZE = 100;

// --- Helper function to fetch all rows from a table ---
async function fetchAll(tableName) {
    console.log(`⏳ Fetching all data from ${tableName}...`);
    let allRows = [];
    let lastId = 0;
    let hasMore = true;

    while(hasMore) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('id')
            .range(lastId, lastId + BATCH_SIZE - 1);

        if (error) throw error;

        if (data.length > 0) {
            allRows.push(...data);
            lastId += data.length;
        } else {
            hasMore = false;
        }
    }
    console.log(`✅ Successfully fetched ${allRows.length} total rows from ${tableName}.`);
    return allRows;
}

// --- Main Classification Logic ---
async function reclassifyCohorts() {
    try {
        // 1. Fetch all necessary data
        const customers = await fetchAll('customers');
        const orders = await fetchAll('orders');
        const lineItems = await fetchAll('order_line_items');

        console.log('\n⚙️  Processing data in memory...');

        // 2. Group data for efficient lookup
        const ordersByCustomer = new Map();
        for (const order of orders) {
            if (order.customer_id) {
                if (!ordersByCustomer.has(order.customer_id)) {
                    ordersByCustomer.set(order.customer_id, []);
                }
                ordersByCustomer.get(order.customer_id).push(order);
            }
        }

        const lineItemsByOrder = new Map();
        for (const item of lineItems) {
            if (item.order_id) {
                if (!lineItemsByOrder.has(item.order_id)) {
                    lineItemsByOrder.set(item.order_id, []);
                }
                lineItemsByOrder.get(item.order_id).push(item);
            }
        }

        // 3. Determine new cohort for each customer
        console.log('🔬 Classifying customers based on their first order...');
        const customerUpdates = [];
        for (const customer of customers) {
            const customerOrders = ordersByCustomer.get(customer.id);

            if (!customerOrders || customerOrders.length === 0) {
                continue; // Skip customers with no orders
            }

            // Find the first order
            customerOrders.sort((a, b) => new Date(a.processed_at) - new Date(b.processed_at));
            const firstOrder = customerOrders[0];

            const firstOrderLineItems = lineItemsByOrder.get(firstOrder.id);
            if (!firstOrderLineItems || firstOrderLineItems.length === 0) {
                continue; // Skip if first order has no line items
            }

            // Apply classification logic with priority
            let newCohort = null;
            if (firstOrderLineItems.some(item => item.title.includes('深睡寶寶'))) {
                newCohort = '深睡寶寶';
            } else if (firstOrderLineItems.some(item => item.title.includes('天皇丸'))) {
                newCohort = '天皇丸';
            } else if (firstOrderLineItems.some(item => item.title.includes('皇后丸'))) {
                newCohort = '皇后丸';
            }

            // Only add an update if the cohort has changed
            if (newCohort !== customer.primary_product_cohort) {
                // Create a complete customer object for the update to avoid nulling other columns
                const updatedCustomer = { ...customer, primary_product_cohort: newCohort };
                customerUpdates.push(updatedCustomer);
            }
        }

        console.log(`📊 Found ${customerUpdates.length} customers needing re-classification.`);

        // 4. Update the database in batches
        if (customerUpdates.length > 0) {
            console.log('💾 Updating database in batches...');
            for (let i = 0; i < customerUpdates.length; i += BATCH_SIZE) {
                const batch = customerUpdates.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('customers').upsert(batch, { onConflict: 'id' });
                if (error) {
                    console.error('🔴 Batch update failed:', error);
                    throw error; // Stop if a batch fails
                }
                console.log(`  ...updated batch ${i / BATCH_SIZE + 1} of ${Math.ceil(customerUpdates.length / BATCH_SIZE)}`);
            }
        }

        console.log('\n✨ Re-classification complete!');

    } catch (error) {
        console.error('🔴 An unexpected error occurred during re-classification:', error.message);
    }
}

reclassifyCohorts();
