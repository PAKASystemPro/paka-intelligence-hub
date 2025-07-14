import { createClient } from '@supabase/supabase-js';

import { format, parse, differenceInCalendarMonths } from 'date-fns';



// Initialize Supabase client

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {

auth: {

persistSession: false,

},

db: {

schema: 'production',

},

});



/**

* Interface for ranked customer orders

*/

interface RankedOrder {

customer_id: string;

ordered_at: string;

order_rank: number;

}



/**

* Interface for processed customer order data

*/

interface ProcessedOrder {

rank: number;

date: Date;

}



/**

* Interface for customer details used in drilldown views

*/
export interface DrilldownCustomer {
  customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  total_spent: number;
  initial_product_group: string;
}

/**

* Interface for cohort analysis data

*/

interface CohortData {

cohort_month: string;

total_customers: number;

retention: {

m0: number;

m1: number;

m2: number;

m3: number;

m4: number;

m5: number;

m6: number;

m7: number;

m8: number;

m9: number;

m10: number;

m11: number;

m12_plus: number;

};

retention_percentage: {

m0: number;

m1: number;

m2: number;

m3: number;

m4: number;

m5: number;

m6: number;

m7: number;

m8: number;

m9: number;

m10: number;

m11: number;

m12_plus: number;

};

}



/**

* Fetches ranked orders for all customers, optionally filtered by cohort month and product filter

* @param cohortMonth Optional string in 'YYYY-MM' format to filter for a specific cohort

* @param productFilter Optional string to filter by initial product group

* @returns Array of ranked customer orders

* @throws Error if the RPC call fails

*/

export async function fetchRankedOrders(cohortMonth?: string, productFilter?: string): Promise<RankedOrder[]> {

try {

const { data, error } = await supabase.rpc('get_ranked_customer_orders', {

target_month: cohortMonth,

product_filter: productFilter

});


if (error) {

console.error('Error fetching ranked customer orders:', error);

throw new Error(`Failed to fetch ranked customer orders: ${error.message}`);

}


if (!data) {

console.warn('No ranked customer orders returned');

return [];

}


return data as RankedOrder[];

} catch (err) {

console.error('Unexpected error in fetchRankedOrders:', err);

throw new Error(`Unexpected error in fetchRankedOrders: ${err instanceof Error ? err.message : String(err)}`);

}

}



/**

* Calculates Nth order cohort analysis based on ranked customer orders

* @param rankedOrders Array of ranked customer orders

* @param n The order number to analyze (e.g., 2 for 2nd order)

* @returns Array of cohort data objects

*/

