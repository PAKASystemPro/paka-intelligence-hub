-- Function to get the list of customers for a specific cohort cell.
CREATE OR REPLACE FUNCTION production.get_cohort_customers(
    p_cohort_month TEXT,
    p_month_number INT,
    p_product_filter TEXT DEFAULT 'ALL'
)
RETURNS TABLE (
    customer_id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    first_order_at TIMESTAMPTZ,
    second_order_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH
    -- 1. Rank all orders for each customer
    ranked_orders AS (
        SELECT
            o.customer_id,
            o.id AS order_id,
            o.processed_at,
            (SELECT li.product_type FROM production.order_line_items li WHERE li.order_id = o.id LIMIT 1) as product_type,
            ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.processed_at ASC) as order_rank
        FROM
            production.orders o
        WHERE
            o.customer_id IS NOT NULL
    ),
    -- 2. Identify each customer's cohort
    customer_cohorts AS (
        SELECT
            ro.customer_id,
            ro.processed_at AS first_order_at,
            ro.product_type AS primary_product_cohort
        FROM
            ranked_orders ro
        JOIN
            production.customers c ON ro.customer_id = c.id
        WHERE
            ro.order_rank = 1
            AND TO_CHAR(ro.processed_at, 'YYYY-MM') = TO_CHAR(c.created_at, 'YYYY-MM')
            AND TO_CHAR(ro.processed_at, 'YYYY-MM') = p_cohort_month
            AND (p_product_filter = 'ALL' OR ro.product_type = p_product_filter)
    ),
    -- 3. Find the second order for the customers in the specific cohort
    cohort_second_orders AS (
        SELECT
            ro.customer_id,
            ro.processed_at AS second_order_at,
            (DATE_PART('year', ro.processed_at) - DATE_PART('year', cc.first_order_at)) * 12 +
            (DATE_PART('month', ro.processed_at) - DATE_PART('month', cc.first_order_at)) AS month_number
        FROM
            ranked_orders ro
        JOIN
            customer_cohorts cc ON ro.customer_id = cc.customer_id
        WHERE
            ro.order_rank = 2
    )
    -- 4. Filter for the specific month number and join to get customer details
    SELECT
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.email,
        cc.first_order_at,
        cso.second_order_at
    FROM
        customer_cohorts cc
    JOIN
        cohort_second_orders cso ON cc.customer_id = cso.customer_id
    JOIN
        production.customers c ON cc.customer_id = c.id
    WHERE
        cso.month_number = p_month_number;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the service_role
GRANT EXECUTE ON FUNCTION production.get_cohort_customers(TEXT, INT, TEXT) TO service_role;
