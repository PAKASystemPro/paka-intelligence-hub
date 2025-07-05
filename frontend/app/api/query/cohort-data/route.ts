import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // Get product filter from query params
    const { searchParams } = new URL(request.url);
    const productFilter = searchParams.get('product') || 'ALL';

    // Call the get_cohort_analysis function in the database
    const { data, error } = await supabaseAdmin.rpc('get_cohort_analysis', {
      p_product_filter: productFilter,
    });

    if (error) {
      console.error('Error calling get_cohort_analysis function:', error);
      return NextResponse.json({ error: 'Failed to fetch cohort data' }, { status: 500 });
    }

    // The function returns the exact JSON structure the frontend needs.
    // No further processing is required.
    return NextResponse.json(data);

  } catch (error) {
    console.error('Unexpected error in cohort-data route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
