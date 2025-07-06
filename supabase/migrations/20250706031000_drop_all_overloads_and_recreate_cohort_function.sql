-- This is the definitive migration to fix the "function not found" error.
-- The root cause is function overloading. Multiple functions with the same name
-- but different parameters existed in the database, causing ambiguity for the API.
-- This migration drops ALL possible signatures before creating the one correct version.

-- Step 1: Drop all potential overloaded versions from all schemas to ensure a clean slate.
BEGIN;

-- Drop from 'production' schema
DROP FUNCTION IF EXISTS production.get_cohort_analysis_data(INT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS production.get_cohort_analysis_data(TEXT, INT) CASCADE;
DROP FUNCTION IF EXISTS production.get_cohort_analysis_data(TEXT) CASCADE;
DROP FUNCTION IF EXISTS production.get_cohort_analysis_data(INT) CASCADE;

-- Drop from 'public' schema
DROP FUNCTION IF EXISTS public.get_cohort_analysis_data(INT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_cohort_analysis_data(TEXT, INT) CASCADE;
DROP FUNCTION IF EXISTS public.get_cohort_analysis_data(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_cohort_analysis_data(INT) CASCADE;

-- Step 2: Recreate the one, correct function with the correct parameter order.
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
            o.created_at,
            oli.product_type,
            ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.created_at ASC) as rn
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
            created_at AS first_order_at
        FROM
            ranked_orders
        WHERE
            rn = 1
    ),
    nth_orders AS (
        SELECT
            customer_id,
            created_at AS nth_order_at
        FROM
            ranked_orders
        WHERE
            rn = p_nth_order
    ),
    cohorts AS (
        SELECT
            TO_CHAR(f.first_order_at, 'YYYY-MM') AS cohort_month,
            f.customer_id
        FROM
            first_orders f
    ),
    cohort_sizes AS (
        SELECT
            cohort_month,
            COUNT(DISTINCT customer_id) AS new_customers
        FROM
            cohorts
        GROUP BY
            cohort_month
    ),
    cohort_nth_orders AS (
        SELECT
            c.cohort_month,
            n.customer_id,
            DATE_PART('year', n.nth_order_at) * 12 + DATE_PART('month', n.nth_order_at) - (DATE_PART('year', f.first_order_at) * 12 + DATE_PART('month', f.first_order_at)) AS month_number
        FROM
            nth_orders n
        JOIN
            first_orders f ON n.customer_id = f.customer_id
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

-- Step 3: Grant permissions to the API roles to execute the function.
-- This is critical for the function to be accessible via the Supabase API.
GRANT USAGE ON SCHEMA production TO postgres, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cohort_analysis_data(INT, TEXT) TO postgres, anon, authenticated;

COMMIT;
