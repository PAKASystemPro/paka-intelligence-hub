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

    // Check if a month parameter was provided for more precise filtering
    const targetMonth = searchParams.get('month');
    
    // Get timezone adjustment parameter (defaults to 0)
    const tzOffsetHours = parseInt(searchParams.get('tzOffset') || '0', 10);
    
    // Create the filter value based on year and optional month
    const filterValue = targetMonth ? `${targetYear}-${targetMonth.padStart(2, '0')}` : targetYear;
    
    console.log('[API] Fetching ranked orders with params:', { 
      targetYear, 
      targetMonth, 
      filterValue, 
      productFilter 
    });

    // Step 1: Fetch ranked orders with the precise filter value and product filter
    const rankedOrders = await fetchRankedOrders(filterValue, productFilter);
    console.log(`[API] Fetched ${rankedOrders.length} ranked orders`);
    
    // Debug: Count unique customers in 2025-07 from ranked orders
    if (targetYear === '2025') {
      const uniqueCustomersJuly = new Set();
      
      // Account for timezone offset when counting customers for July
      rankedOrders.forEach(order => {
        // Create date with timezone adjustment
        const orderUtcDate = new Date(order.ordered_at);
        // Apply timezone offset to get local date
        const orderLocalDate = new Date(orderUtcDate.getTime() + (tzOffsetHours * 60 * 60 * 1000));
        
        if (orderLocalDate.getFullYear() === 2025 && orderLocalDate.getMonth() === 6 && order.order_rank === 1) {
          uniqueCustomersJuly.add(order.customer_id);
        }
      });
      
      console.log(`[API DEBUG] July 2025 unique first-time customers (with TZ offset ${tzOffsetHours}h): ${uniqueCustomersJuly.size}`);
    }
    
    // Step 2: Calculate cohort analysis based on the ranked orders
    const cohortData = calculateNthOrderCohort(rankedOrders, n);
    console.log(`[API] Calculated ${cohortData.length} cohort groups`);

    // Log debug info in the server console but don't include it in response
    const debugInfo = {
      totalRankedOrders: rankedOrders.length,
      cohortGroupsCount: cohortData.length,
      requestParams: {
        targetYear,
        targetMonth,
        filterValue,
        productFilter
      }
    };
    
    // If 2025 data is being requested, add the July unique customers count
    if (targetYear === '2025') {
      const uniqueCustomersJuly = new Set();
      rankedOrders.forEach(order => {
        // Create date with timezone adjustment
        const orderUtcDate = new Date(order.ordered_at);
        // Apply timezone offset to get local date
        const orderLocalDate = new Date(orderUtcDate.getTime() + (tzOffsetHours * 60 * 60 * 1000));
        
        if (orderLocalDate.getFullYear() === 2025 && orderLocalDate.getMonth() === 6 && order.order_rank === 1) {
          uniqueCustomersJuly.add(order.customer_id);
        }
      });
      console.log(`[API DEBUG] July 2025 unique first-time customers (with TZ offset ${tzOffsetHours}h): ${uniqueCustomersJuly.size}`);
    }
    
    // Log debug info to console
    console.log('[API DEBUG]', debugInfo);
    
    // Return only the cohortData array as before - maintain backward compatibility
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