export function calculateNthOrderCohort(rankedOrders: RankedOrder[], n: number): CohortData[] {

if (n < 2) {

throw new Error('N must be at least 2 (for 2nd order analysis)');

}


// Step 1: Prepare the data - group orders by customer

const customerOrdersMap = new Map<string, ProcessedOrder[]>();


for (const order of rankedOrders) {

const customerId = order.customer_id;

const orderDate = parse(order.ordered_at.split('T')[0], 'yyyy-MM-dd', new Date());


if (!customerOrdersMap.has(customerId)) {

customerOrdersMap.set(customerId, []);

}


customerOrdersMap.get(customerId)!.push({

rank: order.order_rank,

date: orderDate

});

}


// Ensure orders are sorted by rank for each customer

for (const [customerId, orders] of customerOrdersMap.entries()) {

customerOrdersMap.set(

customerId,

orders.sort((a, b) => a.rank - b.rank)

);

}


// Step 2: Identify the base cohort (customers with at least n-1 orders)

// and Step 3: Identify the Nth order purchasers

const baseCohort = new Map<string, { cohortMonth: string, previousOrderDate: Date }>();

const nthOrderPurchasers = new Map<string, { previousOrderDate: Date, nthOrderDate: Date }>();


for (const [customerId, orders] of customerOrdersMap.entries()) {

// Check if customer has at least n-1 orders (base cohort)

if (orders.length >= n - 1) {

// Get the first order date to determine cohort month

const firstOrderDate = orders[0].date;

const cohortMonth = format(firstOrderDate, 'yyyy-MM');


// Get the n-1 order date (starting point for retention window)

const previousOrderDate = orders[n - 2].date;


baseCohort.set(customerId, { cohortMonth, previousOrderDate });


// Check if customer also has the nth order (for retention calculation)

if (orders.length >= n) {

const nthOrderDate = orders[n - 1].date;

nthOrderPurchasers.set(customerId, { previousOrderDate, nthOrderDate });

}

}

}


// Step 4: Group by cohort month

const cohortGroups = new Map<string, string[]>();


for (const [customerId, { cohortMonth }] of baseCohort.entries()) {

if (!cohortGroups.has(cohortMonth)) {

cohortGroups.set(cohortMonth, []);

}

cohortGroups.get(cohortMonth)!.push(customerId);

}


// Step 5: Calculate retention for each cohort

const cohortData: CohortData[] = [];


cohortGroups.forEach((customerIds, cohortMonth) => {

const totalCustomers = customerIds.length;


// Initialize retention counters with m12_plus

const retention = {

m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0,

m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0,

m12_plus: 0

};


// Count customers with nth orders and calculate retention

for (const customerId of customerIds) {

if (nthOrderPurchasers.has(customerId)) {

const { previousOrderDate, nthOrderDate } = nthOrderPurchasers.get(customerId)!;


// Calculate months between n-1 and nth order

const monthsDifference = differenceInCalendarMonths(nthOrderDate, previousOrderDate);


// Increment the appropriate month counter

if (monthsDifference >= 0 && monthsDifference <= 11) {

retention[`m${monthsDifference}` as keyof typeof retention]++;

} else if (monthsDifference >= 12) {

retention.m12_plus++;

}

}

}


// Calculate retention percentages

const retention_percentage = {

m0: totalCustomers > 0 ? (retention.m0 / totalCustomers) * 100 : 0,

m1: totalCustomers > 0 ? (retention.m1 / totalCustomers) * 100 : 0,

m2: totalCustomers > 0 ? (retention.m2 / totalCustomers) * 100 : 0,

m3: totalCustomers > 0 ? (retention.m3 / totalCustomers) * 100 : 0,

m4: totalCustomers > 0 ? (retention.m4 / totalCustomers) * 100 : 0,

m5: totalCustomers > 0 ? (retention.m5 / totalCustomers) * 100 : 0,

m6: totalCustomers > 0 ? (retention.m6 / totalCustomers) * 100 : 0,

m7: totalCustomers > 0 ? (retention.m7 / totalCustomers) * 100 : 0,

m8: totalCustomers > 0 ? (retention.m8 / totalCustomers) * 100 : 0,

m9: totalCustomers > 0 ? (retention.m9 / totalCustomers) * 100 : 0,

m10: totalCustomers > 0 ? (retention.m10 / totalCustomers) * 100 : 0,

m11: totalCustomers > 0 ? (retention.m11 / totalCustomers) * 100 : 0,

m12_plus: totalCustomers > 0 ? (retention.m12_plus / totalCustomers) * 100 : 0

};


// Add cohort data to results

cohortData.push({

cohort_month: cohortMonth,

total_customers: totalCustomers,

retention,

retention_percentage

});

});


// Step 6: Sort cohorts by month (ascending) and return

return cohortData.sort((a, b) => a.cohort_month.localeCompare(b.cohort_month));

}

/**
 * Gets a list of customer IDs for drilldown from the ranked orders
 * @param rankedOrders Array of ranked customer orders
 * @param targetCohortMonth The cohort month to filter for in YYYY-MM format
 * @param n The order number to analyze (e.g., 2 for 2nd order)
 * @param monthDiff The month difference bucket to filter for (0-11, or 12 for 12+ months)
 * @returns Array of customer IDs that match the criteria
 */
