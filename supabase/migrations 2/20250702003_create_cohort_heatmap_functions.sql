-- Create function to get cohort heatmap data
CREATE OR REPLACE FUNCTION public.get_test_cohort_heatmap()
RETURNS TABLE (
  cohort_month text,
  new_customers integer,
  second_orders integer,
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
BEGIN
  RETURN QUERY
  SELECT
    ch.cohort_month,
    ch.new_customers,
    ch.total_second_orders AS second_orders,
    COALESCE((ch.monthly_data->'m0'->>'count')::integer, 0) AS m0,
    COALESCE((ch.monthly_data->'m1'->>'count')::integer, 0) AS m1,
    COALESCE((ch.monthly_data->'m2'->>'count')::integer, 0) AS m2,
    COALESCE((ch.monthly_data->'m3'->>'count')::integer, 0) AS m3,
    COALESCE((ch.monthly_data->'m4'->>'count')::integer, 0) AS m4,
    COALESCE((ch.monthly_data->'m5'->>'count')::integer, 0) AS m5,
    COALESCE((ch.monthly_data->'m6'->>'count')::integer, 0) AS m6,
    COALESCE((ch.monthly_data->'m7'->>'count')::integer, 0) AS m7,
    COALESCE((ch.monthly_data->'m8'->>'count')::integer, 0) AS m8,
    COALESCE((ch.monthly_data->'m9'->>'count')::integer, 0) AS m9,
    COALESCE((ch.monthly_data->'m10'->>'count')::integer, 0) AS m10,
    COALESCE((ch.monthly_data->'m11'->>'count')::integer, 0) AS m11
  FROM
    production.cohort_heatmap ch
  ORDER BY
    ch.cohort_month;
END;
$$;

-- Create function to get cohort heatmap data by product
CREATE OR REPLACE FUNCTION public.get_test_cohort_heatmap_by_product(p_product_cohort text)
RETURNS TABLE (
  cohort_month text,
  new_customers integer,
  second_orders integer,
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
BEGIN
  RETURN QUERY
  SELECT
    ch.cohort_month,
    ch.new_customers,
    ch.total_second_orders AS second_orders,
    COALESCE((ch.monthly_data->'m0'->>'count')::integer, 0) AS m0,
    COALESCE((ch.monthly_data->'m1'->>'count')::integer, 0) AS m1,
    COALESCE((ch.monthly_data->'m2'->>'count')::integer, 0) AS m2,
    COALESCE((ch.monthly_data->'m3'->>'count')::integer, 0) AS m3,
    COALESCE((ch.monthly_data->'m4'->>'count')::integer, 0) AS m4,
    COALESCE((ch.monthly_data->'m5'->>'count')::integer, 0) AS m5,
    COALESCE((ch.monthly_data->'m6'->>'count')::integer, 0) AS m6,
    COALESCE((ch.monthly_data->'m7'->>'count')::integer, 0) AS m7,
    COALESCE((ch.monthly_data->'m8'->>'count')::integer, 0) AS m8,
    COALESCE((ch.monthly_data->'m9'->>'count')::integer, 0) AS m9,
    COALESCE((ch.monthly_data->'m10'->>'count')::integer, 0) AS m10,
    COALESCE((ch.monthly_data->'m11'->>'count')::integer, 0) AS m11
  FROM
    production.cohort_heatmap ch
  WHERE
    ch.primary_product_cohort = p_product_cohort
  ORDER BY
    ch.cohort_month;
END;
$$;

-- Create function to get multi-order cohort heatmap data
CREATE OR REPLACE FUNCTION public.get_multi_order_cohort_heatmap(
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
BEGIN
  RETURN QUERY
  WITH cohort_months AS (
    SELECT DISTINCT
      TO_CHAR(DATE_TRUNC('month', o.processed_at), 'YYYY-MM') AS cohort_month
    FROM
      production.orders o
    ORDER BY
      cohort_month
  ),
  order_sequence AS (
    SELECT
      c.id AS customer_id,
      o.processed_at,
      ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.processed_at) AS order_num
    FROM
      production.customers c
    JOIN
      production.orders o ON c.id = o.customer_id
  ),
  first_orders AS (
    SELECT
      customer_id,
      TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') AS cohort_month,
      processed_at AS first_order_date
    FROM
      order_sequence
    WHERE
      order_num = 1
  ),
  previous_orders AS (
    SELECT
      customer_id,
      processed_at AS prev_order_date
    FROM
      order_sequence
    WHERE
      order_num = order_number - 1
  ),
  nth_orders AS (
    SELECT
      os.customer_id,
      fo.cohort_month,
      os.processed_at AS nth_order_date,
      po.prev_order_date,
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', os.processed_at), 
                          DATE_TRUNC('month', po.prev_order_date))) AS months_since_prev
    FROM
      order_sequence os
    JOIN
      first_orders fo ON os.customer_id = fo.customer_id
    JOIN
      previous_orders po ON os.customer_id = po.customer_id
    WHERE
      os.order_num = order_number
      AND os.processed_at > po.prev_order_date
  ),
  cohort_data AS (
    SELECT
      cm.cohort_month,
      COUNT(DISTINCT po.customer_id) AS previous_order_customers,
      COUNT(DISTINCT no.customer_id) AS nth_orders,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 0 THEN no.customer_id END) AS m0,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 1 THEN no.customer_id END) AS m1,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 2 THEN no.customer_id END) AS m2,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 3 THEN no.customer_id END) AS m3,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 4 THEN no.customer_id END) AS m4,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 5 THEN no.customer_id END) AS m5,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 6 THEN no.customer_id END) AS m6,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 7 THEN no.customer_id END) AS m7,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 8 THEN no.customer_id END) AS m8,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 9 THEN no.customer_id END) AS m9,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 10 THEN no.customer_id END) AS m10,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 11 THEN no.customer_id END) AS m11
    FROM
      cohort_months cm
    LEFT JOIN
      first_orders fo ON cm.cohort_month = fo.cohort_month
    LEFT JOIN
      previous_orders po ON fo.customer_id = po.customer_id
    LEFT JOIN
      nth_orders no ON fo.customer_id = no.customer_id
    GROUP BY
      cm.cohort_month
    ORDER BY
      cm.cohort_month
  )
  SELECT * FROM cohort_data;
