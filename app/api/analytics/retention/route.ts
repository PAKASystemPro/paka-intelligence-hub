import { NextRequest, NextResponse } from 'next/server';
import { fetchCohortAnalysis } from '@/lib/analytics/cohorts';

// This line forces the route to be dynamic and bypass any caching.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nStr = searchParams.get('n');
    let productFilter = searchParams.get('productFilter') || undefined;

    const n = nStr ? parseInt(nStr, 10) : 2;
    if (isNaN(n) || n < 2) {
      return NextResponse.json({ message: 'Invalid "n" parameter. It must be an integer >= 2.' }, { status: 400 });
    }

    if (productFilter === 'ALL') {
      productFilter = undefined;
    }

    console.log('[API] Fetching cohort analysis with params:', { n, productFilter });

    const cohortData = await fetchCohortAnalysis(n, productFilter);
    
    console.log(`[API] fetchCohortAnalysis returned ${cohortData.length} cohort groups.`);

    return NextResponse.json(cohortData);
  } catch (error) {
    console.error('[API] Error fetching cohort analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}