export function getDrilldownList(rankedOrders: RankedOrder[], targetCohortMonth: string, n: number, monthDiff: number): string[] {
  // Group orders by customer
  const customerOrdersMap = new Map<string, RankedOrder[]>();
  
  for (const order of rankedOrders) {
    if (!customerOrdersMap.has(order.customer_id)) {
      customerOrdersMap.set(order.customer_id, []);
    }
    customerOrdersMap.get(order.customer_id)!.push(order);
  }
  
  // Find customers who match the criteria
  const drilldownCustomerIds: string[] = [];
  
  for (const [customerId, orders] of customerOrdersMap.entries()) {
    // Sort orders by rank to ensure correct order
    const sortedOrders = orders.sort((a, b) => a.order_rank - b.order_rank);
    
    // Check if customer belongs to the target cohort month
    const firstOrder = sortedOrders.find(o => o.order_rank === 1);
    if (!firstOrder || firstOrder.ordered_at.substring(0, 7) !== targetCohortMonth) {
      continue;
    }
    
    // Check if customer has both n-1 and nth order
    const prevOrder = sortedOrders.find(o => o.order_rank === n - 1);
    const nthOrder = sortedOrders.find(o => o.order_rank === n);
    
    if (!prevOrder || !nthOrder) {
      continue;
    }
    
    // Calculate months between n-1 and nth order
    const prevOrderDate = new Date(prevOrder.ordered_at);
    const nthOrderDate = new Date(nthOrder.ordered_at);
    const monthsBetween = differenceInCalendarMonths(nthOrderDate, prevOrderDate);
    
    // Check if the month difference matches the requested bucket
    const isMatch = (monthDiff === 12) 
      ? monthsBetween >= 12 
      : monthsBetween === monthDiff;
    
    if (isMatch) {
      drilldownCustomerIds.push(customerId);
    }
  }
  
  return drilldownCustomerIds;
}

/**
 * Fetches detailed customer information for a list of customer IDs
 * @param customerIds Array of customer IDs to fetch details for
 * @returns Array of customer details
 */
export async function fetchCustomerDetails(customerIds: string[]): Promise<DrilldownCustomer[]> {
  if (customerIds.length === 0) {
    return [];
  }
  
  try {
    const { data, error } = await supabase.rpc('get_customer_details_by_ids', { 
      customer_ids: customerIds 
    });
    
    if (error) {
      console.error('Error fetching customer details:', error);
      throw new Error(`Failed to fetch customer details: ${error.message}`);
    }
    
    if (!data) {
      console.warn('No customer details returned');
      return [];
    }
    
    return data as DrilldownCustomer[];
  } catch (err) {
    console.error('Unexpected error in fetchCustomerDetails:', err);
    throw new Error(`Unexpected error in fetchCustomerDetails: ${err instanceof Error ? err.message : String(err)}`);
  }
}


/**

* Prints usage information for the script

*/

function printUsage() {

console.log('Usage: npx tsx lib/analytics/cohorts.ts [cohortMonth] [n] [productFilter]');

console.log('');

console.log('Arguments:');

console.log(' cohortMonth - Optional. The cohort month to analyze in YYYY-MM format (e.g., "2025-01")');

console.log(' If not provided, all cohorts will be analyzed.');

console.log(' n - Optional. The order number to analyze (e.g., "2" for 2nd order retention)');

console.log(' Defaults to 2 if not provided.');

console.log(' productFilter - Optional. Filter by initial product group (e.g., "深睡寶寶")');

console.log(' If not provided, all products will be included.');

console.log('');

console.log('Examples:');

console.log(' npx tsx lib/analytics/cohorts.ts # Analyze all cohorts, 2nd order retention');

console.log(' npx tsx lib/analytics/cohorts.ts 2025-01 # Analyze January 2025 cohort, 2nd order retention');

console.log(' npx tsx lib/analytics/cohorts.ts 2025-01 3 # Analyze January 2025 cohort, 3rd order retention');

console.log(' npx tsx lib/analytics/cohorts.ts 2025-01 2 "深睡寶寶" # Analyze January 2025 cohort, 2nd order retention, only for 深睡寶寶 product');

console.log(' npx tsx lib/analytics/cohorts.ts "" 3 # Analyze all cohorts, 3rd order retention');

}