END;
$$;

-- Create function to get multi-order cohort heatmap data by product
CREATE OR REPLACE FUNCTION public.get_multi_order_cohort_heatmap(
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
BEGIN
  RETURN QUERY
  WITH cohort_months AS (
    SELECT DISTINCT
      TO_CHAR(DATE_TRUNC('month', o.processed_at), 'YYYY-MM') AS cohort_month
    FROM
      production.orders o
    ORDER BY
      cohort_month
  ),
  order_sequence AS (
    SELECT
      c.id AS customer_id,
      o.processed_at,
      ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.processed_at) AS order_num
    FROM
      production.customers c
    JOIN
      production.orders o ON c.id = o.customer_id
    WHERE
      c.primary_product_cohort = product_type
  ),
  first_orders AS (
    SELECT
      customer_id,
      TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') AS cohort_month,
      processed_at AS first_order_date
    FROM
      order_sequence
    WHERE
      order_num = 1
  ),
  previous_orders AS (
    SELECT
      customer_id,
      processed_at AS prev_order_date
    FROM
      order_sequence
    WHERE
      order_num = order_number - 1
  ),
  nth_orders AS (
    SELECT
      os.customer_id,
      fo.cohort_month,
      os.processed_at AS nth_order_date,
      po.prev_order_date,
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', os.processed_at), 
                          DATE_TRUNC('month', po.prev_order_date))) AS months_since_prev
    FROM
      order_sequence os
    JOIN
      first_orders fo ON os.customer_id = fo.customer_id
    JOIN
      previous_orders po ON os.customer_id = po.customer_id
    WHERE
      os.order_num = order_number
      AND os.processed_at > po.prev_order_date
  ),
  cohort_data AS (
    SELECT
      cm.cohort_month,
      COUNT(DISTINCT po.customer_id) AS previous_order_customers,
      COUNT(DISTINCT no.customer_id) AS nth_orders,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 0 THEN no.customer_id END) AS m0,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 1 THEN no.customer_id END) AS m1,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 2 THEN no.customer_id END) AS m2,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 3 THEN no.customer_id END) AS m3,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 4 THEN no.customer_id END) AS m4,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 5 THEN no.customer_id END) AS m5,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 6 THEN no.customer_id END) AS m6,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 7 THEN no.customer_id END) AS m7,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 8 THEN no.customer_id END) AS m8,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 9 THEN no.customer_id END) AS m9,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 10 THEN no.customer_id END) AS m10,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 11 THEN no.customer_id END) AS m11
    FROM
      cohort_months cm
    LEFT JOIN
      first_orders fo ON cm.cohort_month = fo.cohort_month
    LEFT JOIN
      previous_orders po ON fo.customer_id = po.customer_id
    LEFT JOIN
      nth_orders no ON fo.customer_id = no.customer_id
    GROUP BY
      cm.cohort_month
    ORDER BY
      cm.cohort_month
  )
  SELECT * FROM cohort_data;
