// Validation script for cohort heatmap data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reference data from the provided screenshots
const referenceData = {
  // Image 1 - 深睡寶寶
  '深睡寶寶': {
    'total': { new: 578, second: 225, retention: 38.9 },
    '2025-01': { new: 32, second: 17, retention: 53.1 },
    '2025-02': { new: 50, second: 20, retention: 40.0 },
    '2025-03': { new: 106, second: 57, retention: 53.8 },
    '2025-04': { new: 125, second: 45, retention: 36.0 },
    '2025-05': { new: 116, second: 45, retention: 38.8 },
    '2025-06': { new: 149, second: 41, retention: 27.5 }
  },
  // Image 2 - 天皇丸
  '天皇丸': {
    'total': { new: 788, second: 272, retention: 34.5 },
    '2025-01': { new: 42, second: 15, retention: 35.7 },
    '2025-02': { new: 49, second: 18, retention: 36.7 },
    '2025-03': { new: 83, second: 44, retention: 53.0 },
    '2025-04': { new: 172, second: 69, retention: 40.1 },
    '2025-05': { new: 217, second: 78, retention: 35.9 },
    '2025-06': { new: 225, second: 48, retention: 21.3 }
  },
  // Image 3 - 皇后丸
  '皇后丸': {
    'total': { new: 513, second: 191, retention: 37.2 },
    '2025-01': { new: 68, second: 33, retention: 48.5 },
    '2025-02': { new: 58, second: 32, retention: 55.2 },
    '2025-03': { new: 82, second: 36, retention: 43.9 },
    '2025-04': { new: 60, second: 25, retention: 41.7 },
    '2025-05': { new: 105, second: 34, retention: 32.4 },
    '2025-06': { new: 140, second: 31, retention: 22.1 }
  },
  // Image 4 - ALL
  'ALL': {
    'total': { new: 1958, second: 699, retention: 35.7 },
    '2025-01': { new: 147, second: 65, retention: 44.2 },
    '2025-02': { new: 181, second: 76, retention: 42.0 },
    '2025-03': { new: 282, second: 139, retention: 49.3 },
    '2025-04': { new: 369, second: 141, retention: 38.2 },
    '2025-05': { new: 453, second: 157, retention: 34.7 },
    '2025-06': { new: 526, second: 121, retention: 23.0 }
  }
};

async function main() {
  try {
    console.log('Starting cohort data validation...');
    
    // Step 1: Query cohort heatmap data for all products
    console.log('\nStep 1: Querying ALL products cohort heatmap...');
    const { data: allCohortData, error: allCohortError } = await supabase
      .rpc('get_test_cohort_heatmap');
    
    if (allCohortError) {
      console.error('Error querying ALL cohort heatmap:', allCohortError);
      return;
    }
    
    // Step 2: Query cohort heatmap for 深睡寶寶 product
    console.log('\nStep 2: Querying 深睡寶寶 cohort heatmap...');
    const { data: ssCohortData, error: ssCohortError } = await supabase
      .rpc('get_test_cohort_heatmap_by_product', { p_product_cohort: '深睡寶寶' });
    
    if (ssCohortError) {
      console.error('Error querying 深睡寶寶 cohort heatmap:', ssCohortError);
      return;
    }
    
    // Step 3: Query cohort heatmap for 天皇丸 product
    console.log('\nStep 3: Querying 天皇丸 cohort heatmap...');
    const { data: twCohortData, error: twCohortError } = await supabase
      .rpc('get_test_cohort_heatmap_by_product', { p_product_cohort: '天皇丸' });
    
    if (twCohortError) {
      console.error('Error querying 天皇丸 cohort heatmap:', twCohortError);
      return;
    }
    
    // Step 4: Query cohort heatmap for 皇后丸 product
    console.log('\nStep 4: Querying 皇后丸 cohort heatmap...');
    const { data: hhCohortData, error: hhCohortError } = await supabase
      .rpc('get_test_cohort_heatmap_by_product', { p_product_cohort: '皇后丸' });
    
    if (hhCohortError) {
      console.error('Error querying 皇后丸 cohort heatmap:', hhCohortError);
      return;
    }
    
    // Step 5: Validate cohort data against reference data
    console.log('\nStep 5: Validating cohort data against reference data...');
    
    // Validate ALL products cohort
    console.log('\nValidating ALL products cohort:');
    validateCohortData(allCohortData, 'ALL');
    
    // Validate 深睡寶寶 cohort
    console.log('\nValidating 深睡寶寶 cohort:');
    validateCohortData(ssCohortData, '深睡寶寶');
    
    // Validate 天皇丸 cohort
    console.log('\nValidating 天皇丸 cohort:');
    validateCohortData(twCohortData, '天皇丸');
    
    // Validate 皇后丸 cohort
    console.log('\nValidating 皇后丸 cohort:');
    validateCohortData(hhCohortData, '皇后丸');
    
    console.log('\nCohort data validation completed!');
  } catch (error) {
    console.error('Unexpected error in validation:', error);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
    }
  }
}

