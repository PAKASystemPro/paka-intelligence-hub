-- Step 1: Add the missing 'cancelled_at' column to the orders table.
ALTER TABLE production.orders
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Step 2: Drop the old, broken function and types if they exist.
DROP FUNCTION IF EXISTS public.upsert_shopify_data_batch(jsonb, jsonb);
DROP TYPE IF EXISTS public.order_line_item_type;
DROP TYPE IF EXISTS public.order_type;

-- Step 3: Create the authoritative, strongly-typed composite types for our data.

CREATE TYPE public.order_type AS (
    id TEXT,
    shopify_order_id TEXT,
    customer_id TEXT,
    shopify_customer_id TEXT,
    name TEXT, -- This is the order number like #1001
    total_price NUMERIC,
    processed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ, -- The newly added field
    currency_code TEXT,
    email TEXT,
    fulfillment_status TEXT,
    financial_status TEXT,
    sales_channel TEXT,
    tags TEXT[]
);

CREATE TYPE public.order_line_item_type AS (
    id TEXT,
    order_id TEXT,
    shopify_order_id TEXT,
    product_id TEXT,
    variant_id TEXT,
    title TEXT,
    quantity INTEGER,
    price NUMERIC,
    sku TEXT,
    product_type TEXT,
    vendor TEXT,
    fulfillment_status TEXT,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
);

-- Step 4: Create the final, correct, and type-safe batch upsert function.

CREATE OR REPLACE FUNCTION public.upsert_shopify_data_batch(
    orders_data public.order_type[],
    line_items_data public.order_line_item_type[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    order_ids_to_update TEXT[];
BEGIN
    -- Set a longer timeout for this transaction to handle large batches.
    SET LOCAL statement_timeout = '600s';

    -- Get the list of Shopify order IDs from the input batch.
    SELECT array_agg(o.shopify_order_id) INTO order_ids_to_update
    FROM unnest(orders_data) AS o;

    -- If there are orders in the batch, delete their existing line items for a clean insert.
    IF array_length(order_ids_to_update, 1) > 0 THEN
        DELETE FROM production.order_line_items
        WHERE shopify_order_id = ANY(order_ids_to_update);
    END IF;

    -- Upsert the orders. This will insert new orders or update existing ones based on shopify_order_id.
    INSERT INTO production.orders (
        id, shopify_order_id, customer_id, shopify_customer_id, name, total_price, processed_at, 
        updated_at, created_at, cancelled_at, currency_code, email, fulfillment_status, financial_status, sales_channel, tags
    )
    SELECT 
        o.id, o.shopify_order_id, o.customer_id, o.shopify_customer_id, o.name, o.total_price, o.processed_at,
        o.updated_at, o.created_at, o.cancelled_at, o.currency_code, o.email, o.fulfillment_status, o.financial_status, o.sales_channel, o.tags
    FROM unnest(orders_data) AS o
    ON CONFLICT (shopify_order_id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        total_price = EXCLUDED.total_price,
        processed_at = EXCLUDED.processed_at,
        updated_at = EXCLUDED.updated_at,
        created_at = EXCLUDED.created_at,
        cancelled_at = EXCLUDED.cancelled_at,
        currency_code = EXCLUDED.currency_code,
        email = EXCLUDED.email,
        fulfillment_status = EXCLUDED.fulfillment_status,
        financial_status = EXCLUDED.financial_status,
        sales_channel = EXCLUDED.sales_channel,
        tags = EXCLUDED.tags;

    -- Insert the new line items for the orders in the batch.
    INSERT INTO production.order_line_items (
        id, order_id, shopify_order_id, product_id, variant_id, title, quantity, price, sku, 
        product_type, vendor, fulfillment_status, updated_at, created_at
    )
    SELECT
        li.id, li.order_id, li.shopify_order_id, li.product_id, li.variant_id, li.title, li.quantity, li.price, li.sku,
        li.product_type, li.vendor, li.fulfillment_status, li.updated_at, li.created_at
    FROM unnest(line_items_data) AS li;

END;
$$;