END;
$$;

-- Create function to get multi-order cohort customers
CREATE OR REPLACE FUNCTION public.get_multi_order_cohort_customers(
  cohort_month text,
  month_index integer,
  product_type text DEFAULT 'All',
  order_number integer DEFAULT 3
)
RETURNS TABLE (
  customer_id uuid,
  email text,
  first_name text,
  last_name text,
  first_order_date timestamp,
  nth_order_date timestamp,
  months_between integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF product_type = 'All' THEN
    RETURN QUERY
    WITH order_sequence AS (
      SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        o.processed_at,
        ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.processed_at) AS order_num
      FROM
        production.customers c
      JOIN
        production.orders o ON c.id = o.customer_id
    ),
    first_orders AS (
      SELECT
        customer_id,
        email,
        first_name,
        last_name,
        processed_at AS first_order_date,
        TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') AS cohort_month
      FROM
        order_sequence
      WHERE
        order_num = 1
        AND TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') = cohort_month
    ),
    previous_orders AS (
      SELECT
        customer_id,
        processed_at AS prev_order_date
      FROM
        order_sequence
      WHERE
        order_num = order_number - 1
    ),
    nth_orders AS (
      SELECT
        os.customer_id,
        os.processed_at AS nth_order_date,
        po.prev_order_date,
        EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', os.processed_at), 
                            DATE_TRUNC('month', po.prev_order_date))) AS months_since_prev
      FROM
        order_sequence os
      JOIN
        previous_orders po ON os.customer_id = po.customer_id
      WHERE
        os.order_num = order_number
        AND os.processed_at > po.prev_order_date
    )
    SELECT
      fo.customer_id,
      fo.email,
      fo.first_name,
      fo.last_name,
      fo.first_order_date,
      no.nth_order_date,
      no.months_since_prev::integer AS months_between
    FROM
      first_orders fo
    JOIN
      nth_orders no ON fo.customer_id = no.customer_id
    WHERE
      no.months_since_prev = month_index;
  ELSE
    RETURN QUERY
    WITH order_sequence AS (
      SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        o.processed_at,
        ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.processed_at) AS order_num
      FROM
        production.customers c
      JOIN
        production.orders o ON c.id = o.customer_id
      WHERE
        c.primary_product_cohort = product_type
    ),
    first_orders AS (
      SELECT
        customer_id,
        email,
        first_name,
        last_name,
        processed_at AS first_order_date,
        TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') AS cohort_month
      FROM
        order_sequence
      WHERE
        order_num = 1
        AND TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') = cohort_month
    ),
    previous_orders AS (
      SELECT
        customer_id,
        processed_at AS prev_order_date
      FROM
        order_sequence
      WHERE
        order_num = order_number - 1
    ),
    nth_orders AS (
      SELECT
        os.customer_id,
        os.processed_at AS nth_order_date,
        po.prev_order_date,
        EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', os.processed_at), 
                            DATE_TRUNC('month', po.prev_order_date))) AS months_since_prev
      FROM
        order_sequence os
      JOIN
        previous_orders po ON os.customer_id = po.customer_id
      WHERE
        os.order_num = order_number
        AND os.processed_at > po.prev_order_date
    )
    SELECT
      fo.customer_id,
      fo.email,
      fo.first_name,
      fo.last_name,
      fo.first_order_date,
      no.nth_order_date,
      no.months_since_prev::integer AS months_between
    FROM
      first_orders fo
    JOIN
      nth_orders no ON fo.customer_id = no.customer_id
    WHERE
      no.months_since_prev = month_index;
  END IF;
