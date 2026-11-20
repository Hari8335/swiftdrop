package com.swiftdrop.parcel.tracking;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class CourierDirectoryClientTest {

    private static final String URL = "http://operations.test:8083/internal/v1/couriers";

    private MockRestServiceServer server;
    private CourierDirectoryClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new CourierDirectoryClient(builder.build(), URL, "test-token");
    }

    @Test
    @DisplayName("Sends the internal token and maps profiles by courier id")
    void mapsProfiles() {
        server.expect(requestTo(URL + "?ids=c-1,c-2"))
                .andExpect(header("X-Internal-Service-Token", "test-token"))
                .andRespond(withSuccess("""
                        [{"courierId":"c-1","name":"Saman Perera","vehicleType":"Motorbike","zone":"Colombo"}]
                        """, MediaType.APPLICATION_JSON));

        Map<String, CourierDirectoryClient.DriverProfile> profiles = client.findProfiles(List.of("c-1", "c-2"));

        assertThat(profiles).containsOnlyKeys("c-1");
        assertThat(profiles.get("c-1").name()).isEqualTo("Saman Perera");
        assertThat(profiles.get("c-1").vehicleType()).isEqualTo("Motorbike");
        server.verify();
    }

    @Test
    @DisplayName("A failing directory returns no profiles instead of failing the page")
    void failureReturnsEmpty() {
        server.expect(requestTo(URL + "?ids=c-1")).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThat(client.findProfiles(List.of("c-1"))).isEmpty();
    }

    @Test
    @DisplayName("No courier ids -> no call")
    void noIdsNoCall() {
        assertThat(client.findProfiles(List.of())).isEmpty();
        server.verify();
    }

    @Test
    @DisplayName("Directory URL defaults to the operations-service host of the pricing quote URL")
    void derivesUrlFromPricingHost() {
        assertThat(CourierDirectoryClient.resolveDirectoryUrl("",
                "http://operations-service:8083/internal/v1/pricing/quote"))
                .isEqualTo("http://operations-service:8083/internal/v1/couriers");
        assertThat(CourierDirectoryClient.resolveDirectoryUrl("http://custom/x", "http://ignored/y"))
                .isEqualTo("http://custom/x");
    }
}
