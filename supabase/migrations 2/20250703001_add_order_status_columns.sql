-- Add financial_status and fulfillment_status columns to orders table
ALTER TABLE production.orders 
ADD COLUMN IF NOT EXISTS financial_status TEXT,
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT;

-- Update permissions for service_role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA production TO service_role;
