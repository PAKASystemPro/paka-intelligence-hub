// supabase/functions/delta-sync/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- TYPE DEFINITIONS for SHOPIFY API RESPONSE ---
interface LineItemNode {
  id: string;
  title: string;
  quantity: number;
  sku: string | null;
  vendor: string | null;
  originalTotalSet: { shopMoney: { amount: string } };
  product: { id: string; productType: string | null } | null;
  variant: { id: string } | null;
}

interface Order {
  id: string;
  name: string;
  email: string | null;
  tags: string[];
  note: string | null;
  createdAt: string;
  processedAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  currencyCode: string;
  channel: { name: string | null } | null;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: { id: string } | null;
  lineItems: {
    edges: {
      node: LineItemNode;
    }[];
  };
}

// Database record type definitions are now handled by the strongly-typed
// PostgreSQL function and its composite types.

interface ShopifyEdge {
  node: Order;
}

interface ShopifyOrdersResponse {
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  edges: ShopifyEdge[];
}

interface ShopifyGraphQLResponse {
  data?: {
    orders: ShopifyOrdersResponse;
  };
  errors?: { message: string }[];
}

interface ShopifyQueryVariables {
  cursor: string | null;
  query: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchAllOrders(supabaseClient: SupabaseClient, shopifyUrl: string, shopifyAccessToken: string, functionStartTime: number): Promise<[Order[], string]> {
  let lastSyncTimestamp = '';
  try {
    const { data: lastSyncData } = await supabaseClient
      .from('sync_metadata')
      .select('value')
      .eq('key', 'last_sync_timestamp')
      .single();
    if (lastSyncData && lastSyncData.value) {
      lastSyncTimestamp = lastSyncData.value;
    }
  } catch (_e) { /* Ignore if not found */ }
  console.log(`Syncing data updated since: ${lastSyncTimestamp || 'the beginning of time'}`);

  const allOrders: Order[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  const TIMEOUT_THRESHOLD_MS = 55000; // 55 seconds to leave buffer

  console.log('Fetching orders from Shopify...');
  while (hasNextPage) {
    const shopifyQuery: { query: string; variables: ShopifyQueryVariables } = {
      query: `
        query ($cursor: String, $query: String!) {
          orders(first: 50, after: $cursor, query: $query) {
            pageInfo { hasNextPage, endCursor }
            edges {
              node {
                id
                name
                email
                tags
                note
                createdAt
                processedAt
                updatedAt
                cancelledAt
                currencyCode
                channel { name }
                displayFinancialStatus
                displayFulfillmentStatus
                totalPriceSet { shopMoney { amount, currencyCode } }
                customer { id }
                lineItems(first: 20) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      sku
                      vendor
                      originalTotalSet { shopMoney { amount } }
                      product { id, productType }
                      variant { id }
                    }
                  }
                }
              }
            }
          }
        }`,
      variables: {
        cursor: cursor,
        query: lastSyncTimestamp ? `updated_at:>'${lastSyncTimestamp}'` : '',
      },
    };

    const response: Response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopifyAccessToken,
      },
      body: JSON.stringify(shopifyQuery),
    });

    if (!response.ok) {
      throw new Error(`Shopify API request failed: ${response.statusText}`);
    }

    const json: ShopifyGraphQLResponse = await response.json();
    if (json.errors) {
      throw new Error(`Shopify API error: ${JSON.stringify(json.errors)}`);
    }

    if (json.data) {
      const orders = json.data.orders.edges.map((edge: ShopifyEdge) => edge.node);
      allOrders.push(...orders);

      hasNextPage = json.data.orders.pageInfo.hasNextPage;
      cursor = json.data.orders.pageInfo.endCursor;
    }

