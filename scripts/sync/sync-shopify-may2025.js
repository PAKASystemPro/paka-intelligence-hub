require('dotenv').config({ path: '.env.local' });

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// --- Configuration ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shopifyAdminUrl = `${process.env.SHOPIFY_STORE_URL}/admin/api/2023-10/graphql.json`;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'production' }
});

const startDate = '2025-05-01T00:00:00+08:00';
const endDate = '2025-05-31T23:59:59+08:00';

// --- Shopify GraphQL Query ---
const SHOPIFY_QUERY = `
  query getOrders($cursor: String) {
    orders(first: 50, after: $cursor, query: "processed_at:>=${startDate} AND processed_at:<=${endDate}") {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          createdAt
          processedAt
          email
          tags
          channel { name }
          displayFulfillmentStatus
          displayFinancialStatus
          totalPriceSet { shopMoney { amount, currencyCode } }
          customer {
            id
            email
            phone
            firstName
            lastName
            numberOfOrders
            createdAt
            amountSpent { amount }
            tags
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPriceSet { shopMoney { amount } }
                sku
                product {
                  id
                  productType
                  vendor
                }
                variant {
                  id
                }
              }
            }
          }
        }
      }
    }
  }`;

// --- Data Processing Functions ---

async function processCustomer(customer) {
  if (!customer) return null; // Handle guest orders

  try {
    const shopifyCustomerId = customer.id.split('/').pop();
    const { data, error } = await supabase
      .from('customers')
      .upsert({
        shopify_customer_id: shopifyCustomerId,
        email: customer.email,
        phone: customer.phone,
        first_name: customer.firstName,
        last_name: customer.lastName,
        total_spent: customer.amountSpent?.amount,
        orders_count: customer.numberOfOrders,
        created_at: customer.createdAt,
        updated_at: new Date(),
        tags: customer.tags || []
      }, { onConflict: 'shopify_customer_id' })
      .select('id') // Select the Supabase UUID
      .single();

    if (error) throw error;
    return data.id; // Return the UUID
  } catch (error) {
    console.error(`🔴 Failed to process customer ${customer.id}.`, error.message);
    console.error('Problematic customer data:', JSON.stringify(customer, null, 2));
    return null;
  }
}

async function processOrder(order, customerSupabaseId) {
  try {
    const shopifyOrderId = order.id.split('/').pop();
    const { data, error } = await supabase
      .from('orders')
      .upsert({
        shopify_order_id: shopifyOrderId,
        customer_id: customerSupabaseId,
        shopify_customer_id: order.customer?.id.split('/').pop(),
        order_number: order.name,
        name: order.name,
        total_price: order.totalPriceSet.shopMoney.amount,
        processed_at: order.processedAt,
        created_at: order.createdAt,
        updated_at: new Date(),
        tags: order.tags || [],
        sales_channel: order.channel?.name,
        currency_code: order.totalPriceSet.shopMoney.currencyCode,
        email: order.email,
        fulfillment_status: order.displayFulfillmentStatus,
        financial_status: order.displayFinancialStatus
      }, { onConflict: 'shopify_order_id' })
      .select('id') // Select the Supabase UUID
      .single();

    if (error) throw error;
    return data.id; // Return the UUID
  } catch (error) {
    console.error(`🔴 Failed to process order ${order.id}.`, error.message);
    console.error('Problematic order data:', JSON.stringify(order, null, 2));
    return null;
  }
}

async function processLineItems(lineItems, orderSupabaseId, shopifyOrderId) {
  if (!lineItems || lineItems.edges.length === 0) return;

  // First, delete all existing line items for this order to ensure a clean sync.
  try {
    const { error: deleteError } = await supabase
      .from('order_line_items')
      .delete()
      .eq('order_id', orderSupabaseId);
    
    if (deleteError) {
      throw new Error(`Failed to delete old line items: ${deleteError.message}`);
    }
  } catch (error) {
    console.error(`🔴 Error managing line items for order ${shopifyOrderId}:`, error.message);
    return; // Stop if we can't clear old items
  }

  const lineItemsToInsert = lineItems.edges.map(({ node }) => ({
    order_id: orderSupabaseId, // Use the UUID from orders table
    shopify_order_id: shopifyOrderId.split('/').pop(),
    product_id: node.product?.id.split('/').pop(),
    variant_id: node.variant?.id.split('/').pop(),
    title: node.title,
    quantity: node.quantity,
    price: node.originalUnitPriceSet.shopMoney.amount,
    sku: node.sku,
    product_type: node.product?.productType,
    vendor: node.product?.vendor,
    updated_at: new Date()
  }));

  try {
    const { error } = await supabase.from('order_line_items').insert(lineItemsToInsert);
    if (error) throw error;
  } catch (error) {
    console.error(`🔴 Failed to insert new line items for order ${shopifyOrderId}.`, error.message);
  }
}

// --- Main Sync Logic ---

async function syncShopifyData() {
  console.log(`🚀 Starting Shopify data sync for ${startDate} to ${endDate}...`);
  let hasNextPage = true;
  let cursor = null;
  let totalOrders = 0;

  while (hasNextPage) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(shopifyAdminUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN },
        body: JSON.stringify({ query: SHOPIFY_QUERY, variables: { cursor } }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const responseText = await response.text();
      let shopifyData;
      try {
        shopifyData = JSON.parse(responseText);
      } catch (e) {
        console.error('🔴 Shopify did not return valid JSON. Response body:', responseText);
        throw new Error('Invalid JSON response from Shopify API.');
      }

      if (shopifyData.errors) throw new Error(`GraphQL Error: ${JSON.stringify(shopifyData.errors)}`);

      console.log('📄 Shopify Page Info:', JSON.stringify(shopifyData.data.orders.pageInfo, null, 2));
      const orders = shopifyData.data.orders.edges;
      console.log(`✅ Fetched ${orders.length} orders from Shopify...`);

      for (const { node: order } of orders) {
        const customerSupabaseId = await processCustomer(order.customer);
        const orderSupabaseId = await processOrder(order, customerSupabaseId);
        if (orderSupabaseId) {
          await processLineItems(order.lineItems, orderSupabaseId, order.id);
        }
      }

      totalOrders += orders.length;
      hasNextPage = shopifyData.data.orders.pageInfo.hasNextPage;
      cursor = shopifyData.data.orders.pageInfo.endCursor;
      if (hasNextPage) {
        console.log(`🔄 More pages to fetch, next cursor: ${cursor}`);
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms before next fetch
      }

    } catch (error) {
      console.error('🔴 An error occurred in the main sync loop. Halting sync.', error);
      hasNextPage = false; // Stop sync on error
    }
  }
  console.log(`
✨ Sync complete! Total orders processed: ${totalOrders}.
`);
}

syncShopifyData();
