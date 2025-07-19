import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/analytics/cohorts';

// This line forces the route to be dynamic and bypass any caching.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cohortMonth = searchParams.get('cohortMonth');
    const nStr = searchParams.get('n');
    let productFilter = searchParams.get('productFilter') || undefined;

    // Validate required cohortMonth parameter
    if (!cohortMonth) {
      const headers = new Headers();
      headers.append('Cache-Control', 'no-store, max-age=0');
      headers.append('Pragma', 'no-cache');
      
      return NextResponse.json({ message: 'cohortMonth parameter is required' }, { status: 400, headers });
    }

    // Validate cohortMonth format (YYYY-MM)
    const cohortMonthRegex = /^\d{4}-\d{2}$/;
    if (!cohortMonthRegex.test(cohortMonth)) {
      const headers = new Headers();
      headers.append('Cache-Control', 'no-store, max-age=0');
      headers.append('Pragma', 'no-cache');
      
      return NextResponse.json({ 
        message: 'Invalid cohortMonth format. Must be YYYY-MM (e.g., 2025-01)' 
      }, { status: 400, headers });
    }

    // Parse and validate n parameter
    const n = nStr ? parseInt(nStr, 10) : 2;
    if (isNaN(n) || n < 2) {
      const headers = new Headers();
      headers.append('Cache-Control', 'no-store, max-age=0');
      headers.append('Pragma', 'no-cache');
      
      return NextResponse.json({ 
        message: 'Invalid "n" parameter. It must be an integer >= 2.' 
      }, { status: 400, headers });
    }

    // Handle special "ALL" product filter case
    if (productFilter === 'ALL') {
      productFilter = undefined;
    }

    console.log('[API] Fetching opportunity customers with params:', { cohortMonth, n, productFilter });

    // Call the Supabase function
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .rpc('get_cohort_opportunity_customers', {
        target_cohort_month: cohortMonth,
        n,
        product_filter: productFilter
      });

    if (error) {
      console.error('[API] Supabase error:', error);
      const headers = new Headers();
      headers.append('Cache-Control', 'no-store, max-age=0');
      headers.append('Pragma', 'no-cache');
      
      return NextResponse.json({ 
        message: 'Database error', 
        error: error.message 
      }, { status: 500, headers });
    }

    console.log(`[API] Found ${data?.length || 0} opportunity customers`);
    
    // Add cache control headers to prevent browser caching
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, max-age=0');
    headers.append('Pragma', 'no-cache');
    
    return NextResponse.json(data || [], { headers });
  } catch (error) {
    console.error('[API] Error in opportunity customer list:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, max-age=0');
    headers.append('Pragma', 'no-cache');
    
    return NextResponse.json({ 
      message: 'Internal Server Error', 
      error: errorMessage 
    }, { status: 500, headers });
  }
}
