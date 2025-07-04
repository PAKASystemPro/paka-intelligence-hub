// supabase/functions/delta-sync/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- TYPE DEFINITIONS for SHOPIFY API RESPONSE ---
interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  totalSpentV2: ShopifyMoney;
  ordersCount: number;
}

interface Product {
  id: string;
  vendor: string | null;
}

interface Variant {
  id: string;
  price: string;
  sku: string | null;
}

interface LineItemNode {
  id: string;
  title: string;
  quantity: number;
  originalTotalSet: {
    shopMoney: ShopifyMoney;
  };
  variant: Variant | null;
  product: Product | null;
}

interface LineItemEdge {
  node: LineItemNode;
}

interface LineItems {
  edges: LineItemEdge[];
}

interface Order {
  id: string;
  name: string;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
  totalPriceSet: {
    shopMoney: ShopifyMoney;
  };
  customer: Customer | null;
  lineItems: LineItems;
}

// --- TYPE DEFINITIONS for DATABASE RECORDS ---
interface CustomerRecord {
  id: string;
  shopify_customer_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  total_spent: number;
  orders_count: number;
  created_at: string;
  updated_at: string;
}

interface OrderRecord {
  id: string;
  shopify_order_id: string;
  customer_id: string | null;
  shopify_customer_id: string | null;
  order_number: string;
  total_price: number;
  processed_at: string;
  updated_at: string;
}

interface LineItemRecord {
  id: string;
  order_id: string;
  shopify_order_id: string;
  product_id: string | null;
  variant_id: string | null;
  title: string;
  quantity: number;
  price: number;
  sku: string | null;
  vendor: string | null;
}

