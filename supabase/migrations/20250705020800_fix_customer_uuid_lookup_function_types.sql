CREATE OR REPLACE FUNCTION public.get_customer_uuids_by_shopify_ids(p_shopify_ids TEXT[])
RETURNS TABLE(o_shopify_id TEXT, o_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.shopify_customer_id::TEXT as o_shopify_id, 
        c.id::UUID as o_id
    FROM production.customers c
    WHERE c.shopify_customer_id = ANY(p_shopify_ids);
END;
$$ LANGUAGE plpgsql;
