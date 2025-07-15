import { NextRequest, NextResponse } from 'next/server';
import { fetchRankedOrders, calculateNthOrderCohort } from '@/lib/analytics/cohorts';

// This line forces the route to be dynamic and bypass any caching.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nStr = searchParams.get('n');
    let productFilter = searchParams.get('productFilter') || undefined;
    const targetYear = searchParams.get('year');

    // Validate required year parameter
    if (!targetYear) {
      return NextResponse.json({ message: 'Year parameter is required' }, { status: 400 });
    }

    const n = nStr ? parseInt(nStr, 10) : 2;
    if (isNaN(n) || n < 2) {
      return NextResponse.json({ message: 'Invalid "n" parameter. It must be an integer >= 2.' }, { status: 400 });
    }

    if (productFilter === 'ALL') {
      productFilter = undefined;
    }

    console.log('[API] Fetching ranked orders with params:', { targetYear, productFilter });

    // Step 1: Fetch ranked orders with the target year and product filter
    const rankedOrders = await fetchRankedOrders(targetYear, productFilter);
    console.log(`[API] Fetched ${rankedOrders.length} ranked orders`);
    
    // Step 2: Calculate cohort analysis based on the ranked orders
    const cohortData = calculateNthOrderCohort(rankedOrders, n);
    console.log(`[API] Calculated ${cohortData.length} cohort groups`);

    return NextResponse.json(cohortData);
  } catch (error) {
    console.error('[API] Error in retention analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      message: 'Internal Server Error', 
      error: errorMessage 
    }, { status: 500 });
  }
}