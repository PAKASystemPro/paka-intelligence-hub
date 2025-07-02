require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with schema set to 'production'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'production' }
  }
);

// Create a separate client for RPC calls (without schema setting)
const rpcClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('Checking inserted data...');

  // Check customers by month
  console.log('\nChecking customers by month:');
  try {
    const { data: customersByMonth, error } = await supabase
      .from('customers')
      .select('count', { count: 'exact' })
      .gte('created_at', '2025-01-01')
      .lte('created_at', '2025-06-30');
    
    if (error) {
      console.error('Error checking customers:', error);
    } else {
      console.log(`Total customers Jan-Jun 2025: ${customersByMonth.count}`);
    }
    
    // Check customers by month
    for (let month = 1; month <= 6; month++) {
      const monthStr = month.toString().padStart(2, '0');
      const startDate = `2025-${monthStr}-01`;
      const endDate = month < 6 
        ? `2025-${(month + 1).toString().padStart(2, '0')}-01`
        : '2025-07-01';
      
      const { data, error } = await supabase
        .from('customers')
        .select('count', { count: 'exact' })
        .gte('created_at', startDate)
        .lt('created_at', endDate);
      
      if (error) {
        console.error(`Error checking customers for ${monthStr}/2025:`, error);
      } else {
        console.log(`Customers for ${monthStr}/2025: ${data.count}`);
      }
    }
  } catch (error) {
    console.error('Exception checking customers:', error);
  }
  
  // Check orders by month
  console.log('\nChecking orders by month:');
  try {
    const { data: ordersByMonth, error } = await supabase
      .from('orders')
      .select('count', { count: 'exact' })
      .gte('processed_at', '2025-01-01')
      .lte('processed_at', '2025-06-30');
    
    if (error) {
      console.error('Error checking orders:', error);
    } else {
      console.log(`Total orders Jan-Jun 2025: ${ordersByMonth.count}`);
    }
    
    // Check orders by month
    for (let month = 1; month <= 6; month++) {
      const monthStr = month.toString().padStart(2, '0');
      const startDate = `2025-${monthStr}-01`;
      const endDate = month < 6 
        ? `2025-${(month + 1).toString().padStart(2, '0')}-01`
        : '2025-07-01';
      
      const { data, error } = await supabase
        .from('orders')
        .select('count', { count: 'exact' })
        .gte('processed_at', startDate)
        .lt('processed_at', endDate);
      
      if (error) {
        console.error(`Error checking orders for ${monthStr}/2025:`, error);
      } else {
        console.log(`Orders for ${monthStr}/2025: ${data.count}`);
      }
    }
  } catch (error) {
    console.error('Exception checking orders:', error);
  }
  
  // Check cohort analysis materialized view
  console.log('\nChecking cohort analysis materialized view:');
  try {
    const { data: cohortData, error } = await supabase
      .from('cohort_analysis')
      .select('cohort_month, count(distinct customer_id)', { count: 'exact' })
      .gte('cohort_month', '2025-01')
      .lte('cohort_month', '2025-06')
      .eq('order_number', 1)
      .group('cohort_month')
      .order('cohort_month');
    
    if (error) {
      console.error('Error checking cohort analysis:', error);
    } else {
      console.log('Cohort analysis data:');
      console.log(cohortData);
    }
  } catch (error) {
    console.error('Exception checking cohort analysis:', error);
  }
  
  // Get cohort heatmap data directly from the materialized view
  console.log('\nGetting cohort heatmap data directly:');
  try {
    const { data: heatmapData, error } = await rpcClient.rpc('get_cohort_heatmap');
    
    if (error) {
      console.error('Error getting cohort heatmap:', error);
    } else {
      console.log('Cohort heatmap data:');
      
      // Group by cohort month
      const cohortMonths = {};
      heatmapData.forEach(row => {
        if (!cohortMonths[row.cohort_month]) {
          cohortMonths[row.cohort_month] = {
            cohort_size: row.cohort_size,
            second_orders: 0,
            retention_rate: 0
          };
        }
        
        if (row.month_number !== null) {
          cohortMonths[row.cohort_month].second_orders += row.second_orders;
        }
      });
      
      // Calculate retention rates
      Object.keys(cohortMonths).forEach(month => {
        const { cohort_size, second_orders } = cohortMonths[month];
        cohortMonths[month].retention_rate = (second_orders / cohort_size * 100).toFixed(1);
      });
      
      console.log('Month | New Customers | 2nd Orders | Retention Rate');
      console.log('------|--------------|------------|---------------');
      
      Object.keys(cohortMonths).sort().forEach(month => {
        const { cohort_size, second_orders, retention_rate } = cohortMonths[month];
        console.log(`${month} | ${cohort_size.toString().padStart(12, ' ')} | ${second_orders.toString().padStart(10, ' ')} | ${retention_rate.toString().padStart(12, ' ')}%`);
      });
    }
  } catch (error) {
    console.error('Exception getting cohort heatmap:', error);
  }
}

// Run the function
checkData().catch(error => {
  console.error('Fatal error:', error);
});
