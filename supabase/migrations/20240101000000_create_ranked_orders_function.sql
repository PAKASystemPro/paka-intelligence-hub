-- Create a function to get ranked customer orders
-- This function returns all customer orders with their rank (1st, 2nd, 3rd, etc.)
-- Used for flexible Nth order cohort analysis
-- Optionally filtered by cohort month (YYYY-MM)
CREATE OR REPLACE FUNCTION public.get_ranked_customer_orders(target_month TEXT DEFAULT NULL)
RETURNS TABLE (
  customer_id UUID,
  ordered_at TIMESTAMP WITH TIME ZONE,
  order_rank INTEGER
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH first_orders AS (
    SELECT
      customer_id,
      MIN(ordered_at) AS first_order_date
    FROM
      production.orders
    WHERE
      customer_id IS NOT NULL
    GROUP BY
      customer_id
  ),
  cohort_customers AS (
    SELECT
      fo.customer_id
    FROM
      first_orders fo
    WHERE
      target_month IS NULL OR
      TO_CHAR(fo.first_order_date, 'YYYY-MM') = target_month
  ),
  ranked_orders AS (
    SELECT
      o.customer_id,
      o.ordered_at,
      ROW_NUMBER() OVER (
        PARTITION BY o.customer_id 
        ORDER BY o.ordered_at ASC
      ) AS order_rank
    FROM
      production.orders o
    JOIN
      cohort_customers cc ON o.customer_id = cc.customer_id
    WHERE
      o.customer_id IS NOT NULL
  )
  SELECT 
    customer_id,
    ordered_at,
    order_rank
  FROM 
    ranked_orders
  ORDER BY
    customer_id,
    order_rank;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_ranked_customer_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_customer_orders() TO service_role;

-- Add comment to function
COMMENT ON FUNCTION public.get_ranked_customer_orders() IS 'Returns all customer orders with their rank (1st, 2nd, 3rd, etc.) for cohort analysis';
