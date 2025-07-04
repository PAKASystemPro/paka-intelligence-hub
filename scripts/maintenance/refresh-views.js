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

async function refreshViews() {
  try {
    console.log('Starting materialized view refresh process...');

    // Step 1: Classify all new customers to assign them to a cohort
    console.log('Step 1: Classifying new customers...');
    const { error: classifyError } = await supabase.rpc('classify_new_customers');
    if (classifyError) {
      console.error('Error classifying customers:', classifyError.message);
      return; // Stop the process if classification fails
    }
    console.log('Successfully classified customers.');

    // Step 2: Refresh all materialized views to update cohort data
    console.log('\nStep 2: Refreshing materialized views...');
    const { error: refreshError } = await supabase.rpc('refresh_materialized_views');
    if (refreshError) {
      console.error('Error refreshing materialized views:', refreshError.message);
      return; // Stop the process if refresh fails
    }
    console.log('Successfully refreshed all materialized views.');

    console.log('\nMaterialized view refresh process completed!');

  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
  }
}

refreshViews();
