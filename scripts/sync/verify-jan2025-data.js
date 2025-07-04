require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// --- Configuration ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'production' }
});

const startDate = '2025-01-01T00:00:00Z';
const endDate = '2025-01-31T23:59:59Z';

async function verifyData() {
  console.log('🚀 Verifying January 2025 data in Supabase...');

  try {
    // 1. Count Orders
    const { count: orderCount, error: orderError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('processed_at', startDate)
      .lte('processed_at', endDate);

    if (orderError) throw new Error(`Error counting orders: ${orderError.message}`);
    console.log(`✅ Orders: ${orderCount} found.`);

    // 2. Count Customers (distinct, associated with Jan orders)
    const { data: customerData, error: customerError } = await supabase
        .from('orders')
        .select('customer_id')
        .gte('processed_at', startDate)
        .lte('processed_at', endDate);

    if (customerError) throw new Error(`Error fetching customer IDs from orders: ${customerError.message}`);
    
    const distinctCustomerIds = [...new Set(customerData.map(o => o.customer_id).filter(id => id !== null))];
    console.log(`✅ Customers: ${distinctCustomerIds.length} distinct customers associated with January orders.`);

    // 3. Count Line Items in batches
    const { data: orderIds, error: orderIdError } = await supabase
        .from('orders')
        .select('id')
        .gte('processed_at', startDate)
        .lte('processed_at', endDate);

    if (orderIdError) throw new Error(`Error fetching order IDs: ${orderIdError.message}`);

    const orderIdList = orderIds.map(o => o.id);
    let totalLineItems = 0;
    const batchSize = 100;

    for (let i = 0; i < orderIdList.length; i += batchSize) {
        const batch = orderIdList.slice(i, i + batchSize);
        const { count, error } = await supabase
            .from('order_line_items')
            .select('*', { count: 'exact', head: true })
            .in('order_id', batch);

        if (error) throw new Error(`Error counting line items for batch: ${error.message}`);
        totalLineItems += count;
    }

    console.log(`✅ Order Line Items: ${totalLineItems} found.`);

    console.log('\n✨ Verification complete!');

  } catch (error) {
    console.error('🔴 Verification failed:', error.message);
  }
}

verifyData();
