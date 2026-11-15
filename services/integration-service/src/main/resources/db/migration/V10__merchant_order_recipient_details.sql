ALTER TABLE merchant_orders
    ADD COLUMN recipient_name VARCHAR(255),
    ADD COLUMN recipient_address VARCHAR(1024);
