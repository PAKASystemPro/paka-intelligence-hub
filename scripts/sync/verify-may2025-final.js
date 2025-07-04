require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// --- Configuration ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'production' }
});

const startDate = '2025-05-01T00:00:00+08:00';
const endDate = '2025-05-31T23:59:59+08:00';

async function verifyData() {
  console.log(`🚀 Verifying May 2025 data for ${startDate} to ${endDate}...`);

  try {
    // 1. Count Total Orders
    const { count: orderCount, error: orderError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('processed_at', startDate)
      .lte('processed_at', endDate);
    if (orderError) throw new Error(`Error counting orders: ${orderError.message}`);
    console.log(`✅ Total Orders: ${orderCount} found.`);

    // 2. Count Total Orders with Customers (Non-Unique)
    const { count: nonUniqueCustomerCount, error: nonUniqueCustomerError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('processed_at', startDate)
      .lte('processed_at', endDate)
      .not('customer_id', 'is', null);
    if (nonUniqueCustomerError) throw new Error(`Error counting non-unique customers: ${nonUniqueCustomerError.message}`);
    console.log(`✅ Total Orders with Customers (Non-Unique): ${nonUniqueCustomerCount} found.`);

    // 3. Count Distinct Customers (Unique)
    const { data: customerData, error: customerError } = await supabase
        .from('orders')
        .select('customer_id')
        .gte('processed_at', startDate)
        .lte('processed_at', endDate);
    if (customerError) throw new Error(`Error fetching customer IDs from orders: ${customerError.message}`);
    const distinctCustomerIds = [...new Set(customerData.map(o => o.customer_id).filter(id => id !== null))];
    console.log(`✅ Distinct Customers (Unique): ${distinctCustomerIds.length} found.`);

    // 3. Count Line Items in batches for reliability
    const { data: orderIds, error: orderIdError } = await supabase
        .from('orders')
        .select('id')
        .gte('processed_at', startDate)
        .lte('processed_at', endDate);
    if (orderIdError) throw new Error(`Error fetching order IDs: ${orderIdError.message}`);

    const orderIdList = orderIds.map(o => o.id);
    let totalLineItems = 0;
    const batchSize = 100;
    const totalBatches = Math.ceil(orderIdList.length / batchSize);
    console.log(`   - Counting line items for ${orderIdList.length} orders in ${totalBatches} batches...`);

    for (let i = 0; i < orderIdList.length; i += batchSize) {
        const batch = orderIdList.slice(i, i + batchSize);
        const currentBatchNum = Math.floor(i / batchSize) + 1;
        console.log(`   - Processing batch ${currentBatchNum}/${totalBatches}...`);
        const { count, error } = await supabase
            .from('order_line_items')
            .select('*', { count: 'exact', head: true })
            .in('order_id', batch);
        if (error) throw new Error(`Error counting line items for batch: ${error.message}`);
        totalLineItems += count;
        console.log(`   - Batch ${currentBatchNum}/${totalBatches} complete. Running total: ${totalLineItems} line items.`);
    }
    console.log(`✅ Order Line Items: ${totalLineItems} found.`);

    // 4. Get Cohort Verification Stats
    const { data: cohortStats, error: cohortError } = await supabase.rpc('public.get_cohort_verification_stats', {
      start_date: startDate,
      end_date: endDate
    });
    if (cohortError) throw new Error(`Error fetching cohort stats: ${cohortError.message}`);
    console.log(`
📊 Cohort Analysis:
   - New Customers (1st order): ${cohortStats.new_customers_count}
   - 2nd Order Customers: ${cohortStats.second_order_customers_count}`);

    console.log('\n✨ Verification complete!');

  } catch (error) {
    console.error('🔴 Verification failed:', error.message);
  }
}

verifyData()
  .catch(error => {
    console.error('🔴 Script failed with unhandled error:', error);
    process.exit(1);
  });
