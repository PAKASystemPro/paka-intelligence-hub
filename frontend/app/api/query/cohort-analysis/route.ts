import { supabaseAdmin } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const productFilter = searchParams.get('product_filter') || 'ALL';

  const supabase = supabaseAdmin;

  const { data, error } = await supabase.rpc('get_cohort_analysis_data', {
    p_product_filter: productFilter,
  });

  if (error) {
    // Log the full error to the server console for debugging
    console.error('Supabase RPC error:', JSON.stringify(error, null, 2));

    // Return a detailed error response to the client
    return new NextResponse(
      JSON.stringify({
        message: 'An error occurred with the database function.',
        details: error.message,
        hint: error.hint,
        code: error.code,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return NextResponse.json(data);
}
