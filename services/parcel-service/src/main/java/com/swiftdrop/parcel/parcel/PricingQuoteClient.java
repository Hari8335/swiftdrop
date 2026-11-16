package com.swiftdrop.parcel.parcel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class PricingQuoteClient {

    private static final Logger log = LoggerFactory.getLogger(PricingQuoteClient.class);
    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token";
    private static final ObjectMapper JSON = new ObjectMapper();

    private final RestClient restClient;
    private final String quoteUrl;
    private final String internalPricingToken;

    public PricingQuoteClient(
            RestClient.Builder restClientBuilder,
            @Value("${swiftdrop.pricing.quote-url:http://localhost:8083/internal/v1/pricing/quote}") String quoteUrl,
            @Value("${swiftdrop.security.internal.tokens.pricing-service:swiftdrop-internal-pricing-secret-2026}") String internalPricingToken
    ) {
        this.restClient = restClientBuilder.build();
        this.quoteUrl = quoteUrl;
        this.internalPricingToken = internalPricingToken;
    }

    public PricingQuoteResponse fetchQuoteDetails(String pickupDistrict, String dropoffDistrict, BigDecimal weightKg, ParcelSize size) {
        try {
            PricingQuoteResponse response = restClient.get()
                    .uri(quoteUrl, uriBuilder -> uriBuilder
                            .queryParam("pickupDistrict", pickupDistrict)
                            .queryParam("dropoffDistrict", dropoffDistrict)
                            .queryParam("weightKg", weightKg.toPlainString())
                            .queryParam("size", size.name())
                            .build())
                    .header(INTERNAL_TOKEN_HEADER, internalPricingToken)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        log.warn("Pricing quote endpoint returned status {}", res.getStatusCode());
                        throw rejection(res, pickupDistrict, dropoffDistrict);
                    })
                    .body(PricingQuoteResponse.class);

            if (response != null && response.totalFee() != null) {
                return response;
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Received empty fee from pricing quote service");
        } catch (ResponseStatusException | PricingQuoteRejectedException rejected) {
            throw rejected;
        } catch (Exception ex) {
            log.error("Failed to fetch quote from pricing service at {}: {}", quoteUrl, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Pricing service unavailable: " + ex.getMessage(), ex);
        }
    }

    /**
     * Turns the pricing service's error (its ErrorResponse code) into a reason the customer can act on.
     * Without this the 404 for an unserved district surfaced as "Parcel not found".
     */
    static PricingQuoteRejectedException rejection(ClientHttpResponse res, String pickupDistrict, String dropoffDistrict)
            throws IOException {
        String code = null;
        String detail = null;
        try {
            JsonNode body = JSON.readTree(res.getBody());
            if (body != null) {
                code = body.path("code").asText(null);
                detail = body.path("message").asText(null);
            }
        } catch (IOException | RuntimeException unreadable) {
            log.debug("Pricing error body could not be read: {}", unreadable.getMessage());
        }
        log.warn("Pricing quote rejected: status={} code={} detail={}", res.getStatusCode(), code, detail);
        return translate(code, detail, pickupDistrict, dropoffDistrict);
    }

    static PricingQuoteRejectedException translate(String code, String detail, String pickupDistrict, String dropoffDistrict) {
        if ("PICKUP_DISTRICT_UNSERVED".equals(code)
                || ("UNKNOWN_DISTRICT".equals(code) && mentions(detail, pickupDistrict))) {
            return new PricingQuoteRejectedException(HttpStatus.UNPROCESSABLE_ENTITY, "PICKUP_DISTRICT_NOT_SERVED",
                    "We can't collect parcels from " + pickupDistrict
                            + " yet. Please choose a different pickup district.");
        }
        if ("UNKNOWN_DISTRICT".equals(code)) {
            return new PricingQuoteRejectedException(HttpStatus.UNPROCESSABLE_ENTITY, "DROPOFF_DISTRICT_NOT_SERVED",
                    "SwiftDrop doesn't deliver to " + dropoffDistrict
                            + " yet. Please choose a different drop-off district.");
        }
        if ("PRICING_RULE_NOT_FOUND".equals(code)) {
            return new PricingQuoteRejectedException(HttpStatus.SERVICE_UNAVAILABLE, "PRICING_NOT_CONFIGURED",
                    "Delivery pricing isn't set up right now. Please try again later.");
        }
        return new PricingQuoteRejectedException(HttpStatus.BAD_GATEWAY, "PRICING_UNAVAILABLE",
                "We couldn't calculate the delivery fee right now. Please try again.");
    }

    private static boolean mentions(String detail, String district) {
        return detail != null && district != null && detail.endsWith(": " + district);
    }

    public BigDecimal fetchQuote(String pickupDistrict, String dropoffDistrict, BigDecimal weightKg, ParcelSize size) {
        PricingQuoteResponse details = fetchQuoteDetails(pickupDistrict, dropoffDistrict, weightKg, size);
        return details.totalFee().setScale(2, RoundingMode.HALF_UP);
    }
}
