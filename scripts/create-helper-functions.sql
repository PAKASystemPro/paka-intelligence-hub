-- Helper functions to access production schema

-- Function to insert a customer
CREATE OR REPLACE FUNCTION public.insert_test_customer(
  p_shopify_customer_id TEXT,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_total_spent NUMERIC,
  p_orders_count INTEGER,
  p_created_at TIMESTAMP,
  p_updated_at TIMESTAMP
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO production.customers (
      shopify_customer_id, email, first_name, last_name, 
      total_spent, orders_count, created_at, updated_at
    ) VALUES (
      p_shopify_customer_id, p_email, p_first_name, p_last_name,
      p_total_spent, p_orders_count, p_created_at, p_updated_at
    )
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO result FROM inserted;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to insert an order
CREATE OR REPLACE FUNCTION public.insert_test_order(
  p_shopify_order_id TEXT,
  p_customer_id INTEGER,
  p_shopify_customer_id TEXT,
  p_order_number TEXT,
  p_total_price NUMERIC,
  p_processed_at TIMESTAMP,
  p_updated_at TIMESTAMP
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO production.orders (
      shopify_order_id, customer_id, shopify_customer_id,
      order_number, total_price, processed_at, updated_at
    ) VALUES (
      p_shopify_order_id, p_customer_id, p_shopify_customer_id,
      p_order_number, p_total_price, p_processed_at, p_updated_at
    )
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO result FROM inserted;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to insert an order line item
CREATE OR REPLACE FUNCTION public.insert_test_line_item(
  p_order_id INTEGER,
  p_shopify_order_id TEXT,
  p_product_id TEXT,
  p_variant_id TEXT,
  p_title TEXT,
  p_quantity INTEGER,
  p_price NUMERIC,
  p_sku TEXT,
  p_product_type TEXT,
  p_vendor TEXT,
  p_updated_at TIMESTAMP
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO production.order_line_items (
      order_id, shopify_order_id, product_id, variant_id,
      title, quantity, price, sku, product_type, vendor, updated_at
    ) VALUES (
      p_order_id, p_shopify_order_id, p_product_id, p_variant_id,
      p_title, p_quantity, p_price, p_sku, p_product_type, p_vendor, p_updated_at
    )
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO result FROM inserted;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to get customers
CREATE OR REPLACE FUNCTION public.get_test_customers() RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(c) INTO result FROM production.customers c;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to get orders
CREATE OR REPLACE FUNCTION public.get_test_orders() RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(o) INTO result FROM production.orders o;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to get order line items
CREATE OR REPLACE FUNCTION public.get_test_line_items() RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(li) INTO result FROM production.order_line_items li;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to get cohort heatmap
CREATE OR REPLACE FUNCTION public.get_test_cohort_heatmap() RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(ch) INTO result FROM production.cohort_heatmap ch;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to get cohort heatmap filtered by product cohort
CREATE OR REPLACE FUNCTION public.get_test_cohort_heatmap_by_product(p_product_cohort TEXT) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(ch) INTO result 
  FROM production.cohort_heatmap ch
  WHERE ch.primary_product_cohort = p_product_cohort;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;
