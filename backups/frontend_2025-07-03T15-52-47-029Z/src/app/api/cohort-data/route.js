import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

/**
 * API route to fetch cohort data
 * GET /api/cohort-data?product=All&startDate=2025-01&endDate=2025-06
 */
export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const productFilter = searchParams.get('product') || 'All';
    const startDate = searchParams.get('startDate') || '2025-01';
    const endDate = searchParams.get('endDate') || '2025-06';

    // Call the appropriate RPC function based on whether a product filter is applied
    const { data, error } = productFilter === 'All'
      ? await supabaseAdmin.rpc('get_test_cohort_heatmap', { 
          start_date: `${startDate}-01`, 
          end_date: `${endDate}-28` 
        })
      : await supabaseAdmin.rpc('get_test_cohort_heatmap_by_product', { 
          product_type: productFilter,
          start_date: `${startDate}-01`, 
          end_date: `${endDate}-28` 
        });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cohort data' }, 
        { status: 500 }
      );
    }

    // Transform the data into the format needed for the heatmap
    const formattedData = formatCohortData(data || []);
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

/**
 * Formats raw cohort data from the database into the structure needed for the heatmap
 * 
 * @param {Array} rawData - Raw data from the database
 * @returns {Object} Formatted cohort data
 */
function formatCohortData(rawData) {
  // Initialize the result object with the expected structure
  const result = {};
  
  // Process each row from the database
  rawData.forEach(row => {
    const cohortMonth = row.cohort_month;
    
    // Initialize the month if it doesn't exist
    if (!result[cohortMonth]) {
      result[cohortMonth] = {
        newCustomers: 0,
        secondOrders: 0
      };
      
      // Initialize m0-m11 fields
      for (let i = 0; i <= 11; i++) {
        result[cohortMonth][`m${i}`] = 0;
      }
    }
    
    // Add customer counts
    result[cohortMonth].newCustomers = row.cohort_size || 0;
    result[cohortMonth].secondOrders = row.second_orders || 0;
    
    // Add monthly breakdown if available
    if (row.monthly_breakdown) {
      Object.entries(row.monthly_breakdown).forEach(([key, value]) => {
        if (key.startsWith('m') && !isNaN(parseInt(key.substring(1)))) {
          result[cohortMonth][key] = value;
        }
      });
    }
  });
  
  return result;
}
