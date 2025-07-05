ALTER TABLE production.customers
ADD CONSTRAINT customers_email_unique UNIQUE (email);
