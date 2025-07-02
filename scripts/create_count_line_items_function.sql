-- Function to count line items by order ID
CREATE OR REPLACE FUNCTION public.count_line_items_by_order(order_ids UUID[])
RETURNS TABLE(order_id UUID, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oli.order_id, 
    COUNT(oli.id)::BIGINT
  FROM 
    production.order_line_items oli
  WHERE 
    oli.order_id = ANY(order_ids)
  GROUP BY 
    oli.order_id;
END;
$$ LANGUAGE plpgsql;
