require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("🔴 Supabase URL or Service Role Key is missing. Make sure .env.local is configured correctly.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'production' }
});

async function clearProductCohorts() {
  console.log('🧹 Clearing all existing primary_product_cohort data...');

  try {
    const { count, error } = await supabase
      .from('customers')
      .update({ primary_product_cohort: null })
      .not('primary_product_cohort', 'is', null); // Only update rows that are not already null

    if (error) {
      throw error;
    }

    if (count === 0) {
        console.log('✅ All product cohorts were already clear. No changes made.');
    } else {
        console.log(`✨ Successfully cleared product cohorts for ${count} customers.`);
    }

  } catch (error) {
    console.error('🔴 An error occurred while clearing product cohorts:', error.message);
  }
}

clearProductCohorts();
