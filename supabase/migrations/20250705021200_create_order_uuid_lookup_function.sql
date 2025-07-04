CREATE OR REPLACE FUNCTION public.get_order_uuids_by_shopify_gids(p_shopify_ids TEXT[])
RETURNS TABLE(o_shopify_id TEXT, o_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.shopify_order_id::TEXT as o_shopify_id,
        o.id::UUID as o_id
    FROM production.orders o
    WHERE o.shopify_order_id = ANY(p_shopify_ids);
END;
$$ LANGUAGE plpgsql;
