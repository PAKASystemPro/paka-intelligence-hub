-- Check Schema and Table Structure
-- Run this script in the Supabase SQL Editor to check the database schema

-- Check if production schema exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.schemata WHERE schema_name = 'production'
) AS production_schema_exists;

-- Check tables in production schema
SELECT 
  table_name,
  (SELECT count(*) FROM production.customers) AS row_count
FROM information_schema.tables 
WHERE table_schema = 'production' 
  AND table_name = 'customers';

SELECT 
  table_name,
  (SELECT count(*) FROM production.orders) AS row_count
FROM information_schema.tables 
WHERE table_schema = 'production' 
  AND table_name = 'orders';

SELECT 
  table_name,
  (SELECT count(*) FROM production.order_line_items) AS row_count
FROM information_schema.tables 
WHERE table_schema = 'production' 
  AND table_name = 'order_line_items';

-- Check columns in customers table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'production' 
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- Check columns in orders table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'production' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check columns in order_line_items table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'production' 
  AND table_name = 'order_line_items'
ORDER BY ordinal_position;

-- Check public functions
SELECT 
  routine_name, 
  routine_type, 
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Check service_role permissions on production schema
SELECT 
  grantee, 
  privilege_type, 
  table_schema, 
  table_name
FROM information_schema.table_privileges
WHERE grantee = 'service_role' 
  AND table_schema = 'production'
LIMIT 10;

-- Check if materialized views exist
SELECT 
  schemaname, 
  matviewname, 
  matviewowner
FROM pg_matviews
WHERE schemaname = 'production';
