// /lib/analytics/cohorts.ts
// FINAL, VERIFIED SCRIPT: Corrects parameter names to match the database function.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as path from 'path';
import { format, differenceInCalendarMonths } from 'date-fns';

// Explicitly load the .env.local file from the project root
config({ path: path.resolve(__dirname, '../../.env.local') });

// Helper to create a Supabase client. This "lazy initialization" prevents connection errors.
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in .env.local');
  }
  return createClient(supabaseUrl, supabaseKey, { db: { schema: 'production' } });
}

// --- TYPE DEFINITIONS ---
export interface RankedOrder {
  customer_id: string;
  ordered_at: string;
  order_rank: number;
}
export interface DrilldownCustomer {
  customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  total_spent: number;
  initial_product_group: string;
}
interface ProcessedOrder { rank: number; date: Date; }
export interface CohortData {
  cohort_month: string;
  total_customers: number;
  total_retention: number;
  retention: {
    m0: number; m1: number; m2: number; m3: number; m4: number; m5: number;
    m6: number; m7: number; m8: number; m9: number; m10: number; m11: number;
    m12_plus: number;
  };
  retention_percentage: {
    m0: number; m1: number; m2: number; m3: number; m4: number; m5: number;
    m6: number; m7: number; m8: number; m9: number; m10: number; m11: number;
    m12_plus: number;
  };
}

// --- DATABASE FUNCTIONS ---
export async function fetchRankedOrders(targetFilter?: string, productFilter?: string): Promise<RankedOrder[]> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.rpc('get_ranked_customer_orders', {
      // Corrected parameter name
      target_filter: targetFilter,
      product_filter: productFilter
    });
    if (error) throw error;
    return (data as RankedOrder[]) || [];
  } catch (err) {
    console.error('Unexpected error in fetchRankedOrders:', err);
    throw err;
  }
}

export async function fetchCustomerDetails(customerIds: string[]): Promise<DrilldownCustomer[]> {
    const supabase = getSupabaseClient();
    if (customerIds.length === 0) return [];
    try {
        const { data, error } = await supabase.rpc('get_customer_details_by_ids', { customer_ids: customerIds });
        if (error) throw error;
        return (data as DrilldownCustomer[]) || [];
    } catch (err) {
        console.error('Unexpected error in fetchCustomerDetails:', err);
        throw err;
    }
}

// --- ANALYSIS FUNCTIONS ---
export function calculateNthOrderCohort(rankedOrders: RankedOrder[], n: number): CohortData[] {
  if (n < 2) throw new Error('N must be at least 2');

  const customerOrdersMap = new Map<string, ProcessedOrder[]>();
  for (const order of rankedOrders) {
    if (!customerOrdersMap.has(order.customer_id)) {
      customerOrdersMap.set(order.customer_id, []);
    }
    customerOrdersMap.get(order.customer_id)!.push({
      rank: order.order_rank,
      date: new Date(order.ordered_at)
    });
  }

  const baseCohort = new Map<string, { cohortMonth: string, previousOrderDate: Date }>();
  const nthOrderPurchasers = new Map<string, { previousOrderDate: Date, nthOrderDate: Date }>();

  for (const [customerId, orders] of customerOrdersMap.entries()) {
    orders.sort((a, b) => a.rank - b.rank);
    if (orders.length >= n - 1) {
      const firstOrderDate = orders[0].date;
      const cohortMonth = format(firstOrderDate, 'yyyy-MM');
      const previousOrderDate = orders[n - 2].date;
      baseCohort.set(customerId, { cohortMonth, previousOrderDate });
      
      if (orders.length >= n) {
        const nthOrderDate = orders[n - 1].date;
        nthOrderPurchasers.set(customerId, { previousOrderDate, nthOrderDate });
      }
    }
  }
  
  const cohortGroups = new Map<string, string[]>();
  for (const [customerId, { cohortMonth }] of baseCohort.entries()) {
    if (!cohortGroups.has(cohortMonth)) {
      cohortGroups.set(cohortMonth, []);
    }
    cohortGroups.get(cohortMonth)!.push(customerId);
  }

  const cohortData: CohortData[] = [];
  cohortGroups.forEach((customerIds, cohortMonth) => {
    const totalCustomers = customerIds.length;
    const retention = { m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12_plus: 0 };
    
    for (const customerId of customerIds) {
      if (nthOrderPurchasers.has(customerId)) {
        const { previousOrderDate, nthOrderDate } = nthOrderPurchasers.get(customerId)!;
        const monthsDifference = differenceInCalendarMonths(nthOrderDate, previousOrderDate);
        if (monthsDifference >= 0 && monthsDifference <= 11) {
          retention[`m${monthsDifference}` as keyof typeof retention]++;
        } else if (monthsDifference >= 12) {
          retention.m12_plus++;
        }
      }
    }

    const totalRetention = Object.values(retention).reduce((sum, count) => sum + count, 0);
    const retentionPercentage = {
        m0: totalCustomers > 0 ? (retention.m0 / totalCustomers) * 100 : 0, m1: totalCustomers > 0 ? (retention.m1 / totalCustomers) * 100 : 0, m2: totalCustomers > 0 ? (retention.m2 / totalCustomers) * 100 : 0,
        m3: totalCustomers > 0 ? (retention.m3 / totalCustomers) * 100 : 0, m4: totalCustomers > 0 ? (retention.m4 / totalCustomers) * 100 : 0, m5: totalCustomers > 0 ? (retention.m5 / totalCustomers) * 100 : 0,
        m6: totalCustomers > 0 ? (retention.m6 / totalCustomers) * 100 : 0, m7: totalCustomers > 0 ? (retention.m7 / totalCustomers) * 100 : 0, m8: totalCustomers > 0 ? (retention.m8 / totalCustomers) * 100 : 0,
        m9: totalCustomers > 0 ? (retention.m9 / totalCustomers) * 100 : 0, m10: totalCustomers > 0 ? (retention.m10 / totalCustomers) * 100 : 0, m11: totalCustomers > 0 ? (retention.m11 / totalCustomers) * 100 : 0,
        m12_plus: totalCustomers > 0 ? (retention.m12_plus / totalCustomers) * 100 : 0
    };
    
    cohortData.push({
      cohort_month: cohortMonth,
      total_customers: totalCustomers,
      total_retention: totalRetention,
      retention_percentage: retentionPercentage,
      retention
    });
  });
  
  return cohortData.sort((a, b) => a.cohort_month.localeCompare(b.cohort_month));
}

