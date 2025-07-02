-- Create insert functions for each table

-- Function to insert customers
CREATE OR REPLACE FUNCTION public.insert_customers(data_json JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO production.customers (
      shopify_customer_id, email, first_name, last_name, 
      total_spent, orders_count, created_at, updated_at
    )
    SELECT 
      x.shopify_customer_id, x.email, x.first_name, x.last_name, 
      x.total_spent, x.orders_count, x.created_at, x.updated_at
    FROM jsonb_to_recordset(data_json) AS x(
      shopify_customer_id TEXT, email TEXT, first_name TEXT, last_name TEXT, 
      total_spent NUMERIC, orders_count INTEGER, created_at TIMESTAMP, updated_at TIMESTAMP
    )
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO result FROM inserted;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to insert orders
CREATE OR REPLACE FUNCTION public.insert_orders(data_json JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO production.orders (
      shopify_order_id, customer_id, shopify_customer_id, 
      order_number, total_price, processed_at, updated_at
    )
    SELECT 
      x.shopify_order_id, x.customer_id, x.shopify_customer_id, 
      x.order_number, x.total_price, x.processed_at, x.updated_at
    FROM jsonb_to_recordset(data_json) AS x(
      shopify_order_id TEXT, customer_id INTEGER, shopify_customer_id TEXT, 
      order_number TEXT, total_price NUMERIC, processed_at TIMESTAMP, updated_at TIMESTAMP
    )
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO result FROM inserted;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to insert order line items
CREATE OR REPLACE FUNCTION public.insert_order_line_items(data_json JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO production.order_line_items (
      order_id, shopify_order_id, product_id, variant_id, 
      title, quantity, price, sku, product_type, vendor, updated_at
    )
    SELECT 
      x.order_id, x.shopify_order_id, x.product_id, x.variant_id, 
      x.title, x.quantity, x.price, x.sku, x.product_type, x.vendor, x.updated_at
    FROM jsonb_to_recordset(data_json) AS x(
      order_id INTEGER, shopify_order_id TEXT, product_id TEXT, variant_id TEXT, 
      title TEXT, quantity INTEGER, price NUMERIC, sku TEXT, product_type TEXT, vendor TEXT, updated_at TIMESTAMP
    )
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO result FROM inserted;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to classify customers
CREATE OR REPLACE FUNCTION public.classify_customers()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Call the production schema function
  SELECT production.classify_new_customers() INTO affected_rows;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Call the production schema function
  SELECT production.refresh_all_materialized_views() INTO affected_rows;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;
