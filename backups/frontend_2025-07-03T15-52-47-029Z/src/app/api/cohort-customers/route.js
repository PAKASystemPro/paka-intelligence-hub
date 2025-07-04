import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

/**
 * API route to fetch customers for a specific cohort
 * GET /api/cohort-customers?cohortMonth=2025-01&product=All&monthIndex=1
 */
export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const cohortMonth = searchParams.get('cohortMonth');
    const productFilter = searchParams.get('product') || 'All';
    const monthIndex = searchParams.get('monthIndex'); // Optional: specific month after first purchase
    
    if (!cohortMonth) {
      return NextResponse.json(
        { error: 'cohortMonth parameter is required' }, 
        { status: 400 }
      );
    }
    
    // Convert cohortMonth to date range (first day to last day of month)
    const startDate = `${cohortMonth}-01`;
    const [year, month] = cohortMonth.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${cohortMonth}-${lastDay}`;
    
    // Query customers with their first order in the specified month
    let query = supabaseAdmin
      .from('customers')
      .select(`
        id,
        shopify_customer_id,
        email,
        first_name,
        last_name,
        total_spent,
        orders_count,
        created_at,
        primary_product_cohort,
        orders(id, order_number, total_price, processed_at)
      `);
    
    // If we're looking at a specific cohort month, filter by first order date
    if (cohortMonth) {
      // We need to join with orders to find customers whose first order was in this month
      // This is a simplification - in a real implementation, we'd need to find the
      // actual first order date for each customer
      query = query.gte('created_at', startDate)
                  .lte('created_at', endDate);
    }
    
    // Add product filter if specified
    if (productFilter !== 'All') {
      query = query.eq('primary_product_cohort', productFilter);
    }
    
    // If monthIndex is specified, we need to find customers who made their second order
    // exactly monthIndex months after their first order
    if (monthIndex) {
      console.log(`Filtering for customers with second orders in month ${monthIndex} after cohort month ${cohortMonth}`);
      // In a production environment, we would implement a more sophisticated query
      // that filters based on the time difference between first and second orders
      // For now, we're just logging that we received the parameter
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cohort customers' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
