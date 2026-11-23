-- Profile picture (customer/courier/dispatcher) or business logo (merchant).
-- Stored as a validated image data URL (PNG/JPEG/WebP, <= 200 KB decoded); NULL means "use initials".
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT;
