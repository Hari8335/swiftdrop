CREATE TABLE IF NOT EXISTS courier_locations (
    parcel_id UUID PRIMARY KEY,
    courier_id VARCHAR(64) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_courier_location_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_courier_location_longitude CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT chk_courier_location_accuracy CHECK (accuracy_meters >= 0 AND accuracy_meters <= 10000)
);
CREATE INDEX IF NOT EXISTS idx_courier_locations_courier ON courier_locations(courier_id);
