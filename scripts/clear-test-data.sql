-- Clear test data in the correct order
-- First, delete line items
DELETE FROM production.order_line_items
WHERE shopify_order_id LIKE 'shopify_order_%'
   OR shopify_order_id LIKE '%_test_%';

-- Then, delete orders
DELETE FROM production.orders
WHERE shopify_order_id LIKE 'shopify_order_%'
   OR shopify_order_id LIKE '%_test_%';

-- Finally, delete customers
DELETE FROM production.customers
WHERE email LIKE 'customer_%@example.com'
   OR email LIKE '%_test_%@example.com';

-- Verify deletion
SELECT 'Remaining test line items' as check_type, COUNT(*) as count FROM production.order_line_items
WHERE shopify_order_id LIKE 'shopify_order_%'
   OR shopify_order_id LIKE '%_test_%'
UNION ALL
SELECT 'Remaining test orders' as check_type, COUNT(*) as count FROM production.orders
WHERE shopify_order_id LIKE 'shopify_order_%'
   OR shopify_order_id LIKE '%_test_%'
UNION ALL
SELECT 'Remaining test customers' as check_type, COUNT(*) as count FROM production.customers
WHERE email LIKE 'customer_%@example.com'
   OR email LIKE '%_test_%@example.com';