export function getDrilldownList(rankedOrders: RankedOrder[], targetCohortMonth: string, n: number, monthDiff: number): string[] {
    const customerOrdersMap = new Map<string, RankedOrder[]>();
    for (const order of rankedOrders) {
        if (!customerOrdersMap.has(order.customer_id)) {
            customerOrdersMap.set(order.customer_id, []);
        }
        customerOrdersMap.get(order.customer_id)!.push(order);
    }

    const drilldownCustomerIds: string[] = [];
    for (const [customerId, orders] of customerOrdersMap.entries()) {
        const sortedOrders = orders.sort((a, b) => a.order_rank - b.order_rank);
        const firstOrder = sortedOrders[0];
        if (!firstOrder || format(new Date(firstOrder.ordered_at), 'yyyy-MM') !== targetCohortMonth) {
            continue;
        }
        
        const prevOrder = sortedOrders[n - 2];
        const nthOrder = sortedOrders[n - 1];
        if (!prevOrder || !nthOrder) continue;

        const monthsBetween = differenceInCalendarMonths(new Date(nthOrder.ordered_at), new Date(prevOrder.ordered_at));
        const isMatch = (monthDiff === 12) ? monthsBetween >= 12 : monthsBetween === monthDiff;
        
        if (isMatch) {
            drilldownCustomerIds.push(customerId);
        }
    }
    return drilldownCustomerIds;
}

// --- MAIN TEST BLOCK ---
async function main() {
  try {
    const args = process.argv.slice(2);
    const targetFilter = args[0] || undefined;
    const n = args[1] ? parseInt(args[1], 10) : 2;
    const productFilter = args[2] || undefined;
    
    console.log(`--- Running Test for Filter=${targetFilter || 'All'}, N=${n}, Product=${productFilter || 'All'} ---`);

    const rankedOrders = await fetchRankedOrders(targetFilter, productFilter);
    console.log(`✓ Fetched ${rankedOrders.length} ranked orders.`);

    const cohortData = calculateNthOrderCohort(rankedOrders, n);
    console.log('--- Analysis Results ---');
    console.log(JSON.stringify(cohortData, null, 2));

    if (targetFilter && /^\d{4}-\d{2}$/.test(targetFilter)) {
      console.log(`\n--- Testing Drilldown for ${targetFilter} ---`);
      const drilldownCustomerIds = getDrilldownList(rankedOrders, targetFilter, n, 0);
      console.log(`✓ Found ${drilldownCustomerIds.length} customers in m0 drilldown list.`);
      if (drilldownCustomerIds.length > 0) {
        console.log('Fetching details for drilldown customers...');
        const drilldownCustomers = await fetchCustomerDetails(drilldownCustomerIds.slice(0, 5));
        console.log('Sample customers:');
        drilldownCustomers.forEach(c => {
          console.log(`  - ${c.email} (${c.first_name} ${c.last_name}) - Total Spent: ${c.total_spent}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  }
}

// Corrected main execution block call to match the updated test logic
if (require.main === module) {
  main();
}
