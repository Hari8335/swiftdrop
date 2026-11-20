package com.swiftdrop.operations.courier.execution.client;

import com.swiftdrop.common.CorrelationIdFilter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.net.SocketTimeoutException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class RestParcelServiceClientTest {

    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private RestParcelServiceClient client;

    private static final String BASE_URL = "http://localhost:8082";
    private static final UUID PARCEL_ID = UUID.fromString("7e9b3a24-c189-4b68-b7c1-fa9e6a0d2f11");
    private static final String COURIER_ID = "courier-42";

    @BeforeEach
    void setUp() {
        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        client = new RestParcelServiceClient(restClientBuilder, BASE_URL);
        MDC.put(CorrelationIdFilter.CORRELATION_ID_MDC_KEY, "test-corr-id-1234");
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    @DisplayName("getParcelsByCourierAndDate sends request with X-Correlation-Id header")
    void getParcels_propagatesCorrelationId() {
        mockServer.expect(requestTo(BASE_URL + "/internal/v1/parcels?courierId=" + COURIER_ID + "&size=100&date=2026-10-28"))
            .andExpect(method(HttpMethod.GET))
            .andExpect(header(CorrelationIdFilter.CORRELATION_ID_HEADER, "test-corr-id-1234"))
            .andRespond(withSuccess("{\"content\":[],\"totalElements\":0,\"totalPages\":0,\"size\":100,\"number\":0}", MediaType.APPLICATION_JSON));

        ParcelPageResponse resp = client.getParcelsByCourierAndDate(COURIER_ID, "2026-10-28");
        assertThat(resp).isNotNull();
        assertThat(resp.totalElements()).isEqualTo(0);
        mockServer.verify();
    }

    private static String page(String trackingNumber, int pageIndex, int totalPages) {
        return "{\"content\":[{\"id\":\"" + UUID.randomUUID() + "\",\"trackingNumber\":\"" + trackingNumber
            + "\",\"status\":\"CREATED\",\"courierId\":\"" + COURIER_ID + "\"}],"
            + "\"totalElements\":" + totalPages + ",\"totalPages\":" + totalPages + ",\"page\":" + pageIndex + ",\"size\":100}";
    }

    @Test
    @DisplayName("getActiveParcelsForCourier follows every page instead of stopping at the first 100")
    void getActiveParcels_followsAllPages() {
        mockServer.expect(requestTo(org.hamcrest.Matchers.startsWith(BASE_URL + "/internal/v1/parcels")))
            .andExpect(queryParam("courierId", COURIER_ID))
            .andExpect(queryParam("active", "true"))
            .andExpect(queryParam("sort", "assignedAt,asc"))
            .andExpect(queryParam("page", "0"))
            .andRespond(withSuccess(page("SD-P0", 0, 2), MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(org.hamcrest.Matchers.startsWith(BASE_URL + "/internal/v1/parcels")))
            .andExpect(queryParam("page", "1"))
            .andRespond(withSuccess(page("SD-P1", 1, 2), MediaType.APPLICATION_JSON));

        var parcels = client.getActiveParcelsForCourier(COURIER_ID);

        assertThat(parcels).extracting(ParcelResponse::trackingNumber).containsExactly("SD-P0", "SD-P1");
        mockServer.verify();
    }

    @Test
    @DisplayName("getParcelsCompletedByCourierOn queries parcels finished on the given day")
    void getCompletedParcels_queriesCompletedOn() {
        mockServer.expect(requestTo(org.hamcrest.Matchers.startsWith(BASE_URL + "/internal/v1/parcels")))
            .andExpect(queryParam("courierId", COURIER_ID))
            .andExpect(queryParam("completedOn", "2026-11-18"))
            .andExpect(queryParam("page", "0"))
            .andRespond(withSuccess(page("SD-DONE", 0, 1), MediaType.APPLICATION_JSON));

        var parcels = client.getParcelsCompletedByCourierOn(COURIER_ID, "2026-11-18");

        assertThat(parcels).hasSize(1);
        mockServer.verify();
    }

    @Test
    @DisplayName("getParcel handles 404 by trying public endpoint fallback")
    void getParcel_fallsBackToPublicEndpointOn404() {
        mockServer.expect(requestTo(BASE_URL + "/internal/v1/parcels/" + PARCEL_ID))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withStatus(HttpStatus.NOT_FOUND));

        mockServer.expect(requestTo(BASE_URL + "/api/v1/parcels/" + PARCEL_ID))
            .andExpect(method(HttpMethod.GET))
            .andExpect(header(CorrelationIdFilter.CORRELATION_ID_HEADER, "test-corr-id-1234"))
            .andRespond(withSuccess("{\"id\":\"" + PARCEL_ID + "\",\"trackingNumber\":\"SD-001\",\"status\":\"CREATED\"}", MediaType.APPLICATION_JSON));

        ParcelResponse resp = client.getParcel(PARCEL_ID);
        assertThat(resp).isNotNull();
        assertThat(resp.id()).isEqualTo(PARCEL_ID);
        mockServer.verify();
    }

    @Test
    @DisplayName("updateStatus sends PATCH request with X-Correlation-Id header and payload")
    void updateStatus_propagatesCorrelationIdAndPayload() {
        ParcelStatusUpdateRequest request = new ParcelStatusUpdateRequest(
            "PICKED_UP", "CREATED", COURIER_ID, null, null, "idem-1"
        );

        mockServer.expect(requestTo(BASE_URL + "/internal/v1/parcels/" + PARCEL_ID + "/status"))
            .andExpect(method(HttpMethod.PATCH))
            .andExpect(header(CorrelationIdFilter.CORRELATION_ID_HEADER, "test-corr-id-1234"))
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andRespond(withSuccess("{\"id\":\"" + PARCEL_ID + "\",\"trackingNumber\":\"SD-001\",\"status\":\"PICKED_UP\"}", MediaType.APPLICATION_JSON));

        ParcelResponse resp = client.updateStatus(PARCEL_ID, request);
        assertThat(resp).isNotNull();
        assertThat(resp.status()).isEqualTo("PICKED_UP");
        mockServer.verify();
    }

    @Test
    @DisplayName("updateStatus wraps network timeout / connection error as 503 SERVICE_UNAVAILABLE")
    void updateStatus_networkFailure_returnsServiceUnavailable() {
        ParcelStatusUpdateRequest request = new ParcelStatusUpdateRequest(
            "PICKED_UP", "CREATED", COURIER_ID, null, null, "idem-1"
        );

        mockServer.expect(requestTo(BASE_URL + "/internal/v1/parcels/" + PARCEL_ID + "/status"))
            .andExpect(method(HttpMethod.PATCH))
            .andRespond(withException(new java.io.IOException("Connection refused")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
            client.updateStatus(PARCEL_ID, request)
        );

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(ex.getReason()).contains("unreachable");
        mockServer.verify();
    }
}
