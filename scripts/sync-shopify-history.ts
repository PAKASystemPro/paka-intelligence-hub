// scripts/sync-shopify-history.ts
// FINAL DEFINITIVE SCRIPT: Fetches and loads all raw data correctly.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fetch } from 'undici';
import { GraphQLClient } from 'graphql-request';
import { getYear, getMonth, lastDayOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import * as path from 'path';

// --- SETUP ---
config({ path: path.resolve(process.cwd(), '.env.local') });
const { SHOPIFY_API_URL, SHOPIFY_ADMIN_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SHOPIFY_API_URL || !SHOPIFY_ADMIN_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required environment variables.');
}

const shopifyClient = new GraphQLClient(SHOPIFY_API_URL, {
  headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN },
  fetch: fetch as any,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  global: { fetch: fetch as any },
  db: { schema: 'production' }
});

// --- TYPE DEFINITIONS ---
interface ShopifyOrder {
  id: string; name: string; processedAt: string; createdAt: string; displayFinancialStatus: string | null;
  totalPriceSet: { shopMoney: { amount: string } };
  customer: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null; tags: string[]; } | null;
  lineItems: { edges: { node: { title: string; quantity: number; originalTotalSet?: { shopMoney: { amount: string } }; variant: { id: string; sku: string | null; product: { id: string; title: string; productType: string | null; vendor: string | null; } } | null } }[] };
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

async function fetchAllOrders(startDate: string, endDate: string): Promise<ShopifyOrder[]> {
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
    while (hasNextPage) {
      const query = `
        query GetOrders($cursor: String) {
          orders(first: 250, after: $cursor, query: "${dateRangeQuery}") {
            edges {
              node {
                id, name, processedAt, createdAt, displayFinancialStatus,
                totalPriceSet { shopMoney { amount } },
                customer { id, email, firstName, lastName, phone, tags },
                lineItems(first: 250) { edges { node { title, quantity, originalTotalSet { shopMoney { amount } }, variant { id, sku, product { id, title, productType, vendor } } } } },
                fulfillments(first: 1) { displayStatus }
              }
              cursor
            }
            pageInfo { hasNextPage, endCursor }
          }
        }`;
      try {
        const response = await shopifyClient.request<{ orders: any }>(query, { cursor });
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

async function syncData(startDate: string, endDate: string) {
  await supabase.from('order_line_items').delete().neq('order_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("✅ All tables truncated successfully.");

  const allOrders = await fetchAllOrders(startDate, endDate);
  console.log(`\nFetched a total of ${allOrders.length} orders.`);

  // --- PASS 1: Pre-populate Products and Customers ---
  const uniqueProducts = new Map<string, ShopifyProduct>();
  const uniqueCustomers = new Map<string, ShopifyCustomer>();
  for (const order of allOrders) {
    if (order.customer) uniqueCustomers.set(order.customer.id, order.customer);
    for (const edge of order.lineItems.edges) {
      if (edge.node.variant?.product) uniqueProducts.set(edge.node.variant.product.id, edge.node.variant.product);
    }
  }
  
  const productsToUpsert = Array.from(uniqueProducts.values()).map(p => ({
      shopify_product_id: p.id.replace('gid://shopify/Product/', ''),
      title: p.title,
  }));
  if (productsToUpsert.length > 0) {
    for (const chunk of chunkArray(productsToUpsert, 100)) {
      const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'shopify_product_id' });
      if (error) throw new Error(`Product upsert failed: ${error.message}`);
    }
  }
  console.log(`✅ ${productsToUpsert.length} Products populated.`);

  const customersToUpsert = Array.from(uniqueCustomers.values()).map(c => ({
      shopify_customer_id: c.id.replace('gid://shopify/Customer/', ''),
      email: c.email?.toLowerCase(),
      first_name: c.firstName,
      last_name: c.lastName,
      phone: c.phone,
      tags: c.tags,
  }));
  if (customersToUpsert.length > 0) {
    for (const chunk of chunkArray(customersToUpsert, 100)) {
      const { error } = await supabase.from('customers').upsert(chunk, { onConflict: 'shopify_customer_id' });
      if (error) throw new Error(`Customer upsert failed: ${error.message}`);
    }
  }
  console.log(`✅ ${customersToUpsert.length} Customers populated.`);

  // --- PASS 2: Insert Orders and Line Items with correct links ---
  const { data: customerIdMapData } = await supabase.from('customers').select('id, shopify_customer_id');
  const customerMap = new Map<string, string>();
  customerIdMapData?.forEach(c => customerMap.set(String(c.shopify_customer_id), c.id));

  const ordersWithCustomers = allOrders.filter(o => o.customer && customerMap.has(o.customer.id.replace('gid://shopify/Customer/', '')));
  const ordersToUpsert = ordersWithCustomers.map(o => ({
      shopify_order_id: o.id.replace('gid://shopify/Order/', ''),
      customer_id: customerMap.get(o.customer!.id.replace('gid://shopify/Customer/', '')),
      order_number: o.name,
      total_price: parseFloat(o.totalPriceSet.shopMoney.amount),
      ordered_at: o.processedAt,
      created_at: o.createdAt,
      financial_status: o.displayFinancialStatus,
      fulfillment_status: o.fulfillments[0]?.displayStatus ?? 'UNFULFILLED'
  }));
  if (ordersToUpsert.length > 0) {
    for (const chunk of chunkArray(ordersToUpsert, 100)) {
      const { error } = await supabase.from('orders').upsert(chunk, { onConflict: 'shopify_order_id' });
      if (error) throw new Error(`Error upserting orders: ${error.message}`);
    }
  }
  console.log(`✅ ${ordersToUpsert.length} Orders populated.`);

  const { data: orderIdMapData } = await supabase.from('orders').select('id, shopify_order_id');
  const orderMap = new Map<string, string>();
  orderIdMapData?.forEach(o => orderMap.set(String(o.shopify_order_id), o.id));

  const { data: productIdMapData } = await supabase.from('products').select('id, shopify_product_id');
  const productMap = new Map<string, string>();
  productIdMapData?.forEach(p => productMap.set(String(p.shopify_product_id), p.id));
  
  const lineItemsToInsert = [];
  for (const order of ordersWithCustomers) {
    const orderId = orderMap.get(order.id.replace('gid://shopify/Order/', ''));
    if (!orderId) continue;
    for (const edge of order.lineItems.edges) {
      const item = edge.node;
      const product = item.variant?.product;
      if (!product) continue;
      const productId = productMap.get(product.id.replace('gid://shopify/Product/', ''));
      if (!productId) continue;
      lineItemsToInsert.push({
          order_id: orderId,
          product_id: productId,
          quantity: item.quantity,
          price: item.originalTotalSet ? parseFloat(item.originalTotalSet.shopMoney.amount) : 0,
          title: item.title,
          sku: item.variant?.sku,
          variant_id: item.variant?.id.replace('gid://shopify/ProductVariant/', ''),
          shopify_order_id: order.id.replace('gid://shopify/Order/', ''),
      });
    }
  }
  if (lineItemsToInsert.length > 0) {
    for (const chunk of chunkArray(lineItemsToInsert, 200)) {
      const { error } = await supabase.from('order_line_items').insert(chunk);
      if (error) throw new Error(`Error inserting line items: ${error.message}`);
    }
  }
  console.log(`✅ ${lineItemsToInsert.length} Line Items populated.`);
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const startDate = args[0] || '2021-01-01';
    const endDate = args[1] || new Date().toISOString().split('T')[0];
    await syncData(startDate, endDate);
  } catch (error) {
    console.error('Sync script failed:', error);
    process.exit(1);
  }
}

main();