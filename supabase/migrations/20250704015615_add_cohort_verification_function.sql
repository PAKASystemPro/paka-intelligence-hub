CREATE OR REPLACE FUNCTION public.get_cohort_verification_stats(start_date_param TEXT, end_date_param TEXT)
RETURNS TABLE(metric TEXT, value BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH customer_order_ranks AS (
    SELECT
      customer_id,
      processed_at,
      ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY processed_at ASC) as order_rank
    FROM
      production.orders
    WHERE customer_id IS NOT NULL
  )
  SELECT
    'new_customers' AS metric,
    COUNT(DISTINCT customer_id) AS value
  FROM
    customer_order_ranks
  WHERE
    order_rank = 1
    AND processed_at >= start_date_param::TIMESTAMPTZ
    AND processed_at <= end_date_param::TIMESTAMPTZ

  UNION ALL

  SELECT
    'second_order_customers' AS metric,
    COUNT(DISTINCT customer_id) AS value
  FROM
    customer_order_ranks
  WHERE
    order_rank = 2
    AND processed_at >= start_date_param::TIMESTAMPTZ
    AND processed_at <= end_date_param::TIMESTAMPTZ;

END;
$$ LANGUAGE plpgsql;
