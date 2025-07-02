import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Get product filter from query params
    const { searchParams } = new URL(request.url);
    const productFilter = searchParams.get('product') || 'ALL';

    // Query the cohort heatmap view
    let query = supabaseAdmin
      .from('cohort_heatmap')
      .select('*');

    // Apply product filter if not 'ALL'
    if (productFilter !== 'ALL') {
      query = query.eq('primary_product_cohort', productFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cohort data:', error);
      return NextResponse.json({ error: 'Failed to fetch cohort data' }, { status: 500 });
    }

    // Calculate grand totals
    const grandTotal = {
      new_customers: 0,
      total_second_orders: 0,
      retention_percentage: 0,
      monthly_data: {}
    };

    data.forEach(row => {
      grandTotal.new_customers += row.new_customers;
      grandTotal.total_second_orders += row.total_second_orders;
    });

    // Calculate overall retention percentage
    grandTotal.retention_percentage = parseFloat(
      ((grandTotal.total_second_orders / grandTotal.new_customers) * 100).toFixed(1)
    );

    // Sort data by cohort month
    const sortedData = [...data].sort((a, b) => a.cohort_month.localeCompare(b.cohort_month));

    return NextResponse.json({
      cohorts: sortedData,
      grandTotal
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
