import { supabaseAdmin } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = supabaseAdmin;
  const { searchParams } = new URL(req.url);
  const cohortMonth = searchParams.get('cohort_month');
  const productFilter = searchParams.get('product_filter') || 'ALL';

  if (!cohortMonth) {
    return NextResponse.json({ error: 'Cohort month is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc('get_cohort_opportunity_customers', {
      p_cohort_month: cohortMonth,
      p_product_filter: productFilter,
    });

    if (error) {
      console.error('Error fetching opportunity customers:', error);
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: `Failed to fetch opportunity customers: ${errorMessage}` }, { status: 500 });
  }
}
