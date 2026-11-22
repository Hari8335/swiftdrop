package com.swiftdrop.operations.courier.execution.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record CourierLocationRequest(
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
    @NotNull @DecimalMin("0") @DecimalMax("10000") Double accuracyMeters,
    @NotNull Instant recordedAt
) {}
