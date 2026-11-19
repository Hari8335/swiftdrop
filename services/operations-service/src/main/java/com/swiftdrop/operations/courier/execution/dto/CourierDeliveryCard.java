package com.swiftdrop.operations.courier.execution.dto;

import java.time.Instant;
import java.util.UUID;

public record CourierDeliveryCard(
    UUID parcelId,
    String trackingNumber,
    String status,
    String recipientName,
    String recipientPhone,
    String pickupAddress,
    String dropoffAddress,
    String googleMapsUrl,
    Double weightKg,
    Integer attemptCount,
    Integer sequenceOrder,
    Instant completedAt,
    Instant assignedAt,
    boolean overdue
) {
    /** Backward-compatible constructor for cards without assignment information. */
    public CourierDeliveryCard(
        UUID parcelId,
        String trackingNumber,
        String status,
        String recipientName,
        String recipientPhone,
        String pickupAddress,
        String dropoffAddress,
        String googleMapsUrl,
        Double weightKg,
        Integer attemptCount,
        Integer sequenceOrder,
        Instant completedAt
    ) {
        this(parcelId, trackingNumber, status, recipientName, recipientPhone, pickupAddress, dropoffAddress,
            googleMapsUrl, weightKg, attemptCount, sequenceOrder, completedAt, null, false);
    }
}
