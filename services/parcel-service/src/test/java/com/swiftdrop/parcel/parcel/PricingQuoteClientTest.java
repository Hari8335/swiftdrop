package com.swiftdrop.parcel.parcel;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

/** The pricing service's error reason must reach the customer instead of a generic 404 text. */
class PricingQuoteClientTest {

    private static final String QUOTE_URL = "http://pricing.test/internal/v1/pricing/quote";

    private MockRestServiceServer server;
    private PricingQuoteClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new PricingQuoteClient(builder, QUOTE_URL, "test-token");
    }

    private PricingQuoteRejectedException quoteFailingWith(HttpStatus status, String body, String pickup, String dropoff) {
        server.expect(requestTo(org.hamcrest.Matchers.startsWith(QUOTE_URL)))
                .andRespond(withStatus(status).contentType(MediaType.APPLICATION_JSON).body(body));
        return catchThrowableOfType(PricingQuoteRejectedException.class,
                () -> client.fetchQuoteDetails(pickup, dropoff, new BigDecimal("2.5"), ParcelSize.MEDIUM));
    }

    private static String error(String code, String message) {
        return "{\"code\":\"" + code + "\",\"message\":\"" + message + "\",\"correlationId\":\"c\",\"timestamp\":\"2026-11-16T00:00:00Z\"}";
    }

    @Test
    @DisplayName("Unserved drop-off district -> 422 telling the customer SwiftDrop doesn't deliver there")
    void unservedDropoff() {
        PricingQuoteRejectedException ex = quoteFailingWith(HttpStatus.NOT_FOUND,
                error("UNKNOWN_DISTRICT", "Unknown district: Mullaitivu"), "Colombo", "Mullaitivu");

        assertThat(ex.status()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(ex.code()).isEqualTo("DROPOFF_DISTRICT_NOT_SERVED");
        assertThat(ex.getMessage())
                .isEqualTo("SwiftDrop doesn't deliver to Mullaitivu yet. Please choose a different drop-off district.");
    }

    @Test
    @DisplayName("Pickup district with no zone -> 422 about the pickup district")
    void unknownPickup() {
        PricingQuoteRejectedException ex = quoteFailingWith(HttpStatus.NOT_FOUND,
                error("UNKNOWN_DISTRICT", "Unknown district: Mannar"), "Mannar", "Colombo");

        assertThat(ex.status()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(ex.code()).isEqualTo("PICKUP_DISTRICT_NOT_SERVED");
        assertThat(ex.getMessage()).contains("collect parcels from Mannar");
    }

    @Test
    @DisplayName("Pickup zone switched off -> 422 about the pickup district")
    void unservedPickup() {
        PricingQuoteRejectedException ex = quoteFailingWith(HttpStatus.UNPROCESSABLE_ENTITY,
                error("PICKUP_DISTRICT_UNSERVED", "Pickup district is not an active served area: Jaffna"),
                "Jaffna", "Colombo");

        assertThat(ex.status()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(ex.code()).isEqualTo("PICKUP_DISTRICT_NOT_SERVED");
        assertThat(ex.getMessage()).contains("Jaffna");
    }

    @Test
    @DisplayName("Missing pricing rules -> 503 'pricing isn't set up'")
    void pricingNotConfigured() {
        PricingQuoteRejectedException ex = quoteFailingWith(HttpStatus.NOT_FOUND,
                error("PRICING_RULE_NOT_FOUND", "Required active pricing rules are not configured"),
                "Colombo", "Kandy");

        assertThat(ex.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(ex.code()).isEqualTo("PRICING_NOT_CONFIGURED");
    }

    @Test
    @DisplayName("Unexpected or unreadable error body -> 502 generic retry message")
    void unreadableError() {
        PricingQuoteRejectedException ex = quoteFailingWith(HttpStatus.INTERNAL_SERVER_ERROR,
                "<html>oops</html>", "Colombo", "Kandy");

        assertThat(ex.status()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(ex.code()).isEqualTo("PRICING_UNAVAILABLE");
        assertThat(ex.getMessage()).doesNotContain("Parcel not found");
    }
}
