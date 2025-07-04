-- Drop the function if it exists to ensure a clean recreation
DROP FUNCTION IF EXISTS production.get_customer_uuids_by_shopify_ids(text[]);

-- Recreate the function with an explicit cast to UUID to resolve type mismatch errors.
CREATE OR REPLACE FUNCTION production.get_customer_uuids_by_shopify_ids(p_shopify_ids text[])
RETURNS TABLE(o_shopify_id text, o_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT c.shopify_customer_id, c.id::uuid
  FROM production.customers c
  WHERE c.shopify_customer_id = ANY(p_shopify_ids);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the new function to the authenticated role
GRANT EXECUTE ON FUNCTION production.get_customer_uuids_by_shopify_ids(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION production.get_customer_uuids_by_shopify_ids(text[]) TO service_role;
