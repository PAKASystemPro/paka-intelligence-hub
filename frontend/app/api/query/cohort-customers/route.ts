import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cohortMonth = searchParams.get('cohortMonth');
  const monthNumberStr = searchParams.get('monthNumber');
  const productType = searchParams.get('product') || 'ALL';

  if (!cohortMonth || !monthNumberStr) {
    return NextResponse.json({ error: 'Missing required parameters: cohortMonth and monthNumber' }, { status: 400 });
  }

  const monthNumber = parseInt(monthNumberStr, 10);
  if (isNaN(monthNumber)) {
    return NextResponse.json({ error: 'Invalid monthNumber parameter' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('get_cohort_customers', {
      p_cohort_month: cohortMonth,
      p_month_number: monthNumber,
      p_product_filter: productType,
    });

    if (error) {
      console.error('Error calling get_cohort_customers function:', error);
      return NextResponse.json({ error: 'Failed to fetch cohort customers' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('Unexpected error in cohort-customers API route:', e);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
