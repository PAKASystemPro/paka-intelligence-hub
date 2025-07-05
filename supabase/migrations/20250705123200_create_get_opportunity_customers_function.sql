-- 1. Create the function to get opportunity customers for a specific cohort
CREATE OR REPLACE FUNCTION production.get_cohort_opportunity_customers(
    p_cohort_month TEXT,
    p_product_filter TEXT DEFAULT 'ALL'
)
RETURNS TABLE (
    customer_id BIGINT,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    first_order_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        o.processed_at AS first_order_at
    FROM
        production.customers c
    JOIN (
        -- Find the first order for each customer to confirm their cohort entry
        SELECT
            customer_id,
            MIN(processed_at) as processed_at
        FROM
            production.orders
        GROUP BY
            customer_id
    ) o ON c.id = o.customer_id
    WHERE
        c.orders_count = 1
        AND TO_CHAR(c.created_at, 'YYYY-MM') = p_cohort_month
        AND (p_product_filter = 'ALL' OR c.primary_product_cohort = p_product_filter);
END;
$$ LANGUAGE plpgsql;

-- 2. Grant execute permission to the service_role
GRANT EXECUTE ON FUNCTION production.get_cohort_opportunity_customers(TEXT, TEXT) TO service_role;
