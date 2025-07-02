-- Additional helper functions for testing

-- Function to clear test customers
CREATE OR REPLACE FUNCTION public.clear_test_customers()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM production.customers;
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Function to clear test orders
CREATE OR REPLACE FUNCTION public.clear_test_orders()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM production.orders;
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Function to clear test line items
CREATE OR REPLACE FUNCTION public.clear_test_line_items()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM production.order_line_items;
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Function to get cohort heatmap data filtered by product cohort
CREATE OR REPLACE FUNCTION public.get_test_cohort_heatmap_by_product(p_product_cohort text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(row_to_json(ch))
    FROM (
      SELECT *
      FROM production.cohort_heatmap
      WHERE product_cohort = p_product_cohort
    ) ch
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Function to get all cohort heatmap data
CREATE OR REPLACE FUNCTION public.get_test_cohort_heatmap()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(row_to_json(ch))
    FROM (
      SELECT *
      FROM production.cohort_heatmap
    ) ch
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
