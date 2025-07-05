-- Phase 1, Step 1: Fortify the data foundation

-- 1. Add last_order_at column to store the date of the customer's most recent order
ALTER TABLE production.customers
ADD COLUMN last_order_at TIMESTAMPTZ;

-- 2. Harden the orders_count column to ensure data integrity
-- Update existing NULL values to 0 first
UPDATE production.customers
SET orders_count = 0
WHERE orders_count IS NULL;
-- Set a default value
ALTER TABLE production.customers
ALTER COLUMN orders_count SET DEFAULT 0;
-- Make it non-nullable
ALTER TABLE production.customers
ALTER COLUMN orders_count SET NOT NULL;


-- 3. Harden the total_spent column
-- Update existing NULL values to 0 first
UPDATE production.customers
SET total_spent = 0.00
WHERE total_spent IS NULL;
-- Set a default value
ALTER TABLE production.customers
ALTER COLUMN total_spent SET DEFAULT 0.00;
-- Make it non-nullable
ALTER TABLE production.customers
ALTER COLUMN total_spent SET NOT NULL;
