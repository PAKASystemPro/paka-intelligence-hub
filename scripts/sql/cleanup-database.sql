-- Database Cleanup SQL Script for Nth-Cohort Branch
-- Run this in the Supabase SQL Editor to clean up all data while preserving schema

-- Disable triggers temporarily to avoid issues with foreign key constraints
SET session_replication_role = 'replica';

-- Delete data from tables in the correct order (respecting foreign key constraints)
DELETE FROM production.order_line_items;
DELETE FROM production.orders;
DELETE FROM production.customers;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Refresh materialized views
SELECT public.refresh_materialized_views();

-- Verify tables are empty
SELECT 'order_line_items' as table_name, COUNT(*) as row_count FROM production.order_line_items
UNION ALL
SELECT 'orders' as table_name, COUNT(*) as row_count FROM production.orders
UNION ALL
SELECT 'customers' as table_name, COUNT(*) as row_count FROM production.customers;

-- Ensure service_role has proper permissions (if needed)
GRANT USAGE ON SCHEMA production TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA production TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA production TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA production TO service_role;
