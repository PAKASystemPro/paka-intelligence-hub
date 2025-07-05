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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyCohortFunction() {
  try {
    console.log('Calling get_cohort_analysis() database function...');
    const { data, error } = await supabase.rpc('get_cohort_analysis', {
      p_product_filter: 'ALL'
    });

    if (error) {
      console.error('Error calling RPC function:', error);
      return;
    }

    console.log('Successfully received data from the function.');
    // Find the July cohort
    const julyCohort = data.cohorts.find(c => c.cohort_month === '2025-07');

    if (julyCohort) {
        console.log('\n--- VERIFICATION SUCCESS ---');
        console.log('July cohort found in the function output:');
        console.log(JSON.stringify(julyCohort, null, 2));
    } else {
        console.error('\n--- VERIFICATION FAILED ---');
        console.error('July cohort was NOT found in the function output.');
        console.log('Full function output:');
        console.log(JSON.stringify(data, null, 2));
    }

  } catch (e) {
    console.error('An unexpected error occurred:', e);
  }
}

verifyCohortFunction();
