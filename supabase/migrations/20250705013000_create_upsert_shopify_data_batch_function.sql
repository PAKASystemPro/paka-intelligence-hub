-- Function to upsert a batch of Shopify orders and line items with an extended timeout.
CREATE OR REPLACE FUNCTION public.upsert_shopify_data_batch(
    orders_data JSONB,
    line_items_data JSONB
)
RETURNS VOID AS $$
BEGIN
    -- Set a 10-minute timeout for this transaction only.
    SET LOCAL statement_timeout = '600s';

    -- Upsert orders
    INSERT INTO production.production_orders (
        id, shopify_order_id, app_id, created_at, updated_at, cancelled_at, customer_id, 
        email, total_price, subtotal_price, total_tax, financial_status, fulfillment_status, 
        total_discounts, tags, note
    )
    SELECT
        (d->>'id')::UUID,
        (d->>'shopify_order_id')::BIGINT,
        (d->>'app_id')::BIGINT,
        (d->>'created_at')::TIMESTAMPTZ,
        (d->>'updated_at')::TIMESTAMPTZ,
        (d->>'cancelled_at')::TIMESTAMPTZ,
        (d->>'customer_id')::UUID,
        d->>'email',
        (d->>'total_price')::NUMERIC,
        (d->>'subtotal_price')::NUMERIC,
        (d->>'total_tax')::NUMERIC,
        d->>'financial_status',
        d->>'fulfillment_status',
        (d->>'total_discounts')::NUMERIC,
        d->>'tags',
        d->>'note'
    FROM jsonb_to_recordset(orders_data) AS d(
        id UUID, shopify_order_id BIGINT, app_id BIGINT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, 
        cancelled_at TIMESTAMPTZ, customer_id UUID, email TEXT, total_price NUMERIC, 
        subtotal_price NUMERIC, total_tax NUMERIC, financial_status TEXT, fulfillment_status TEXT, 
        total_discounts NUMERIC, tags TEXT, note TEXT
    )
    ON CONFLICT (shopify_order_id) DO UPDATE SET
        updated_at = EXCLUDED.updated_at,
        cancelled_at = EXCLUDED.cancelled_at,
        email = EXCLUDED.email,
        total_price = EXCLUDED.total_price,
        subtotal_price = EXCLUDED.subtotal_price,
        total_tax = EXCLUDED.total_tax,
        financial_status = EXCLUDED.financial_status,
        fulfillment_status = EXCLUDED.fulfillment_status,
        total_discounts = EXCLUDED.total_discounts,
        tags = EXCLUDED.tags,
        note = EXCLUDED.note;

    -- Upsert line items
    INSERT INTO production.production_line_items (
        id, shopify_line_item_id, order_id, product_id, variant_id, title, quantity, 
        price, total_discount, tax, sku
    )
    SELECT
        (d->>'id')::UUID,
        (d->>'shopify_line_item_id')::BIGINT,
        (d->>'order_id')::UUID,
        (d->>'product_id')::UUID,
        (d->>'variant_id')::UUID,
        d->>'title',
        (d->>'quantity')::INTEGER,
        (d->>'price')::NUMERIC,
        (d->>'total_discount')::NUMERIC,
        (d->>'tax')::NUMERIC,
        d->>'sku'
    FROM jsonb_to_recordset(line_items_data) AS d(
        id UUID, shopify_line_item_id BIGINT, order_id UUID, product_id UUID, variant_id UUID, 
        title TEXT, quantity INTEGER, price NUMERIC, total_discount NUMERIC, tax NUMERIC, sku TEXT
    )
    ON CONFLICT (shopify_line_item_id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        price = EXCLUDED.price,
        total_discount = EXCLUDED.total_discount,
        tax = EXCLUDED.tax,
        sku = EXCLUDED.sku;

END;
$$ LANGUAGE plpgsql;
