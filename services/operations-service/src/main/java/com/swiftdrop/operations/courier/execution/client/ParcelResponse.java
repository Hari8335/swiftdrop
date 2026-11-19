package com.swiftdrop.operations.courier.execution.client;

import java.time.Instant;
import java.util.UUID;

public record ParcelResponse(
    UUID id,
    String trackingNumber,
    String status,
    String customerId,
    String merchantId,
    String courierId,
    AddressDto pickupAddress,
    AddressDto dropoffAddress,
    Double weightKg,
    String size,
    Double fee,
    Integer attemptCount,
    String failureReason,
    String recipientName,
    String recipientPhone,
    String notes,
    DeliveryProofDto proof,
    Long sequence,
    Instant createdAt,
    Instant updatedAt,
    Instant assignedAt,
    Instant completedAt
) {
    /** Backward-compatible constructor for callers that do not set assignment or completion times. */
    public ParcelResponse(
        UUID id,
        String trackingNumber,
        String status,
        String customerId,
        String merchantId,
        String courierId,
        AddressDto pickupAddress,
        AddressDto dropoffAddress,
        Double weightKg,
        String size,
        Double fee,
        Integer attemptCount,
        String failureReason,
        String recipientName,
        String recipientPhone,
        String notes,
        DeliveryProofDto proof,
        Long sequence,
        Instant createdAt,
        Instant updatedAt
    ) {
        this(id, trackingNumber, status, customerId, merchantId, courierId, pickupAddress, dropoffAddress,
            weightKg, size, fee, attemptCount, failureReason, recipientName, recipientPhone, notes, proof,
            sequence, createdAt, updatedAt, null, null);
    }
}
