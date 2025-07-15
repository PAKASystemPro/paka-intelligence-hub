import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/analytics/cohorts';

// This line forces the route to be dynamic and bypass any caching.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Query to get the latest order date
    const { data, error } = await supabase
      .from('orders')
      .select('ordered_at')
      .order('ordered_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('[API] Supabase error:', error);
      return NextResponse.json({ 
        message: 'Database error', 
        error: error.message 
      }, { status: 500 });
    }
    
    const latestOrderDate = data && data.length > 0 ? data[0].ordered_at : null;
    
    return NextResponse.json({ latestOrderDate });
  } catch (error) {
    console.error('[API] Error fetching latest order date:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      message: 'Internal Server Error', 
      error: errorMessage 
    }, { status: 500 });
  }
}