// Helper function to validate cohort data against reference data
function validateCohortData(cohortData, productCohort) {
  if (!cohortData || cohortData.length === 0) {
    console.log(`No cohort data available for ${productCohort}.`);
    return;
  }
  
  // Group by cohort month
  const cohortsByMonth = {};
  cohortData.forEach(row => {
    if (!cohortsByMonth[row.cohort_month]) {
      cohortsByMonth[row.cohort_month] = {
        cohort_size: row.cohort_size || 0,
        second_orders: 0
      };
    }
    cohortsByMonth[row.cohort_month].second_orders += (row.second_orders || 0);
  });
  
  // Calculate totals
  let totalNew = 0;
  let totalSecond = 0;
  
  Object.keys(cohortsByMonth).forEach(month => {
    totalNew += cohortsByMonth[month].cohort_size;
    totalSecond += cohortsByMonth[month].second_orders;
  });
  
  // Print validation results
  console.log('Cohort Month | DB New | Ref New | DB 2nd | Ref 2nd | DB Rate | Ref Rate | Match?');
  console.log('-------------|--------|---------|--------|---------|---------|----------|-------');
  
  // Validate each month
  Object.keys(referenceData[productCohort]).forEach(month => {
    if (month === 'total') return; // Skip total for now
    
    const refData = referenceData[productCohort][month];
    const dbData = cohortsByMonth[month] || { cohort_size: 0, second_orders: 0 };
    
    const dbRetention = dbData.cohort_size > 0 
      ? (dbData.second_orders / dbData.cohort_size * 100).toFixed(1) 
      : '0.0';
    
    const match = (
      Math.abs(dbData.cohort_size - refData.new) <= 1 &&
      Math.abs(dbData.second_orders - refData.second) <= 1 &&
      Math.abs(parseFloat(dbRetention) - refData.retention) <= 0.2
    );
    
    console.log(
      `${month}      | ${dbData.cohort_size.toString().padStart(6)} | ${refData.new.toString().padStart(7)} | ` +
      `${dbData.second_orders.toString().padStart(6)} | ${refData.second.toString().padStart(7)} | ` +
      `${dbRetention.padStart(7)}% | ${refData.retention.toFixed(1).padStart(7)}% | ${match ? '✓' : '✗'}`
    );
  });
  
  // Validate total
  const refTotal = referenceData[productCohort].total;
  const dbRetentionTotal = totalNew > 0 
    ? (totalSecond / totalNew * 100).toFixed(1) 
    : '0.0';
  
  const matchTotal = (
    Math.abs(totalNew - refTotal.new) <= 1 &&
    Math.abs(totalSecond - refTotal.second) <= 1 &&
    Math.abs(parseFloat(dbRetentionTotal) - refTotal.retention) <= 0.2
  );
  
  console.log('-------------|--------|---------|--------|---------|---------|----------|-------');
  console.log(
    `Total        | ${totalNew.toString().padStart(6)} | ${refTotal.new.toString().padStart(7)} | ` +
    `${totalSecond.toString().padStart(6)} | ${refTotal.second.toString().padStart(7)} | ` +
    `${dbRetentionTotal.padStart(7)}% | ${refTotal.retention.toFixed(1).padStart(7)}% | ${matchTotal ? '✓' : '✗'}`
  );
  
  // Overall validation result
  if (matchTotal) {
    console.log(`\n✅ ${productCohort} cohort data matches reference data!`);
  } else {
    console.log(`\n❌ ${productCohort} cohort data does not match reference data.`);
  }
}

// Run the main function
main();
