-- This migration fixes the cohort analysis function to:
-- 1. Use processed_at instead of created_at (which doesn't exist in the orders table)
-- 2. Maintain all other functionality from the previous version

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_cohort_analysis_data(INT, TEXT) CASCADE;

-- Recreate function with corrected column references
CREATE OR REPLACE FUNCTION public.get_cohort_analysis_data(
    p_nth_order INT,
    p_product_filter TEXT
)
RETURNS TABLE(
    cohort_month TEXT,
    new_customers BIGINT,
    total_nth_orders BIGINT,
    m0 BIGINT, m1 BIGINT, m2 BIGINT, m3 BIGINT, m4 BIGINT, m5 BIGINT,
    m6 BIGINT, m7 BIGINT, m8 BIGINT, m9 BIGINT, m10 BIGINT, m11 BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH ranked_orders AS (
        SELECT
            o.customer_id,
            o.processed_at,  -- Changed from created_at to processed_at
            oli.product_type,
            ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.processed_at ASC) as rn
        FROM
            production.orders o
        JOIN
            production.order_line_items oli ON o.id = oli.order_id
        WHERE
            (p_product_filter = 'ALL' OR oli.product_type = p_product_filter)
    ),
    first_orders AS (
        SELECT
            customer_id,
            processed_at AS first_order_at,  -- Changed from created_at to processed_at
            TO_CHAR(processed_at, 'YYYY-MM') AS first_order_month  -- Changed from created_at to processed_at
        FROM
            ranked_orders
        WHERE
            rn = 1
    ),
    nth_orders AS (
        SELECT
            customer_id,
            processed_at AS nth_order_at  -- Changed from created_at to processed_at
        FROM
            ranked_orders
        WHERE
            rn = p_nth_order
    ),
    prev_orders AS (
        -- Get the (N-1)th order date for each customer
        SELECT
            customer_id,
            processed_at AS prev_order_at  -- Changed from created_at to processed_at
        FROM
            ranked_orders
        WHERE
            rn = p_nth_order - 1
    ),
    -- Use first order month for cohort assignment
    cohorts AS (
        SELECT
            first_order_month AS cohort_month,
            customer_id
        FROM
            first_orders
    ),
    cohort_sizes AS (
        SELECT
            c.cohort_month,
            COUNT(DISTINCT c.customer_id) AS new_customers
        FROM
            cohorts c
        GROUP BY
            c.cohort_month
    ),
    cohort_nth_orders AS (
        SELECT
            c.cohort_month,
            n.customer_id,
            -- Calculate month difference based on nth order
            -- For first order, compare to first order date
            -- For higher orders, compare to previous order date
            CASE WHEN p_nth_order = 1 THEN
                DATE_PART('year', n.nth_order_at) * 12 + DATE_PART('month', n.nth_order_at) - 
                (DATE_PART('year', f.first_order_at) * 12 + DATE_PART('month', f.first_order_at))
            ELSE
                DATE_PART('year', n.nth_order_at) * 12 + DATE_PART('month', n.nth_order_at) - 
                (DATE_PART('year', p.prev_order_at) * 12 + DATE_PART('month', p.prev_order_at))
            END AS month_number
        FROM
            nth_orders n
        JOIN
            first_orders f ON n.customer_id = f.customer_id
        LEFT JOIN
            prev_orders p ON n.customer_id = p.customer_id
        JOIN
            cohorts c ON n.customer_id = c.customer_id
    )
    SELECT
        cs.cohort_month,
        cs.new_customers,
        COUNT(cno.customer_id) AS total_nth_orders,
        COUNT(CASE WHEN cno.month_number = 0 THEN cno.customer_id END) AS m0,
        COUNT(CASE WHEN cno.month_number = 1 THEN cno.customer_id END) AS m1,
        COUNT(CASE WHEN cno.month_number = 2 THEN cno.customer_id END) AS m2,
        COUNT(CASE WHEN cno.month_number = 3 THEN cno.customer_id END) AS m3,
        COUNT(CASE WHEN cno.month_number = 4 THEN cno.customer_id END) AS m4,
        COUNT(CASE WHEN cno.month_number = 5 THEN cno.customer_id END) AS m5,
        COUNT(CASE WHEN cno.month_number = 6 THEN cno.customer_id END) AS m6,
        COUNT(CASE WHEN cno.month_number = 7 THEN cno.customer_id END) AS m7,
        COUNT(CASE WHEN cno.month_number = 8 THEN cno.customer_id END) AS m8,
        COUNT(CASE WHEN cno.month_number = 9 THEN cno.customer_id END) AS m9,
        COUNT(CASE WHEN cno.month_number = 10 THEN cno.customer_id END) AS m10,
        COUNT(CASE WHEN cno.month_number = 11 THEN cno.customer_id END) AS m11
    FROM
        cohort_sizes cs
    LEFT JOIN
        cohort_nth_orders cno ON cs.cohort_month = cno.cohort_month
    GROUP BY
        cs.cohort_month, cs.new_customers
    ORDER BY
        cs.cohort_month;
END;
$$;

-- Grant permissions to the API roles to execute the function
GRANT EXECUTE ON FUNCTION public.get_cohort_analysis_data(INT, TEXT) TO postgres, anon, authenticated;

COMMIT;
