-- Create production schema
CREATE SCHEMA IF NOT EXISTS production;

-- Check if schema exists function
CREATE OR REPLACE FUNCTION public.check_schema_exists(schema_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM information_schema.schemata
        WHERE schema_name = $1
    );
END;
$$ LANGUAGE plpgsql;

-- Create customers table
CREATE TABLE IF NOT EXISTS production.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopify_customer_id TEXT NOT NULL UNIQUE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    total_spent NUMERIC DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    primary_product_cohort TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS production.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopify_order_id TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES production.customers(id),
    shopify_customer_id TEXT NOT NULL,
    order_number TEXT,
    total_price NUMERIC,
    processed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order line items table
CREATE TABLE IF NOT EXISTS production.order_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES production.orders(id),
    shopify_order_id TEXT NOT NULL,
    product_id TEXT,
    variant_id TEXT,
    title TEXT,
    quantity INTEGER,
    price NUMERIC,
    sku TEXT,
    product_type TEXT,
    vendor TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to classify new customers
CREATE OR REPLACE FUNCTION public.classify_new_customers()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update customers without a primary_product_cohort
    -- Assign based on their first order's line items
    UPDATE production.customers c
    SET primary_product_cohort = subquery.product_title
    FROM (
        SELECT 
            c.id AS customer_id,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM production.orders o
                    JOIN production.order_line_items li ON o.id = li.order_id
                    WHERE o.customer_id = c.id
                    AND li.title LIKE '%深睡寶寶%'
                    ORDER BY o.processed_at ASC
                    LIMIT 1
                ) THEN '深睡寶寶'
                WHEN EXISTS (
                    SELECT 1 FROM production.orders o
                    JOIN production.order_line_items li ON o.id = li.order_id
                    WHERE o.customer_id = c.id
                    AND li.title LIKE '%天皇丸%'
                    ORDER BY o.processed_at ASC
                    LIMIT 1
                ) THEN '天皇丸'
                WHEN EXISTS (
                    SELECT 1 FROM production.orders o
                    JOIN production.order_line_items li ON o.id = li.order_id
                    WHERE o.customer_id = c.id
                    AND li.title LIKE '%皇后丸%'
                    ORDER BY o.processed_at ASC
                    LIMIT 1
                ) THEN '皇后丸'
                ELSE 'Other'
            END AS product_title
        FROM production.customers c
        WHERE c.primary_product_cohort IS NULL
        AND EXISTS (
            SELECT 1 FROM production.orders o
            WHERE o.customer_id = c.id
        )
    ) AS subquery
    WHERE c.id = subquery.customer_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to service_role
GRANT USAGE ON SCHEMA production TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA production TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA production TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA production TO service_role;
