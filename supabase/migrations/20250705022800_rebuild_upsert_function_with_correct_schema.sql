CREATE OR REPLACE FUNCTION public.upsert_shopify_data_batch(
    orders_data JSONB,
    line_items_data JSONB
)
RETURNS VOID AS $$
DECLARE
    order_ids_to_update TEXT[];
BEGIN
    SET LOCAL statement_timeout = '600s';

    SELECT array_agg(d->>'shopify_order_id')
    INTO order_ids_to_update
    FROM jsonb_to_recordset(orders_data) AS d(shopify_order_id TEXT);

    IF array_length(order_ids_to_update, 1) > 0 THEN
        DELETE FROM production.order_line_items
        WHERE shopify_order_id = ANY(order_ids_to_update);
    END IF;

    INSERT INTO production.orders (
        id, shopify_order_id, customer_id, shopify_customer_id, order_number, total_price, processed_at, 
        updated_at, currency_code, email, name, fulfillment_status, financial_status, tags, created_at
    )
    SELECT
        (d->>'id')::UUID,
        d->>'shopify_order_id',
        (d->>'customer_id')::UUID,
        d->>'shopify_customer_id',
        d->>'order_number',
        (d->>'total_price')::NUMERIC,
        (d->>'processed_at')::TIMESTAMPTZ,
        (d->>'updated_at')::TIMESTAMPTZ,
        d->>'currency_code',
        d->>'email',
        d->>'name',
        d->>'fulfillment_status',
        d->>'financial_status',
        (SELECT array_agg(elem::text) FROM jsonb_array_elements_text(d->'tags') AS elem),
        (d->>'created_at')::TIMESTAMPTZ
    FROM jsonb_to_recordset(orders_data) AS d(
        id TEXT, shopify_order_id TEXT, customer_id TEXT, shopify_customer_id TEXT, order_number TEXT, total_price TEXT, 
        processed_at TEXT, updated_at TEXT, currency_code TEXT, email TEXT, name TEXT, fulfillment_status TEXT, 
        financial_status TEXT, tags JSONB, created_at TEXT
    )
    ON CONFLICT (shopify_order_id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        total_price = EXCLUDED.total_price,
        processed_at = EXCLUDED.processed_at,
        updated_at = EXCLUDED.updated_at,
        currency_code = EXCLUDED.currency_code,
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        fulfillment_status = EXCLUDED.fulfillment_status,
        financial_status = EXCLUDED.financial_status,
        tags = EXCLUDED.tags;

    INSERT INTO production.order_line_items (
        id, order_id, shopify_order_id, product_id, variant_id, title, quantity, price, sku, 
        product_type, vendor, fulfillment_status, updated_at, created_at
    )
    SELECT
        (d->>'id')::UUID,
        (d->>'order_id')::UUID,
        d->>'shopify_order_id',
        d->>'product_id',
        d->>'variant_id',
        d->>'title',
        (d->>'quantity')::INTEGER,
        (d->>'price')::NUMERIC,
        d->>'sku',
        d->>'product_type',
        d->>'vendor',
        d->>'fulfillment_status',
        (d->>'updated_at')::TIMESTAMPTZ,
        (d->>'created_at')::TIMESTAMPTZ
    FROM jsonb_to_recordset(line_items_data) AS d(
        id TEXT, order_id TEXT, shopify_order_id TEXT, product_id TEXT, variant_id TEXT, title TEXT, quantity TEXT, 
        price TEXT, sku TEXT, product_type TEXT, vendor TEXT, fulfillment_status TEXT, updated_at TEXT, created_at TEXT
    );

END;
$$ LANGUAGE plpgsql;
