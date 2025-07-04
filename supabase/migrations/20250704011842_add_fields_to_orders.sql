ALTER TABLE production.orders
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS sales_channel text,
ADD COLUMN IF NOT EXISTS currency_code text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS fulfillment_status text,
ADD COLUMN IF NOT EXISTS financial_status text;
