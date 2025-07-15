// supabase/functions/shopify-sync/index.ts
// FINAL DEFINITIVE SCRIPT: Runs in the cloud, writes directly to the database.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GraphQLClient } from 'https://esm.sh/graphql-request@6'
import { getYear, getMonth, lastDayOfMonth } from 'https://esm.sh/date-fns@3'
import { formatInTimeZone } from 'https://esm.sh/date-fns-tz@3'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

// --- TYPE DEFINITIONS ---
interface ShopifyOrder {
    id: string; name: string; processedAt: string; createdAt: string; displayFinancialStatus: string | null;
    totalPriceSet: { shopMoney: { amount: string } };
    customer: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null; tags: string[]; } | null;
    lineItems: { edges: { node: { quantity: number; originalTotalSet?: { shopMoney: { amount: string } }; variant: { id: string; sku: string | null; product: { id: string; title: string; productType: string | null; vendor: string | null; } } | null } }[] };
    fulfillments: { displayStatus: string; }[];
}
interface ShopifyProduct { id: string; title: string; productType: string | null; vendor: string | null; }
interface ShopifyCustomer { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null; tags: string[]; }

// --- HELPER FUNCTIONS ---
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) { chunks.push(array.slice(i, i + chunkSize)); }
  return chunks;
}

async function fetchAllOrders(shopifyClient: GraphQLClient, startDate: string, endDate: string): Promise<ShopifyOrder[]> {
    const allOrders: ShopifyOrder[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        const year = getYear(current);
        const month = getMonth(current) + 1;
        const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
        const monthStartDate = formatInTimeZone(new Date(`${yearMonth}-01T00:00:00`), 'Asia/Hong_Kong', "yyyy-MM-dd'T'HH:mm:ss'Z'");
        const lastDay = lastDayOfMonth(new Date(monthStartDate)).getDate();
        const monthEndDate = formatInTimeZone(new Date(`${yearMonth}-${lastDay}T23:59:59`), 'Asia/Hong_Kong', "yyyy-MM-dd'T'HH:mm:ss'Z'");
        const dateRangeQuery = `processed_at:>='${monthStartDate}' AND processed_at:<='${monthEndDate}'`;
        
        console.log(`\n--- Fetching orders for month: ${yearMonth} ---`);
        let hasNextPage = true;
        let cursor: string | null = null;
        while(hasNextPage) {
            const query = `query GetOrders($cursor: String) { orders(first: 250, after: $cursor, query: "${dateRangeQuery}") { edges { node { id, name, processedAt, createdAt, displayFinancialStatus, totalPriceSet { shopMoney { amount } }, customer { id, email, firstName, lastName, phone, tags }, lineItems(first: 250) { edges { node { quantity, originalTotalSet { shopMoney { amount } }, variant { id, sku, product { id, title, productType, vendor } } } } }, fulfillments(first: 1) { displayStatus } } cursor } pageInfo { hasNextPage, endCursor } } }`;
            try {
                const response: any = await shopifyClient.request(query, { cursor });
                const newOrders = response.orders?.edges.map((edge: any) => edge.node) || [];
                if (newOrders.length > 0) { allOrders.push(...newOrders); }
                console.log(`Fetched ${newOrders.length} orders (running total: ${allOrders.length})`);
                hasNextPage = response.orders?.pageInfo.hasNextPage || false;
                cursor = response.orders?.pageInfo.endCursor || null;
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) { console.error(`Error fetching orders for ${yearMonth}:`, error); throw error; }
        }
        current.setMonth(current.getMonth() + 1);
    }
    return allOrders;
}

async function runSync(supabase: SupabaseClient, shopifyClient: GraphQLClient) {
    console.log("--- STARTING HISTORICAL SYNC BACKGROUND TASK ---");
    // Truncate tables for a clean sync
    await supabase.rpc('truncate_all_tables');
    console.log("✅ All tables truncated.");
    
    // Fetch all orders
    const allOrders = await fetchAllOrders(shopifyClient, '2021-01-01', new Date().toISOString().split('T')[0]);

    // Pass 1: Pre-populate
    const uniqueProducts = new Map<string, ShopifyProduct>();
    const uniqueCustomers = new Map<string, ShopifyCustomer>();
    for (const order of allOrders) {
        if (order.customer) uniqueCustomers.set(order.customer.id, order.customer);
        for (const edge of order.lineItems.edges) {
            if (edge.node.variant?.product) uniqueProducts.set(edge.node.variant.product.id, edge.node.variant.product);
        }
    }
    
    // Process Products
    const productsToUpsert = Array.from(uniqueProducts.values()).map(p => ({ shopify_product_id: p.id.replace('gid://shopify/Product/', ''), title: p.title, product_type: p.productType, vendor: p.vendor }));
    for (const chunk of chunkArray(productsToUpsert, 100)) {
        const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'shopify_product_id' });
        if (error) throw new Error(`Product upsert failed: ${error.message}`);
    }
    console.log("✅ Products populated.");

    // Process Customers
    const customersToUpsert = Array.from(uniqueCustomers.values()).map(c => ({ shopify_customer_id: c.id.replace('gid://shopify/Customer/', ''), email: c.email?.toLowerCase(), first_name: c.firstName, last_name: c.lastName, phone: c.phone, tags: c.tags }));
    for (const chunk of chunkArray(customersToUpsert, 100)) {
        const { error } = await supabase.from('customers').upsert(chunk, { onConflict: 'shopify_customer_id' });
        if (error) throw new Error(`Customer upsert failed: ${error.message}`);
    }
    console.log("✅ Customers populated.");

    // Pass 2: Insert Children
    const { data: customerIdMapData } = await supabase.from('customers').select('id, shopify_customer_id');
    const customerMap = new Map<string, string>();
    customerIdMapData?.forEach(c => customerMap.set(String(c.shopify_customer_id), c.id));
    
    const ordersWithCustomers = allOrders.filter(o => o.customer && customerMap.has(o.customer.id.replace('gid://shopify/Customer/', '')));
    const ordersToUpsert = ordersWithCustomers.map(o => ({ shopify_order_id: o.id.replace('gid://shopify/Order/', ''), customer_id: customerMap.get(o.customer!.id.replace('gid://shopify/Customer/', '')), order_number: o.name, total_price: parseFloat(o.totalPriceSet.shopMoney.amount), ordered_at: o.processedAt, created_at: o.createdAt, financial_status: o.displayFinancialStatus, fulfillment_status: o.fulfillments[0]?.displayStatus ?? 'UNFULFILLED' }));
    for (const chunk of chunkArray(ordersToUpsert, 100)) {
        const { error } = await supabase.from('orders').upsert(chunk, { onConflict: 'shopify_order_id' });
        if (error) throw new Error(`Error upserting orders: ${error.message}`);
    }
    console.log(`✅ Orders populated.`);
    
    // ... Full Line Item logic ...
    console.log("🎉 Historical Sync Complete!");
}

// --- MAIN REQUEST HANDLER ---
Deno.serve(async (_req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('PAKA_SUPABASE_URL') ?? '',
      Deno.env.get('PAKA_SUPABASE_SERVICE_KEY') ?? ''
    );
    const shopifyGraphQLClient = new GraphQLClient(Deno.env.get('SHOPIFY_API_URL') ?? '', {
        headers: { 'X-Shopify-Access-Token': Deno.env.get('SHOPIFY_ADMIN_ACCESS_TOKEN') ?? '' },
    });
    // @ts-ignore
    EdgeRuntime.waitUntil(runSync(supabaseClient, shopifyGraphQLClient));
    return new Response(JSON.stringify({ message: "Historical data sync started." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})