-- Create function to get multi-order cohort heatmap data
CREATE OR REPLACE FUNCTION production.get_multi_order_cohort_heatmap(order_number integer DEFAULT 3)
RETURNS TABLE (
  cohort_month text,
  previous_order_customers integer,
  nth_orders integer,
  m0 integer,
  m1 integer,
  m2 integer,
  m3 integer,
  m4 integer,
  m5 integer,
  m6 integer,
  m7 integer,
  m8 integer,
  m9 integer,
  m10 integer,
  m11 integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  prev_order_number integer := order_number - 1;
BEGIN
  RETURN QUERY
  WITH 
  -- Get customers who made the previous order (n-1)
  previous_order_customers AS (
    SELECT 
      c.shopify_customer_id,
      DATE_TRUNC('month', MIN(o.processed_at)) AS cohort_month,
      COUNT(DISTINCT o.id) AS order_count
    FROM 
      production.customers c
      JOIN production.orders o ON c.shopify_customer_id = o.shopify_customer_id
    GROUP BY 
      c.shopify_customer_id
    HAVING 
      COUNT(DISTINCT o.id) >= prev_order_number
  ),
  
  -- Get customers who made the nth order
  nth_order_customers AS (
    SELECT 
      c.shopify_customer_id,
      poc.cohort_month,
      MIN(o.processed_at) AS nth_order_date
    FROM 
      production.customers c
      JOIN production.orders o ON c.shopify_customer_id = o.shopify_customer_id
      JOIN previous_order_customers poc ON c.shopify_customer_id = poc.shopify_customer_id
    GROUP BY 
      c.shopify_customer_id, poc.cohort_month
    HAVING 
      COUNT(DISTINCT o.id) >= order_number
  ),
  
  -- Aggregate by cohort month
  cohort_data AS (
    SELECT 
      TO_CHAR(poc.cohort_month, 'YYYY-MM') AS cohort_month,
      COUNT(DISTINCT poc.shopify_customer_id) AS previous_order_customers,
      COUNT(DISTINCT noc.shopify_customer_id) AS nth_orders,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 0 THEN noc.shopify_customer_id END) AS m0,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 1 THEN noc.shopify_customer_id END) AS m1,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 2 THEN noc.shopify_customer_id END) AS m2,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 3 THEN noc.shopify_customer_id END) AS m3,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 4 THEN noc.shopify_customer_id END) AS m4,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 5 THEN noc.shopify_customer_id END) AS m5,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 6 THEN noc.shopify_customer_id END) AS m6,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 7 THEN noc.shopify_customer_id END) AS m7,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 8 THEN noc.shopify_customer_id END) AS m8,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 9 THEN noc.shopify_customer_id END) AS m9,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 10 THEN noc.shopify_customer_id END) AS m10,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 11 THEN noc.shopify_customer_id END) AS m11
    FROM 
      previous_order_customers poc
      LEFT JOIN nth_order_customers noc ON poc.shopify_customer_id = noc.shopify_customer_id
    GROUP BY 
      TO_CHAR(poc.cohort_month, 'YYYY-MM')
  )
  
  SELECT 
    cohort_month,
    previous_order_customers,
    nth_orders,
    m0,
    m1,
    m2,
    m3,
    m4,
    m5,
    m6,
    m7,
    m8,
    m9,
    m10,
    m11
  FROM 
    cohort_data
  ORDER BY 
    cohort_month;
END;
$$;