// Define CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main function to handle incoming requests
serve(async (_req) => {
  const functionStartTime = Date.now();
  const TIMEOUT_THRESHOLD_MS = 55000; // 55 seconds to be safe
  // Handle CORS preflight requests
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- 1. INITIALIZE CLIENTS ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    console.log(`Supabase URL is present: ${!!supabaseUrl}`);
    console.log(`Supabase Service Role Key is present: ${!!supabaseServiceRoleKey}`);
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Supabase environment variables (URL or Service Role Key) are missing.");
    }
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      db: {
        schema: 'production',
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const shopifyDomain = Deno.env.get('SHOPIFY_STORE_DOMAIN');
    const shopifyAccessToken = Deno.env.get('SHOPIFY_ADMIN_ACCESS_TOKEN');

    if (!shopifyDomain || !shopifyAccessToken) {
      throw new Error('Shopify environment variables (domain or access token) not set.');
    }

    const shopifyUrl = `https://${shopifyDomain}/admin/api/2024-07/graphql.json`;



    // --- 2. GET LAST SYNC TIMESTAMP ---
    console.log('Fetching last sync timestamp...');
    const { data: lastSyncData, error: lastSyncError } = await supabaseClient
        .from('sync_metadata')
        .select('value')
        .eq('key', 'last_sync_timestamp')
        .single();

    if (lastSyncError && lastSyncError.code !== 'PGRST116') { // PGRST116: "exact-cardinality-violation", i.e., 0 rows
        throw lastSyncError;
    }

    let lastSyncTimestamp = '';
    if (lastSyncData && lastSyncData.value) {
        lastSyncTimestamp = lastSyncData.value;
    }
    console.log(`Syncing data updated since: ${lastSyncTimestamp}`);

    // --- 3. FETCH DELTA DATA FROM SHOPIFY (PAGINATED) ---
    let allOrders: Order[] = [];
    let hasNextPage = true;
    let cursor = null;

    console.log('Fetching orders from Shopify...');
    while (hasNextPage) {
      const shopifyQuery = {
        query: `
          query ($cursor: String, $query: String!) {
            orders(first: 50, after: $cursor, query: $query) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  name
                  createdAt
                  updatedAt
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  customer {
                    id
                    firstName
                    lastName
                    email
                    phone
                    createdAt
                    updatedAt
                  }
                  lineItems(first: 20) {
                    edges {
                      node {
                        id
                        title
                        quantity
                        variant {
                          id
                          price
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          cursor: cursor,
          query: lastSyncTimestamp ? `updated_at:>'${lastSyncTimestamp}'` : `updated_at:>'${new Date(0).toISOString()}'`,
        },
      };

      const shopifyResponse = await fetch(shopifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAccessToken,
        },
        body: JSON.stringify(shopifyQuery),
      });

      if (!shopifyResponse.ok) {
        throw new Error(`Shopify API request failed: ${await shopifyResponse.text()}`);
      }

      const result = await shopifyResponse.json();

      if (result.errors) {
        throw new Error(`Shopify GraphQL Error: ${JSON.stringify(result.errors)}`);
      }

      if (!result.data) {
        throw new Error(`Shopify API returned no data. Response: ${JSON.stringify(result)}`);
      }

      const ordersData = result.data.orders;
      allOrders.push(...ordersData.edges.map(edge => edge.node));

      hasNextPage = ordersData.pageInfo.hasNextPage;
      cursor = ordersData.pageInfo.endCursor;

      // Check if we are approaching the timeout limit
      const elapsedTime = Date.now() - functionStartTime;
      if (elapsedTime > TIMEOUT_THRESHOLD_MS && hasNextPage) {
        console.log(`Approaching timeout (${elapsedTime}ms). Exiting gracefully to resume later.`);
        // We will save the current cursor as the 'bookmark' to resume from here next time.
        // Note: The Shopify cursor is opaque, but we can store it to use in the next query.
        // For simplicity in this fix, we will update the main timestamp with the `updated_at` of the last processed order.
        const lastProcessedOrder = allOrders[allOrders.length - 1];
        if (lastProcessedOrder) {
          const newSyncTimestamp = lastProcessedOrder.updatedAt;
          await supabaseClient
            .from('sync_metadata')
            .upsert({ key: 'last_sync_timestamp', value: newSyncTimestamp }, { onConflict: 'key' });
          console.log(`Progress saved. Next sync will start from: ${newSyncTimestamp}`);
        }

        // Force the loop to end
        hasNextPage = false; 
      }
    }
    console.log(`Fetched a total of ${allOrders.length} updated orders.`);

    if (allOrders.length === 0) {
      return new Response(JSON.stringify({ message: 'No new data to sync.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // --- 4. TRANSFORM AND UPSERT DATA ---
    console.log('Beginning data transformation...');

    // Step 1: Prepare customer data for upsert.
    // We create a map to ensure each customer is processed only once.
    const customerMap = new Map<string, Customer>();
    for (const order of allOrders) {
      if (order.customer && !customerMap.has(order.customer.id)) {
        customerMap.set(order.customer.id, order.customer);
      }
    }

    // Create the array for upsert, omitting the 'id' field which is the DB primary key.
    const customersToUpsert: Omit<CustomerRecord, 'id'>[] = Array.from(customerMap.values()).map(customer => ({
      shopify_customer_id: customer.id.split('/').pop()!,
      email: customer.email || null,
      first_name: customer.firstName || null,
      last_name: customer.lastName || null,
      phone: customer.phone || null,
      total_spent: parseFloat(customer.totalSpentV2?.amount || '0'),
      orders_count: customer.ordersCount,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    }));

    // Step 2: Upsert customers.
    if (customersToUpsert.length > 0) {
      console.log(`Upserting ${customersToUpsert.length} unique customer records.`);
      const { error: customerError } = await supabaseClient
        .from('customers')
        .upsert(customersToUpsert, { onConflict: 'shopify_customer_id' });

      if (customerError) {
        console.error('An error occurred during customer upsert:', customerError);
        throw new Error(`Error upserting customers: ${JSON.stringify(customerError)}`);
      }
      console.log('Successfully upserted customer records.');
    }

    // Step 3: Fetch the mapping from shopify_customer_id to the internal database UUID.
    const customerShopifyIds = customersToUpsert.map(c => c.shopify_customer_id);
    const customerIdMap = new Map<string, string>(); // Map<ShopifyCustomerID, Internal_DB_UUID>

    if (customerShopifyIds.length > 0) {
        console.log('Fetching customer ID map for linking orders...');
        const { data: customers, error: mapError } = await supabaseClient
            .from('customers')
            .select('id, shopify_customer_id')
            .in('shopify_customer_id', customerShopifyIds);
        
        if (mapError) {
            throw new Error(`Failed to fetch customer ID map: ${mapError.message}`);
        }

        for (const customer of customers) {
            customerIdMap.set(customer.shopify_customer_id, customer.id);
        }
        console.log(`Built map for ${customerIdMap.size} customers.`);
    }

    // Step 4: Prepare and upsert orders and line items using the customer ID map.
    const ordersToUpsert: OrderRecord[] = [];
    const lineItemsToUpsert: LineItemRecord[] = [];

    for (const order of allOrders) {
      if (!order || !order.id) continue;

      const shopifyCustomerId = order.customer?.id?.split('/').pop() || null;
      const internalDbCustomerId = shopifyCustomerId ? customerIdMap.get(shopifyCustomerId) || null : null;

      ordersToUpsert.push({
        id: order.id,
        shopify_order_id: order.id.split('/').pop()!,
        customer_id: internalDbCustomerId, // Use the internal UUID
        shopify_customer_id: shopifyCustomerId,
        order_number: order.name,
        total_price: parseFloat(order.totalPriceSet.shopMoney.amount),
        processed_at: order.processedAt,
        updated_at: order.updatedAt,
      });

      for (const edge of order.lineItems.edges) {
        if (!edge || !edge.node) continue;
        const item = edge.node;
        lineItemsToUpsert.push({
          id: item.id,
          order_id: order.id,
          shopify_order_id: order.id.split('/').pop()!,
          product_id: item.product?.id || null,
          variant_id: item.variant?.id || null,
          title: item.title,
          quantity: item.quantity,
          price: parseFloat(item.originalTotalSet?.shopMoney?.amount || '0'),
          sku: item.variant?.sku || null,
          vendor: item.product?.vendor || null,
        });
      }
    }

    // Step 5: Execute upserts for orders and line items.
    if (ordersToUpsert.length > 0) {
        console.log(`Upserting ${ordersToUpsert.length} order records.`);
        const { error: orderError } = await supabaseClient.from('orders').upsert(ordersToUpsert, { onConflict: 'id' });
        if (orderError) {
          console.error('Error upserting orders:', orderError);
          throw new Error(`Error upserting orders: ${JSON.stringify(orderError)}`);
        }
        console.log('Successfully upserted order records.');
    }

    if (lineItemsToUpsert.length > 0) {
        console.log(`Upserting ${lineItemsToUpsert.length} line item records.`);
        const { error: lineItemError } = await supabaseClient.from('order_line_items').upsert(lineItemsToUpsert, { onConflict: 'id' });
        if (lineItemError) {
          console.error('Error upserting line items:', lineItemError);
          throw new Error(`Error upserting line items: ${JSON.stringify(lineItemError)}`);
        }
        console.log('Successfully upserted line item records.');
    }
    const newSyncTimestamp = new Date().toISOString();
    const { error: updateSyncError } = await supabaseClient
        .from('sync_metadata')
        .upsert({ key: 'last_sync_timestamp', value: newSyncTimestamp }, { onConflict: 'key' });

    if (updateSyncError) {
      throw new Error(`Failed to update sync timestamp: ${updateSyncError.message}`);
    }

    console.log(`Sync successful. New timestamp: ${newSyncTimestamp}`);
    return new Response(JSON.stringify({ success: true, message: 'Delta sync completed successfully.', syncedOrders: allOrders.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in delta-sync function:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
