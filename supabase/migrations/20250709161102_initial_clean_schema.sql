
-- This schema will be placed in a new migration file.

-- For customers table
CREATE TABLE production.customers (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    shopify_customer_id BIGINT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    first_name TEXT,
    tags TEXT[],
    -- These fields are populated by our application's logic, not directly from Shopify
    cohort_month DATE,
    initial_product_group TEXT,
    -- Timestamps for tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE production.customers IS 'Stores core customer information, enriched with our internal cohort data.';

-- For products table
CREATE TABLE production.products (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    shopify_product_id BIGINT NOT NULL UNIQUE,
    title TEXT,
    product_group TEXT -- This will be defined by our business rules
);
COMMENT ON TABLE production.products IS 'Stores product information, enriched with our internal product groupings.';

-- For orders table
CREATE TABLE production.orders (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    shopify_order_id BIGINT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES production.customers(id) ON DELETE CASCADE,
    ordered_at TIMESTAMPTZ,
    total_price NUMERIC(10, 2),
    financial_status TEXT
);
COMMENT ON TABLE production.orders IS 'Stores core order information, linking customers to their purchases.';

-- For order_line_items table
CREATE TABLE production.order_line_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES production.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES production.products(id) ON DELETE RESTRICT,
    quantity INT,
    price NUMERIC(10, 2)
);
COMMENT ON TABLE production.order_line_items IS 'Stores individual line items for each order.';