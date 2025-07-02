-- Create test_customers function
CREATE OR REPLACE FUNCTION public.test_customers()
RETURNS SETOF json AS $$
BEGIN
  RETURN QUERY 
  SELECT json_agg(c) 
  FROM (
    SELECT * FROM production.customers LIMIT 5
  ) c;
END;
$$ LANGUAGE plpgsql;