    if (Date.now() - functionStartTime > TIMEOUT_THRESHOLD_MS) {
      console.log('Function timeout threshold reached. Stopping Shopify fetch to process current batch.');
      hasNextPage = false;
    }
  }

  const newSyncTimestamp = allOrders.length > 0 
    ? allOrders.reduce((max, order) => order.updatedAt > max ? order.updatedAt : max, allOrders[0].updatedAt)
    : new Date().toISOString();

  console.log(`Fetched ${allOrders.length} orders from Shopify.`);
  return [allOrders, newSyncTimestamp];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const shopifyStoreDomain = Deno.env.get('SHOPIFY_STORE_DOMAIN') ?? '';
    const shopifyAccessToken = Deno.env.get('SHOPIFY_ADMIN_ACCESS_TOKEN') ?? '';
    const functionStartTime = Date.now();

    // Ensure we have a valid domain and token before proceeding.
    if (!shopifyStoreDomain || !shopifyAccessToken) {
      throw new Error('Missing required Shopify environment variables: SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
    }

    // Construct the full GraphQL endpoint URL.
    const shopifyUrl = `https://${shopifyStoreDomain}/admin/api/2024-07/graphql.json`;

    // --- 1. FETCH DATA ---
    const [allOrders, newSyncTimestamp] = await fetchAllOrders(supabaseClient, shopifyUrl, shopifyAccessToken, functionStartTime);
    if (allOrders.length === 0) {
      console.log('No new orders to sync.');
      return new Response(JSON.stringify({ success: true, message: 'No new orders to sync.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // --- 2. PREPARE DATA ---
    const customerShopifyIds = [...new Set(allOrders.map(o => o.customer?.id).filter(Boolean) as string[])];
    const customerIdMap = new Map<string, string>();
    if (customerShopifyIds.length > 0) {
      const { data: customers, error } = await supabaseClient.rpc('get_customer_uuids_by_shopify_ids', { p_shopify_ids: customerShopifyIds });
      if (error) throw new Error(`Failed to fetch customer UUIDs: ${JSON.stringify(error)}`);
      customers.forEach((c: { o_shopify_id: string, o_id: string }) => customerIdMap.set(c.o_shopify_id, c.o_id));
    }

    // Create a map of Shopify numeric ID -> internal UUID for existing orders
    const orderIdMap = new Map<string, string>();
    const orderShopifyIds = allOrders.map(o => o.id.split('/').pop()!);

    if (orderShopifyIds.length > 0) {
        const { data: existingOrders, error: rpcError } = await supabaseClient
            .rpc('get_order_uuids_by_shopify_gids', { p_shopify_ids: orderShopifyIds });
        if (rpcError) throw new Error(`Failed to fetch order ID map via RPC: ${JSON.stringify(rpcError)}`);
        if (existingOrders) {
            existingOrders.forEach((order: { o_shopify_id: string, o_id: string }) => {
                orderIdMap.set(order.o_shopify_id, order.o_id);
            });
        }
    }

    const ordersToUpsert = [];
    const lineItemsToUpsert = [];

    for (const order of allOrders) {
      const shopifyOrderId = order.id.split('/').pop()!;
      const orderDbId = orderIdMap.get(shopifyOrderId) || crypto.randomUUID();
      const customerDbId = order.customer?.id ? customerIdMap.get(order.customer.id) : null;

      ordersToUpsert.push({
        id: orderDbId,
        shopify_order_id: shopifyOrderId,
        customer_id: customerDbId,
        shopify_customer_id: order.customer?.id || null,
        name: order.name,
        total_price: parseFloat(order.totalPriceSet.shopMoney.amount),
        processed_at: order.processedAt,
        updated_at: order.updatedAt,
        created_at: order.createdAt,
        cancelled_at: order.cancelledAt || null,
        currency_code: order.totalPriceSet.shopMoney.currencyCode,
        email: order.email,
        fulfillment_status: order.displayFulfillmentStatus,
        financial_status: order.displayFinancialStatus,
        sales_channel: order.channel?.name || null,
        tags: order.tags,
      });

      for (const edge of order.lineItems.edges) {
        const item = edge.node;
        lineItemsToUpsert.push({
          id: crypto.randomUUID(),
          order_id: orderDbId,
          shopify_order_id: shopifyOrderId,
          product_id: item.product?.id || null,
          variant_id: item.variant?.id || null,
          title: item.title,
          quantity: item.quantity,
          price: parseFloat(item.originalTotalSet.shopMoney.amount),
          sku: item.sku,
          product_type: item.product?.productType || null,
          vendor: item.vendor,
          fulfillment_status: order.displayFulfillmentStatus, // Use order's status
          updated_at: order.updatedAt,
          created_at: order.createdAt,
        });
      }
    }

    // --- 3. EXECUTE BATCH UPSERT ---
    if (ordersToUpsert.length > 0) {
      console.log(`Upserting ${ordersToUpsert.length} orders and ${lineItemsToUpsert.length} line items via RPC.`);
      const { error } = await supabaseClient.rpc('upsert_shopify_data_batch', {
        orders_data: ordersToUpsert,
        line_items_data: lineItemsToUpsert,
      });
      if (error) {
        console.error('RPC call failed:', error);
        throw new Error(`Batch upsert failed: ${JSON.stringify(error)}`);
      }
    }

    // --- 4. FINALIZE SYNC ---
    await supabaseClient.from('sync_metadata').upsert({ key: 'last_sync_timestamp', value: newSyncTimestamp }, { onConflict: 'key' });
    console.log(`Sync successful. New timestamp: ${newSyncTimestamp}`);

    return new Response(JSON.stringify({ success: true, message: 'Delta sync completed successfully.', syncedOrders: allOrders.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in delta-sync function:', (error as Error).message);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
