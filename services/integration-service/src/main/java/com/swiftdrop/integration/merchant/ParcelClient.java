package com.swiftdrop.integration.merchant;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import java.util.List;

public interface ParcelClient {
    InternalParcelResponse createParcel(UUID merchantId, CreateMerchantOrderRequest request,
                                        BigDecimal fee, String downstreamIdempotencyKey);

    InternalParcelResponse cancelParcel(UUID parcelId, String reason, String downstreamIdempotencyKey);

    ParcelHistoryResponse getHistory(UUID parcelId);

    record InternalParcelResponse(String id, String trackingNumber, String status,
                                  String merchantId, BigDecimal fee, Instant createdAt, Instant updatedAt) {}

    record ParcelHistoryResponse(String parcelId, String trackingNumber, String currentStatus,
                                 List<ParcelHistoryEntry> entries) {}

    record ParcelHistoryEntry(Long sequence, String fromStatus, String toStatus,
                              Instant occurredAt, String reason) {}
}
