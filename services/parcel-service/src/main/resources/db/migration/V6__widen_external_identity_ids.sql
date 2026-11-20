-- Auth user IDs are VARCHAR(64). Widen only Parcel-owned columns that store
-- those external identities; parcel and tracking identifiers remain unchanged.
ALTER TABLE addresses
    ALTER COLUMN customer_id TYPE VARCHAR(64);

ALTER TABLE parcels
    ALTER COLUMN customer_id TYPE VARCHAR(64),
    ALTER COLUMN merchant_id TYPE VARCHAR(64),
    ALTER COLUMN courier_id TYPE VARCHAR(64);

ALTER TABLE parcel_rating
    ALTER COLUMN customer_id TYPE VARCHAR(64);

ALTER TABLE merchant_parcel_idempotency
    ALTER COLUMN merchant_id TYPE VARCHAR(64);
