-- This migration fixes a fundamental design flaw.
-- Shopify allows guest orders where the customer is null.
-- The 'orders' table must be updated to allow a null 'shopify_customer_id' to reflect this reality.

ALTER TABLE production.orders
ALTER COLUMN shopify_customer_id DROP NOT NULL;
