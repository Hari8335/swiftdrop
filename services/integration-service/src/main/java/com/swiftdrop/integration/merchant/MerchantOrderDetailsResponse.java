package com.swiftdrop.integration.merchant;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MerchantOrderDetailsResponse(
        UUID orderId,
        UUID parcelId,
        String externalReference,
        String trackingNumber,
        String status,
        BigDecimal fee,
        String recipientName,
        String recipientAddress,
        Instant createdAt,
        Instant updatedAt,
        List<StatusEntry> history) {

    static MerchantOrderDetailsResponse from(MerchantOrder order, ParcelClient.ParcelHistoryResponse history) {
        List<StatusEntry> entries = history.entries() == null ? List.of() : history.entries().stream()
                .map(entry -> new StatusEntry(entry.fromStatus(), entry.toStatus(), entry.occurredAt(), entry.reason()))
                .toList();
        return new MerchantOrderDetailsResponse(order.orderId(), order.parcelId(), order.externalReference(),
                order.trackingNumber(), history.currentStatus(), order.fee(), order.recipientName(),
                order.recipientAddress(), order.createdAt(), order.updatedAt(), entries);
    }

    public record StatusEntry(String fromStatus, String toStatus, Instant occurredAt, String reason) {}
}
