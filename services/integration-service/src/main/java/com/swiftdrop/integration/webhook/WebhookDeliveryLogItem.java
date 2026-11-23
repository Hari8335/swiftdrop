package com.swiftdrop.integration.webhook;

import java.time.Instant;
import java.util.UUID;

public record WebhookDeliveryLogItem(
        UUID deliveryId,
        UUID eventId,
        String eventType,
        String trackingNumber,
        String targetUrl,
        String status,
        Integer httpStatusCode,
        int attempts,
        Instant lastAttemptAt,
        Instant nextRetryAt,
        String errorSummary,
        Instant createdAt,
        /** Parcel lifecycle status from the signed payload (parcel.toStatus); null when not applicable. */
        String parcelStatus,
        /** All recorded attempts across automatic and manual retry cycles. */
        int totalAttempts,
        /** Manual retry cycles started by the merchant (each restarts the attempt counter at 1). */
        int manualRetryCount
) {
}
