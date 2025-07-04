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

async function verifyNewCustomerCounts() {
  console.log('Fetching new customer counts from the cohort_sizes view...');

  const { data, error } = await supabase.from('cohort_sizes').select('cohort_month, new_customers');

  if (error) {
    console.error('Error fetching cohort sizes:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No data found in cohort_sizes view. You may need to run the rebuild script first.');
    return;
  }

  const calculatedData = {};
  for (const row of data) {
    const month = row.cohort_month;
    if (!calculatedData[month]) {
      calculatedData[month] = 0;
    }
    calculatedData[month] += row.new_customers;
  }

  console.log('\n## New Customer Count Verification (Product Cohort: ALL)');
  console.log('| Cohort Month | Calculated New Customers | Reference New Customers | Difference |');
  console.log('|--------------|--------------------------|-------------------------|------------|');

  const sortedMonths = Object.keys(referenceData).sort();

  for (const month of sortedMonths) {
    const calculated = calculatedData[month] || 0;
    const reference = referenceData[month];
    const difference = calculated - reference;
    console.log(`| ${month}      | ${String(calculated).padEnd(24)} | ${String(reference).padEnd(23)} | ${String(difference).padEnd(10)} |`);
  }
}

verifyNewCustomerCounts();
