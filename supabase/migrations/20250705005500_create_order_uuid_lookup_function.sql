DROP FUNCTION IF EXISTS production.get_order_uuids_by_shopify_ids(p_shopify_ids text[]);

CREATE OR REPLACE FUNCTION production.get_order_uuids_by_shopify_ids(p_shopify_ids TEXT[])
RETURNS TABLE(o_shopify_id TEXT, o_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.shopify_order_id::TEXT,
    o.id::UUID
  FROM
    production.orders o
  WHERE
    o.shopify_order_id = ANY(p_shopify_ids);
END;
$$ LANGUAGE plpgsql;
