-- Replaces the previous function with a corrected version.
-- Fixes:
-- 1. Incorrect month difference calculation.
-- 2. Simplified and corrected opportunity_count logic.
-- 3. Ensures monthly_data is an empty JSON object '{}' instead of NULL for cohorts with no second orders.

CREATE OR REPLACE FUNCTION get_cohort_analysis_data(product_filter TEXT DEFAULT 'ALL')
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH customer_first_order AS (
        SELECT
            c.id AS customer_id,
            MIN(o.processed_at) AS first_order_at
        FROM production.customers c
        JOIN production.orders o ON c.id = o.customer_id
        WHERE
            CASE
                WHEN product_filter = 'ALL' THEN TRUE
                ELSE EXISTS (
                    SELECT 1
                    FROM production.order_line_items oli
                    WHERE oli.order_id = o.id AND oli.title = product_filter
                )
            END
        GROUP BY c.id
    ),
    customer_cohorts AS (
        SELECT
            customer_id,
            DATE_TRUNC('month', first_order_at)::DATE AS cohort_month
        FROM customer_first_order
    ),
    subsequent_orders AS (
        SELECT
            o.customer_id,
            o.processed_at AS order_at,
            cc.cohort_month,
            ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.processed_at) as order_rank
        FROM production.orders o
        JOIN customer_cohorts cc ON o.customer_id = cc.customer_id
        WHERE o.processed_at >= cc.cohort_month
          AND CASE
                WHEN product_filter = 'ALL' THEN TRUE
                ELSE EXISTS (
                    SELECT 1
                    FROM production.order_line_items oli
                    WHERE oli.order_id = o.id AND oli.title = product_filter
                )
              END
    ),
    second_orders AS (
        SELECT
            customer_id,
            cohort_month,
            order_at AS second_order_at
        FROM subsequent_orders
        WHERE order_rank = 2
    ),
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
            SUM(new_customers) AS total_new_customers,
            SUM(total_second_orders) AS grand_total_second_orders
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
