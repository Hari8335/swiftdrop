package com.swiftdrop.integration.merchant;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MerchantOrderDetailsService {
    private final MerchantOrderQuery orders;
    private final ParcelClient parcels;

    public MerchantOrderDetailsService(MerchantOrderQuery orders, ParcelClient parcels) {
        this.orders = orders;
        this.parcels = parcels;
    }

    public MerchantOrderDetailsResponse get(UUID orderId, UUID merchantId) {
        MerchantOrder order = orders.findByIdAndMerchantId(orderId, merchantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Merchant order not found"));
        ParcelClient.ParcelHistoryResponse history;
        try {
            history = parcels.getHistory(order.parcelId());
        } catch (HttpStatusCodeException exception) {
            HttpStatus status = exception.getStatusCode() == HttpStatus.FORBIDDEN ? HttpStatus.FORBIDDEN
                    : exception.getStatusCode() == HttpStatus.NOT_FOUND ? HttpStatus.NOT_FOUND : HttpStatus.BAD_GATEWAY;
            throw new ResponseStatusException(status, "Parcel history could not be retrieved");
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Parcel history service is unavailable");
        }
        if (history == null || !order.parcelId().toString().equals(history.parcelId())) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Parcel history response was invalid");
        }
        return MerchantOrderDetailsResponse.from(order, history);
    }
}
