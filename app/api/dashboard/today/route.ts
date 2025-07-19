// /app/api/dashboard/today/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Initialize the client with the correct schema settings
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // Use service key for admin access
    {
      db: { schema: 'production' } // Explicitly set schema to production
    }
  );

  try {
    // Call the function directly with the schema set to production
    const { data, error } = await supabase.rpc('get_today_dashboard_stats');
    
    if (error) {
      console.error('Error calling dashboard stats function:', error);
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Dashboard API error:', errorMessage);
    return NextResponse.json(
      { message: 'Internal Server Error', error: errorMessage },
      { status: 500 }
    );
  }
}