END;
$$;

-- Create function to get cohort customers
CREATE OR REPLACE FUNCTION public.get_test_cohort_customers(
  cohort_start_date text,
  cohort_end_date text,
  month_index integer,
  product_type text DEFAULT NULL,
  order_number integer DEFAULT 2
)
RETURNS TABLE (
  customer_id uuid,
  email text,
  first_name text,
  last_name text,
  first_order_date timestamp,
  second_order_date timestamp,
  months_between integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF product_type IS NULL THEN
    RETURN QUERY
    WITH first_orders AS (
      SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        MIN(o.processed_at) AS first_order_date
      FROM
        production.customers c
      JOIN
        production.orders o ON c.id = o.customer_id
      WHERE
        o.processed_at >= cohort_start_date::timestamp
        AND o.processed_at <= cohort_end_date::timestamp
      GROUP BY
        c.id, c.email, c.first_name, c.last_name
    ),
    second_orders AS (
      SELECT
        c.id AS customer_id,
        MIN(o2.processed_at) AS second_order_date
      FROM
        production.customers c
      JOIN
        production.orders o1 ON c.id = o1.customer_id
      JOIN
        production.orders o2 ON c.id = o2.customer_id
      WHERE
        o1.processed_at >= cohort_start_date::timestamp
        AND o1.processed_at <= cohort_end_date::timestamp
        AND o2.processed_at > o1.processed_at
      GROUP BY
        c.id
    )
    SELECT
      fo.customer_id,
      fo.email,
      fo.first_name,
      fo.last_name,
      fo.first_order_date,
      so.second_order_date,
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                           DATE_TRUNC('month', fo.first_order_date)))::integer AS months_between
    FROM
      first_orders fo
    JOIN
      second_orders so ON fo.customer_id = so.customer_id
    WHERE
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                           DATE_TRUNC('month', fo.first_order_date)))::integer = month_index;
  ELSE
    RETURN QUERY
    WITH first_orders AS (
      SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        MIN(o.processed_at) AS first_order_date
      FROM
        production.customers c
      JOIN
        production.orders o ON c.id = o.customer_id
      WHERE
        o.processed_at >= cohort_start_date::timestamp
        AND o.processed_at <= cohort_end_date::timestamp
        AND c.primary_product_cohort = product_type
      GROUP BY
        c.id, c.email, c.first_name, c.last_name
    ),
    second_orders AS (
      SELECT
        c.id AS customer_id,
        MIN(o2.processed_at) AS second_order_date
      FROM
        production.customers c
      JOIN
        production.orders o1 ON c.id = o1.customer_id
      JOIN
        production.orders o2 ON c.id = o2.customer_id
      WHERE
        o1.processed_at >= cohort_start_date::timestamp
        AND o1.processed_at <= cohort_end_date::timestamp
        AND o2.processed_at > o1.processed_at
        AND c.primary_product_cohort = product_type
      GROUP BY
        c.id
    )
    SELECT
      fo.customer_id,
      fo.email,
      fo.first_name,
      fo.last_name,
      fo.first_order_date,
      so.second_order_date,
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                           DATE_TRUNC('month', fo.first_order_date)))::integer AS months_between
    FROM
      first_orders fo
    JOIN
      second_orders so ON fo.customer_id = so.customer_id
    WHERE
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                           DATE_TRUNC('month', fo.first_order_date)))::integer = month_index;
  END IF;
END;
$$;
