package com.swiftdrop.integration.merchant;

import java.time.Instant;
import java.util.UUID;

public record MerchantPortalNotificationDto(
        UUID id,
        MerchantPortalNotificationType type,
        String title,
        String message,
        boolean read,
        boolean credentialAvailable,
        Instant createdAt) {
    static MerchantPortalNotificationDto from(MerchantPortalNotificationEntity entity, boolean credentialAvailable) {
        return new MerchantPortalNotificationDto(entity.getId(), entity.getEventType(), entity.getTitle(),
                entity.getMessage(), entity.isRead(), credentialAvailable, entity.getCreatedAt());
    }
}
