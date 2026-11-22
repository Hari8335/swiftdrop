package com.swiftdrop.integration.merchant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "merchant_credential_handoffs")
public class MerchantCredentialHandoffEntity {
    @Id
    @Column(name = "notification_id", nullable = false)
    private UUID notificationId;

    @Column(name = "merchant_id", nullable = false)
    private UUID merchantId;

    @Column(name = "client_id", nullable = false, length = 128)
    private String clientId;

    @Column(name = "encrypted_secret", nullable = false, columnDefinition = "TEXT")
    private String encryptedSecret;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    protected MerchantCredentialHandoffEntity() {}

    public MerchantCredentialHandoffEntity(UUID notificationId, UUID merchantId, String clientId,
            String encryptedSecret, Instant createdAt, Instant expiresAt) {
        this.notificationId = notificationId;
        this.merchantId = merchantId;
        this.clientId = clientId;
        this.encryptedSecret = encryptedSecret;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public UUID getNotificationId() { return notificationId; }
    public UUID getMerchantId() { return merchantId; }
    public String getClientId() { return clientId; }
    public String getEncryptedSecret() { return encryptedSecret; }
    public Instant getExpiresAt() { return expiresAt; }

    @Override
    public String toString() {
        return "MerchantCredentialHandoffEntity[notificationId=" + notificationId + ", merchantId=" + merchantId
                + ", clientId=" + clientId + ", encryptedSecret=[REDACTED], expiresAt=" + expiresAt + "]";
    }
}