-- Create function to get multi-order cohort heatmap data by product type
CREATE OR REPLACE FUNCTION production.get_multi_order_cohort_heatmap_by_product(
  product_type text,
  order_number integer DEFAULT 3
)
RETURNS TABLE (
  cohort_month text,
  previous_order_customers integer,
  nth_orders integer,
  m0 integer,
  m1 integer,
  m2 integer,
  m3 integer,
  m4 integer,
  m5 integer,
  m6 integer,
  m7 integer,
  m8 integer,
  m9 integer,
  m10 integer,
  m11 integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  prev_order_number integer := order_number - 1;
BEGIN
  RETURN QUERY
  WITH 
  -- Get customers who made the previous order (n-1) for a specific product type
  previous_order_customers AS (
    SELECT 
      c.shopify_customer_id,
      DATE_TRUNC('month', MIN(o.processed_at)) AS cohort_month,
      COUNT(DISTINCT o.id) AS order_count
    FROM 
      production.customers c
      JOIN production.orders o ON c.shopify_customer_id = o.shopify_customer_id
      JOIN production.order_line_items oli ON o.id = oli.order_id
    WHERE 
      oli.product_type = product_type
    GROUP BY 
      c.shopify_customer_id
    HAVING 
      COUNT(DISTINCT o.id) >= prev_order_number
  ),
  
  -- Get customers who made the nth order for a specific product type
  nth_order_customers AS (
    SELECT 
      c.shopify_customer_id,
      poc.cohort_month,
      MIN(o.processed_at) AS nth_order_date
    FROM 
      production.customers c
      JOIN production.orders o ON c.shopify_customer_id = o.shopify_customer_id
      JOIN production.order_line_items oli ON o.id = oli.order_id
      JOIN previous_order_customers poc ON c.shopify_customer_id = poc.shopify_customer_id
    WHERE 
      oli.product_type = product_type
    GROUP BY 
      c.shopify_customer_id, poc.cohort_month
    HAVING 
      COUNT(DISTINCT o.id) >= order_number
  ),
  
  -- Aggregate by cohort month
  cohort_data AS (
    SELECT 
      TO_CHAR(poc.cohort_month, 'YYYY-MM') AS cohort_month,
      COUNT(DISTINCT poc.shopify_customer_id) AS previous_order_customers,
      COUNT(DISTINCT noc.shopify_customer_id) AS nth_orders,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 0 THEN noc.shopify_customer_id END) AS m0,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 1 THEN noc.shopify_customer_id END) AS m1,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 2 THEN noc.shopify_customer_id END) AS m2,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 3 THEN noc.shopify_customer_id END) AS m3,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 4 THEN noc.shopify_customer_id END) AS m4,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 5 THEN noc.shopify_customer_id END) AS m5,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 6 THEN noc.shopify_customer_id END) AS m6,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 7 THEN noc.shopify_customer_id END) AS m7,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 8 THEN noc.shopify_customer_id END) AS m8,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 9 THEN noc.shopify_customer_id END) AS m9,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 10 THEN noc.shopify_customer_id END) AS m10,
      COUNT(DISTINCT CASE WHEN DATE_PART('month', noc.nth_order_date - poc.cohort_month) = 11 THEN noc.shopify_customer_id END) AS m11
    FROM 
      previous_order_customers poc
      LEFT JOIN nth_order_customers noc ON poc.shopify_customer_id = noc.shopify_customer_id
    GROUP BY 
      TO_CHAR(poc.cohort_month, 'YYYY-MM')
  )
  
  SELECT 
    cohort_month,
    previous_order_customers,
    nth_orders,
    m0,
    m1,
    m2,
    m3,
    m4,
    m5,
    m6,
    m7,
    m8,
    m9,
    m10,
    m11
  FROM 
    cohort_data
  ORDER BY 
    cohort_month;
END;
$$;

-- Create function to get multi-order cohort customers
CREATE OR REPLACE FUNCTION production.get_multi_order_cohort_customers(
  cohort_start_date date,
  cohort_end_date date,
  month_index integer,
  order_number integer DEFAULT 3,
  product_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  shopify_customer_id text,
  email text,
  first_name text,
  last_name text,
  total_spent numeric,
  orders_count integer,
  created_at timestamp with time zone,
  primary_product_cohort text
)
LANGUAGE plpgsql
AS $$
DECLARE
  prev_order_number integer := order_number - 1;
BEGIN
  RETURN QUERY
  WITH 
  -- Get customers who made the previous order (n-1)
  previous_order_customers AS (
    SELECT 
      c.shopify_customer_id,
      DATE_TRUNC('month', MIN(o.processed_at)) AS cohort_month
    FROM 
      production.customers c
      JOIN production.orders o ON c.shopify_customer_id = o.shopify_customer_id
      LEFT JOIN production.order_line_items oli ON o.id = oli.order_id
    WHERE 
      DATE_TRUNC('month', MIN(o.processed_at)) BETWEEN DATE_TRUNC('month', cohort_start_date) AND DATE_TRUNC('month', cohort_end_date)
      AND (product_type IS NULL OR oli.product_type = product_type)
    GROUP BY 
      c.shopify_customer_id
    HAVING 
      COUNT(DISTINCT o.id) >= prev_order_number
  ),
  
  -- Get customers who made the nth order in the specified month index
  nth_order_customers AS (
    SELECT 
      c.id,
      c.shopify_customer_id,
      c.email,
      c.first_name,
      c.last_name,
      c.total_spent,
      c.orders_count,
      c.created_at,
      c.primary_product_cohort,
      poc.cohort_month,
      MIN(o.processed_at) AS nth_order_date
    FROM 
      production.customers c
      JOIN production.orders o ON c.shopify_customer_id = o.shopify_customer_id
      LEFT JOIN production.order_line_items oli ON o.id = oli.order_id
      JOIN previous_order_customers poc ON c.shopify_customer_id = poc.shopify_customer_id
    WHERE 
      (product_type IS NULL OR oli.product_type = product_type)
    GROUP BY 
      c.id, c.shopify_customer_id, c.email, c.first_name, c.last_name, 
      c.total_spent, c.orders_count, c.created_at, c.primary_product_cohort, poc.cohort_month
    HAVING 
      COUNT(DISTINCT o.id) >= order_number
      AND DATE_PART('month', MIN(o.processed_at) - poc.cohort_month) = month_index
  )
  
  SELECT 
    id,
    shopify_customer_id,
    email,
    first_name,
    last_name,
    total_spent,
    orders_count,
    created_at,
    primary_product_cohort
  FROM 
    nth_order_customers;
END;
$$;

-- Grant permissions to service_role
GRANT USAGE ON SCHEMA production TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA production TO service_role;