/**

* Main function to run the Nth order cohort analysis with command-line arguments

*/

async function main() {

try {

// Parse command-line arguments

const args = process.argv.slice(2);

const cohortMonth = args[0] && args[0] !== "" ? args[0] : undefined;

const nArg = args[1] ? parseInt(args[1], 10) : 2;

const productFilter = args[2] || undefined;


// Validate n argument

if (isNaN(nArg) || nArg < 2) {

console.error('❌ Error: n must be a number greater than or equal to 2');

printUsage();

process.exit(1);

}


// Print analysis header

console.log('=== PAKA Nth Order Retention Cohort Analysis ===');

console.log(`Cohort: ${cohortMonth || 'All cohorts'}`);

console.log(`Analyzing: ${nArg}${getOrdinalSuffix(nArg)} order retention`);

if (productFilter) {

console.log(`Product Filter: ${productFilter}`);

}

console.log('');


// Step 1: Fetch ranked customer orders

console.log('1. Fetching ranked customer orders from database...');

const rankedOrders = await fetchRankedOrders(cohortMonth, productFilter);

console.log(` ✓ Retrieved ${rankedOrders.length} ranked orders`);


// Step 2: Calculate Nth order cohort analysis

console.log(`2. Calculating ${nArg}${getOrdinalSuffix(nArg)} order cohort analysis...`);

const cohortData = calculateNthOrderCohort(rankedOrders, nArg);

console.log(` ✓ Generated analysis for ${cohortData.length} cohorts`);


// Step 3: Display the results

console.log('3. Cohort Analysis Results:');

console.log(JSON.stringify(cohortData, null, 2));

// Step 4: Test drilldown functionality if a specific cohort is provided
if (cohortMonth) {
  console.log('\n4. Testing Drilldown Functionality:');
  
  // Test drilldown for month 0 (same month)
  const m0CustomerIds = getDrilldownList(rankedOrders, cohortMonth, nArg, 0);
  console.log(` ✓ Found ${m0CustomerIds.length} customers who made their ${nArg}${getOrdinalSuffix(nArg)} order in the same month (m0)`);
  
  // Test drilldown for month 1
  const m1CustomerIds = getDrilldownList(rankedOrders, cohortMonth, nArg, 1);
  console.log(` ✓ Found ${m1CustomerIds.length} customers who made their ${nArg}${getOrdinalSuffix(nArg)} order 1 month later (m1)`);
  
  // If we have customers in m0, fetch their details as a sample
  if (m0CustomerIds.length > 0) {
    console.log('\n5. Sample Customer Details for m0 Drilldown:');
    const customerDetails = await fetchCustomerDetails(m0CustomerIds.slice(0, 5)); // Get up to 5 customers
    
    if (customerDetails.length > 0) {
      customerDetails.forEach((customer, index) => {
        console.log(`\nCustomer ${index + 1}:`);
        console.log(` - Email: ${customer.email}`);
        console.log(` - Name: ${customer.first_name} ${customer.last_name}`);
        console.log(` - Total Spent: ${customer.total_spent}`);
        console.log(` - Initial Product: ${customer.initial_product_group}`);
      });
    } else {
      console.log(' No customer details available');
    }
  }
}

console.log('\n=== Analysis Complete ===');

} catch (error) {

console.error('❌ Error in analysis process:', error);

process.exit(1);

}

}



/**

* Helper function to get the ordinal suffix for a number (1st, 2nd, 3rd, etc.)

*/

function getOrdinalSuffix(n: number): string {

if (n >= 11 && n <= 13) {

return 'th';

}


switch (n % 10) {

case 1: return 'st';

case 2: return 'nd';

case 3: return 'rd';

default: return 'th';

}

}



// Run the main function if this file is executed directly

if (require.main === module) {

main();

}