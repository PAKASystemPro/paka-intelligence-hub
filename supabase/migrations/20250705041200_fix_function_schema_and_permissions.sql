-- Step 1: Drop the misplaced function from the public schema if it exists.
-- The previous migration created it here by mistake due to the default search path.
DROP FUNCTION IF EXISTS public.get_cohort_analysis(TEXT);

-- Step 2: Recreate the function in the correct 'production' schema.
-- This ensures it's co-located with the tables it queries.
CREATE OR REPLACE FUNCTION production.get_cohort_analysis(p_product_filter TEXT DEFAULT 'ALL')
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH
    -- 1. Rank all orders for each customer to easily find their first, second, etc.
    ranked_orders AS (
        SELECT
            o.customer_id,
            o.id AS order_id,
            o.processed_at,
            -- We take the first line item's product type to define the order's type
            (SELECT li.product_type FROM production.order_line_items li WHERE li.order_id = o.id LIMIT 1) as product_type,
            ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.processed_at ASC) as order_rank
        FROM
            production.orders o
        WHERE
            o.customer_id IS NOT NULL
    ),

    -- 2. Identify each customer's cohort month and product cohort from their first order
    -- THIS IS THE CORRECTED LOGIC: A customer's first order month must match their creation month.
    customer_cohorts AS (
        SELECT
            ro.customer_id,
            ro.processed_at AS first_order_at,
            ro.product_type AS primary_product_cohort,
            TO_CHAR(ro.processed_at, 'YYYY-MM') AS cohort_month
        FROM
            ranked_orders ro
        JOIN
            production.customers c ON ro.customer_id = c.id
        WHERE
            ro.order_rank = 1 AND TO_CHAR(ro.processed_at, 'YYYY-MM') = TO_CHAR(c.created_at, 'YYYY-MM')
    ),

    -- 3. Find the date of the second order for each customer
    second_orders AS (
        SELECT
            customer_id,
            processed_at AS second_order_at
        FROM
            ranked_orders
        WHERE
            order_rank = 2
    ),

    -- 4. Join cohort data with second order data, applying the product filter
    full_cohort_data AS (
        SELECT
            cc.cohort_month,
            cc.customer_id,
            so.second_order_at,
            -- Calculate month number difference between first and second order
            (DATE_PART('year', so.second_order_at) - DATE_PART('year', cc.first_order_at)) * 12 +
            (DATE_PART('month', so.second_order_at) - DATE_PART('month', cc.first_order_at)) AS month_number
        FROM
            customer_cohorts cc
        LEFT JOIN
            second_orders so ON cc.customer_id = so.customer_id
        WHERE
            (p_product_filter = 'ALL' OR cc.primary_product_cohort = p_product_filter)
    ),

    -- 5. Calculate cohort-level summary stats
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

    -- 6. Calculate the monthly counts of retained customers for the JSON aggregation
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

    -- 7. Assemble the final cohort data, including the nested monthly_data JSON object
    final_cohorts AS (
        SELECT
            cs.cohort_month,
            cs.new_customers,
            cs.total_second_orders,
            ROUND(CASE WHEN cs.new_customers > 0 THEN (cs.total_second_orders::decimal / cs.new_customers * 100) ELSE 0 END, 2) AS retention_percentage,
            COALESCE(
                (
                    SELECT jsonb_object_agg(
                        'm' || mrc.month_number,
                        jsonb_build_object(
                            'count', mrc.retained_customers,
                            'percentage', ROUND(
                                CASE
                                    WHEN cs.new_customers > 0 THEN (mrc.retained_customers::decimal / cs.new_customers * 100)
                                    ELSE 0
                                END, 2
                            )
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

    -- 8. Calculate the grand totals for the entire filtered dataset
    grand_total AS (
        SELECT
            SUM(new_customers) AS new_customers,
            SUM(total_second_orders) AS total_second_orders,
            ROUND(CASE WHEN SUM(new_customers) > 0 THEN (SUM(total_second_orders)::decimal / SUM(new_customers) * 100) ELSE 0 END, 2) AS retention_percentage
        FROM
            cohort_summary
    )

    -- 9. Combine cohorts and grand total into a single JSON response
    SELECT jsonb_build_object(
        'cohorts', (SELECT COALESCE(jsonb_agg(fc.* ORDER BY fc.cohort_month), '[]'::jsonb) FROM final_cohorts fc),
        'grandTotal', (SELECT to_jsonb(gt.*) FROM grand_total gt)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Grant execute permission to the service_role.
-- This is critical for allowing the PostgREST API gateway to call the function.
GRANT EXECUTE ON FUNCTION production.get_cohort_analysis(TEXT) TO service_role;
