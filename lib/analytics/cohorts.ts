import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  db: {
    schema: 'production',
  },
});

/**
 * Interface for cohort analysis data returned by the SQL function.
 */
export interface CohortData {
  cohort_month: string;
  total_customers: number;
  total_retention: number;
  total_retention_percentage: number;
  retention: {
    m0: number; m1: number; m2: number; m3: number; m4: number; m5: number;
    m6: number; m7: number; m8: number; m9: number; m10: number; m11: number;
    m12_plus: number;
  };
  retention_percentage: {
    m0: number; m1: number; m2: number; m3: number; m4: number; m5: number;
    m6: number; m7: number; m8: number; m9: number; m10: number; m11: number;
    m12_plus: number;
  };
}

/**
 * Fetches Nth order cohort analysis data directly from the database.
 * @param n The order number to analyze (e.g., 2 for 2nd order).
 * @param productFilter Optional string to filter orders by product type.
 * @returns Array of cohort data objects.
 * @throws Error if the RPC call fails.
 */
export async function fetchCohortAnalysis(n: number, productFilter?: string): Promise<CohortData[]> {
  try {
    const { data, error } = await supabase.rpc('calculate_nth_order_cohorts', {
      n_value: n,
      product_filter: productFilter
    });

    if (error) {
      console.error('Error fetching cohort analysis:', error);
      throw new Error(`Failed to fetch cohort analysis: ${error.message}`);
    }

    return (data as CohortData[]) || [];
  } catch (err) {
    console.error('Unexpected error in fetchCohortAnalysis:', err);
    throw new Error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }
}