package com.swiftdrop.integration.merchant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "merchant_portal_notifications")
public class MerchantPortalNotificationEntity {
    @Id
    private UUID id;

    @Column(name = "merchant_id", nullable = false)
    private UUID merchantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 32)
    private MerchantPortalNotificationType eventType;

    @Column(nullable = false, length = 128)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected MerchantPortalNotificationEntity() {}

    public MerchantPortalNotificationEntity(UUID id, UUID merchantId, MerchantPortalNotificationType eventType,
            String title, String message, Instant createdAt) {
        this.id = id;
        this.merchantId = merchantId;
        this.eventType = eventType;
        this.title = title;
        this.message = message;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getMerchantId() { return merchantId; }
    public MerchantPortalNotificationType getEventType() { return eventType; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public Instant getReadAt() { return readAt; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isRead() { return readAt != null; }
    public void markRead(Instant now) { if (readAt == null) readAt = now; }
}
