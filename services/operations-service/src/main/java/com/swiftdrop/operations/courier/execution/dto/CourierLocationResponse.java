package com.swiftdrop.operations.courier.execution.dto;

import java.time.Instant;
import java.util.UUID;

public record CourierLocationResponse(
    UUID parcelId,
    double latitude,
    double longitude,
    double accuracyMeters,
    Instant recordedAt,
    Instant receivedAt
) {}
