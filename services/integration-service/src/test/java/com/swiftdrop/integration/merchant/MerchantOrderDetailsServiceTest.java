package com.swiftdrop.integration.merchant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class MerchantOrderDetailsServiceTest {
    private final MerchantOrderQuery orders = org.mockito.Mockito.mock(MerchantOrderQuery.class);
    private final ParcelClient parcels = org.mockito.Mockito.mock(ParcelClient.class);
    private final MerchantOrderDetailsService service = new MerchantOrderDetailsService(orders, parcels);
    private final UUID merchantId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();
    private final UUID parcelId = UUID.randomUUID();

    @Test
    void returnsMerchantOwnedOrderAndActualChronologicalHistory() {
        Instant created = Instant.parse("2026-11-20T08:00:00Z");
        Instant failed = Instant.parse("2026-11-20T09:00:00Z");
        Instant requeued = Instant.parse("2026-11-20T09:01:00Z");
        Instant delivered = Instant.parse("2026-11-20T11:00:00Z");
        MerchantOrder order = new MerchantOrder(orderId, merchantId, parcelId, "SD-TRACK-1", "shop-ref-1",
                MerchantOrderStatus.DELIVERED, new BigDecimal("1200.00"), "Nimal Perera", "Kandy", created, delivered);
        when(orders.findByIdAndMerchantId(orderId, merchantId)).thenReturn(Optional.of(order));
        when(parcels.getHistory(parcelId)).thenReturn(new ParcelClient.ParcelHistoryResponse(parcelId.toString(),
                "SD-TRACK-1", "DELIVERED", List.of(
                new ParcelClient.ParcelHistoryEntry(null, null, "CREATED", created, "Created"),
                new ParcelClient.ParcelHistoryEntry(null, "OUT_FOR_DELIVERY", "FAILED", failed, "Recipient absent"),
                new ParcelClient.ParcelHistoryEntry(null, "FAILED", "CREATED", requeued, "Requeued"),
                new ParcelClient.ParcelHistoryEntry(null, "OUT_FOR_DELIVERY", "DELIVERED", delivered, null))));

        MerchantOrderDetailsResponse result = service.get(orderId, merchantId);

        assertThat(result.externalReference()).isEqualTo("shop-ref-1");
        assertThat(result.status()).isEqualTo("DELIVERED");
        assertThat(result.history()).extracting(MerchantOrderDetailsResponse.StatusEntry::toStatus)
                .containsExactly("CREATED", "FAILED", "CREATED", "DELIVERED");
        assertThat(result.history().get(2).reason()).isEqualTo("Requeued");
        assertThat(result.history().get(3).occurredAt()).isEqualTo(delivered);
        verify(parcels).getHistory(parcelId);
    }

    @Test
    void hidesOrdersThatDoNotBelongToMerchantAndDoesNotQueryParcelService() {
        when(orders.findByIdAndMerchantId(orderId, merchantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(orderId, merchantId))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(parcels);
    }
}
