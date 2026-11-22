ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS pickup_latitude DOUBLE PRECISION;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS pickup_longitude DOUBLE PRECISION;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS dropoff_latitude DOUBLE PRECISION;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS dropoff_longitude DOUBLE PRECISION;

ALTER TABLE addresses ADD CONSTRAINT chk_addresses_latitude
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
ALTER TABLE addresses ADD CONSTRAINT chk_addresses_longitude
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
ALTER TABLE parcels ADD CONSTRAINT chk_parcels_pickup_latitude
    CHECK (pickup_latitude IS NULL OR pickup_latitude BETWEEN -90 AND 90);
ALTER TABLE parcels ADD CONSTRAINT chk_parcels_pickup_longitude
    CHECK (pickup_longitude IS NULL OR pickup_longitude BETWEEN -180 AND 180);
ALTER TABLE parcels ADD CONSTRAINT chk_parcels_dropoff_latitude
    CHECK (dropoff_latitude IS NULL OR dropoff_latitude BETWEEN -90 AND 90);
ALTER TABLE parcels ADD CONSTRAINT chk_parcels_dropoff_longitude
    CHECK (dropoff_longitude IS NULL OR dropoff_longitude BETWEEN -180 AND 180);
