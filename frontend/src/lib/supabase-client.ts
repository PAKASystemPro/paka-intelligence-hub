import { createClient } from '@supabase/supabase-js';
import { CohortResponse } from './types';

// These are for client-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client for browser usage (with anon key)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'production' }
});

/**
 * Fetch cohort data from Supabase
 * 
 * @param {string} productType - Product type to filter by (optional)
 * @returns {Promise<Object>} - Cohort data
 */
export async function fetchCohortData(productType: string = 'All'): Promise<CohortResponse> {
  try {
    console.log(`Fetching cohort data for product: ${productType}`);
    const response = await fetch(`/api/query/cohort-data?product=${encodeURIComponent(productType)}`);

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully fetched data from API.');
    return data;

  } catch (error) {
    console.error('Error fetching cohort data:', error);
    // Return an empty structure on error to prevent UI crashes
    return { cohorts: [], grandTotal: { new_customers: 0, total_second_orders: 0, retention_percentage: 0 } };
  }
}

/**
 * Fetch customers for a specific cohort
 * 
 * @param {string} cohortMonth - Cohort month in YYYY-MM format
 * @param {number} monthIndex - Month index (0-11) to filter by
 * @param {string} productType - Product type to filter by (optional)
 * @returns {Promise<Array>} - List of customers
 */
export async function fetchCohortCustomers(cohortMonth: string, monthIndex: number, productType: string = 'All'): Promise<any[]> {
  try {
    const response = await fetch(`/api/query/cohort-customers?cohortMonth=${cohortMonth}&monthNumber=${monthIndex}&product=${encodeURIComponent(productType)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch cohort customers');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching cohort customers:', error);
    return [];
  }
}
