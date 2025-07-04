CREATE OR REPLACE FUNCTION public.upsert_shopify_data_batch(
    orders_data JSONB,
    line_items_data JSONB
)
RETURNS VOID AS $$
BEGIN
    SET LOCAL statement_timeout = '600s';

    INSERT INTO production.orders (
        id, shopify_order_id, customer_id, shopify_customer_id, order_number,
        total_price, processed_at, updated_at
    )
    SELECT
        (d->>'id')::UUID,
        (d->>'shopify_order_id')::BIGINT,
        (d->>'customer_id')::UUID,
        d->>'shopify_customer_id',
        d->>'order_number',
        (d->>'total_price')::NUMERIC,
        (d->>'processed_at')::TIMESTAMPTZ,
        (d->>'updated_at')::TIMESTAMPTZ
    FROM jsonb_to_recordset(orders_data) AS d(
        id UUID, shopify_order_id BIGINT, customer_id UUID, shopify_customer_id TEXT,
        order_number TEXT, total_price NUMERIC, processed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
    )
    ON CONFLICT (shopify_order_id) DO UPDATE SET
        total_price = EXCLUDED.total_price,
        updated_at = EXCLUDED.updated_at;

    INSERT INTO production.line_items (
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
