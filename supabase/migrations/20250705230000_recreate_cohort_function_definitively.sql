-- This migration definitively fixes the cohort analysis function by first dropping the old version
-- to resolve signature conflicts, and then creating the correct, hardened version.

DROP FUNCTION IF EXISTS production.get_cohort_analysis_data(TEXT);

CREATE OR REPLACE FUNCTION production.get_cohort_analysis_data(p_product_filter TEXT DEFAULT 'ALL')
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH
    ranked_orders AS (
        SELECT
            o.customer_id,
            o.processed_at,
            ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.processed_at ASC) as order_rank
        FROM
            production.orders o
        WHERE
            o.customer_id IS NOT NULL
    ),
    customer_cohorts AS (
        SELECT
            ro.customer_id,
            ro.processed_at AS first_order_at,
            c.primary_product_cohort,
            TO_CHAR(ro.processed_at, 'YYYY-MM-01')::DATE AS cohort_month
        FROM
            ranked_orders ro
        JOIN
            production.customers c ON ro.customer_id = c.id
        WHERE
            ro.order_rank = 1
            AND TO_CHAR(ro.processed_at, 'YYYY-MM') = TO_CHAR(c.created_at, 'YYYY-MM')
    ),
    second_orders AS (
        SELECT
            customer_id,
            processed_at AS second_order_at
        FROM
            ranked_orders
        WHERE
            order_rank = 2
    ),
    full_cohort_data AS (
        SELECT
            cc.cohort_month,
            cc.customer_id,
            so.second_order_at,
            (DATE_PART('year', so.second_order_at) - DATE_PART('year', cc.first_order_at)) * 12 +
            (DATE_PART('month', so.second_order_at) - DATE_PART('month', cc.first_order_at)) AS month_number
        FROM
            customer_cohorts cc
        LEFT JOIN
            second_orders so ON cc.customer_id = so.customer_id
        WHERE
            (p_product_filter = 'ALL' OR cc.primary_product_cohort = p_product_filter)
    ),
    cohort_summary AS (
        SELECT
            cohort_month,
            COUNT(DISTINCT customer_id) AS new_customers,
            COUNT(DISTINCT CASE WHEN second_order_at IS NOT NULL THEN customer_id END) AS total_second_orders
        FROM
            full_cohort_data
        GROUP BY
            cohort_month
    ),
    monthly_retention_counts AS (
        SELECT
            cohort_month,
            month_number,
            COUNT(DISTINCT customer_id) AS retained_customers
        FROM
            full_cohort_data
        WHERE
            month_number IS NOT NULL
        GROUP BY
            cohort_month, month_number
    ),
    final_cohorts AS (
        SELECT
            cs.cohort_month,
            cs.new_customers,
            cs.total_second_orders,
            (cs.new_customers - cs.total_second_orders) AS opportunity_count,
            ROUND(CASE WHEN cs.new_customers > 0 THEN (cs.total_second_orders::decimal / cs.new_customers * 100) ELSE 0 END, 2) AS retention_percentage,
            COALESCE(
                (
                    SELECT jsonb_object_agg(
                        'm' || mrc.month_number,
                        jsonb_build_object(
                            'count', mrc.retained_customers,
                            'percentage', ROUND(CASE WHEN cs.new_customers > 0 THEN (mrc.retained_customers::decimal / cs.new_customers * 100) ELSE 0 END, 2),
                            'contribution_percentage', ROUND(CASE WHEN cs.total_second_orders > 0 THEN (mrc.retained_customers::decimal / cs.total_second_orders * 100) ELSE 0 END, 2)
                        )
                    )
                    FROM monthly_retention_counts mrc
                    WHERE mrc.cohort_month = cs.cohort_month
                ),
                '{}'::jsonb
            ) AS monthly_data
        FROM
            cohort_summary cs
    ),
    grand_total AS (
        SELECT
            COALESCE(SUM(new_customers), 0) AS new_customers,
            COALESCE(SUM(total_second_orders), 0) AS total_second_orders,
            ROUND(CASE WHEN COALESCE(SUM(new_customers), 0) > 0 THEN (COALESCE(SUM(total_second_orders), 0)::decimal / SUM(new_customers) * 100) ELSE 0 END, 2) AS retention_percentage
        FROM
            cohort_summary
    )
    SELECT jsonb_build_object(
        'cohorts', (SELECT COALESCE(jsonb_agg(fc ORDER BY fc.cohort_month DESC), '[]'::jsonb) FROM final_cohorts fc),
        'grandTotal', (SELECT to_jsonb(gt.*) FROM grand_total gt)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
