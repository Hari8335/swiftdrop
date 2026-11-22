CREATE TABLE merchant_portal_notifications (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_merchant_portal_notification_type CHECK
        (event_type IN ('MERCHANT_APPROVED', 'CREDENTIALS_REPLACED'))
);

CREATE INDEX idx_merchant_portal_notifications_owner_created
    ON merchant_portal_notifications (merchant_id, created_at DESC);
CREATE INDEX idx_merchant_portal_notifications_unread
    ON merchant_portal_notifications (merchant_id, read_at) WHERE read_at IS NULL;

CREATE TABLE merchant_credential_handoffs (
    notification_id UUID PRIMARY KEY REFERENCES merchant_portal_notifications(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    client_id VARCHAR(128) NOT NULL,
    encrypted_secret TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_merchant_credential_handoffs_expiry ON merchant_credential_handoffs (expires_at);
