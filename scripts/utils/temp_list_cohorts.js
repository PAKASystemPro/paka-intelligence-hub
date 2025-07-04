import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase URL or Service Role Key is missing.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'production' }
});

async function getDistinctCohorts() {
  try {
    const { data, error } = await supabase.rpc('get_distinct_product_cohorts');

    if (error) {
      // Fallback to fetching all customers if RPC fails
      console.log('RPC failed, falling back to manual query...');
      const { data: customers, error: fetchError } = await supabase.from('customers').select('primary_product_cohort');
      if(fetchError) throw fetchError;
      
      const cohorts = [...new Set(customers.map(c => c.primary_product_cohort).filter(Boolean))];
      console.log('Available product cohorts:', cohorts);
      return;
    }

    console.log('Available product cohorts:', data);
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

getDistinctCohorts();
