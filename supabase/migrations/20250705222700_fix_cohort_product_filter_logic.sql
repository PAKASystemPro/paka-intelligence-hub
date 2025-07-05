-- This migration corrects the product filter logic in the cohort analysis function.
-- The filter was incorrectly applied to the customer's first order, causing the new customer count to be zero.
-- The fix ensures cohorts are defined by the first-ever order and the product filter only applies to second orders.

CREATE OR REPLACE FUNCTION production.get_cohort_analysis_data(product_filter TEXT DEFAULT 'ALL')
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH
    -- Step 1: Get the true first order for every customer, regardless of product. This defines the cohort.
    customer_first_order AS (
        SELECT
            c.id AS customer_id,
            MIN(o.processed_at) AS first_order_at
        FROM production.customers c
        JOIN production.orders o ON c.id = o.customer_id
        WHERE o.processed_at IS NOT NULL
        GROUP BY c.id
    ),
    -- Step 2: Assign customers to cohorts based on their first order month.
    customer_cohorts AS (
        SELECT
            customer_id,
            DATE_TRUNC('month', first_order_at)::DATE AS cohort_month
        FROM customer_first_order
    ),
    -- Step 3: Get all orders for all customers and rank them.
    all_customer_orders AS (
        SELECT
            o.id as order_id,
            o.customer_id,
            o.processed_at AS order_at,
            cc.cohort_month,
            ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.processed_at) as order_rank
        FROM production.orders o
        JOIN customer_cohorts cc ON o.customer_id = cc.customer_id
        WHERE o.processed_at >= cc.cohort_month
    ),
    -- Step 4: Identify the second order and apply the product filter here ONLY.
    second_orders AS (
        SELECT
            aco.customer_id,
            aco.cohort_month,
            aco.order_at AS second_order_at
        FROM all_customer_orders aco
        WHERE aco.order_rank = 2
          AND CASE
                WHEN product_filter = 'ALL' THEN TRUE
                ELSE EXISTS (
                    SELECT 1
                    FROM production.order_line_items oli
                    WHERE oli.order_id = aco.order_id AND oli.title = product_filter
                )
              END
    ),
    -- The rest of the query aggregates the results.
    cohort_monthly_data AS (
        SELECT
            cohort_month,
            DATE_TRUNC('month', second_order_at)::DATE AS second_order_month,
            COUNT(DISTINCT customer_id) AS count
        FROM second_orders
        GROUP BY cohort_month, second_order_month
    ),
    cohort_summary AS (
        SELECT
            cc.cohort_month,
            COUNT(DISTINCT cc.customer_id) AS new_customers,
            COUNT(DISTINCT so.customer_id) AS total_second_orders
        FROM customer_cohorts cc
        LEFT JOIN second_orders so ON cc.customer_id = so.customer_id
        GROUP BY cc.cohort_month
    ),
    final_cohorts AS (
        SELECT
            cs.cohort_month,
            cs.new_customers,
            cs.total_second_orders,
            (cs.new_customers - cs.total_second_orders) AS opportunity_count,
            CASE WHEN cs.new_customers > 0 THEN ROUND((cs.total_second_orders::DECIMAL / cs.new_customers) * 100, 2) ELSE 0 END AS retention_percentage,
            COALESCE(jsonb_object_agg(
                'm' || ((EXTRACT(YEAR FROM cmd.second_order_month) - EXTRACT(YEAR FROM cs.cohort_month)) * 12 + (EXTRACT(MONTH FROM cmd.second_order_month) - EXTRACT(MONTH FROM cs.cohort_month)))::INT,
                jsonb_build_object(
                    'count', cmd.count,
                    'percentage', CASE WHEN cs.new_customers > 0 THEN ROUND((cmd.count::DECIMAL / cs.new_customers) * 100, 2) ELSE 0 END,
                    'contribution_percentage', CASE WHEN cs.total_second_orders > 0 THEN ROUND((cmd.count::DECIMAL / cs.total_second_orders) * 100, 2) ELSE 0 END
                )
            ) FILTER (WHERE cmd.count IS NOT NULL), '{}'::jsonb) AS monthly_data
        FROM cohort_summary cs
        LEFT JOIN cohort_monthly_data cmd ON cs.cohort_month = cmd.cohort_month
        GROUP BY cs.cohort_month, cs.new_customers, cs.total_second_orders
    ),
    grand_total_calc AS (
        SELECT
            COALESCE(SUM(new_customers), 0) AS total_new_customers,
            COALESCE(SUM(total_second_orders), 0) AS grand_total_second_orders
        FROM cohort_summary
    )
    SELECT json_build_object(
        'cohorts', COALESCE((SELECT json_agg(fc ORDER BY fc.cohort_month DESC) FROM final_cohorts fc), '[]'::json),
        'grandTotal', json_build_object(
            'new_customers', gtc.total_new_customers,
            'total_second_orders', gtc.grand_total_second_orders,
            'retention_percentage', CASE WHEN gtc.total_new_customers > 0 THEN ROUND((gtc.grand_total_second_orders::DECIMAL / gtc.total_new_customers) * 100, 2) ELSE 0 END
        )
    )
    INTO result
    FROM grand_total_calc gtc;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
