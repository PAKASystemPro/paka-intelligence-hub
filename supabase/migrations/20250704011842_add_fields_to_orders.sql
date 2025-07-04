ALTER TABLE production.orders
ADD COLUMN tags text[],
ADD COLUMN sales_channel text,
ADD COLUMN currency_code text,
ADD COLUMN email text,
ADD COLUMN fulfillment_status text,
ADD COLUMN financial_status text;
