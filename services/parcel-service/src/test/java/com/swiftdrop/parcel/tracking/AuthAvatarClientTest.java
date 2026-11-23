package com.swiftdrop.parcel.tracking;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AuthAvatarClientTest {

    private static final String URL = "http://auth.test:8081/internal/v1/users/avatars";

    private MockRestServiceServer server;
    private AuthAvatarClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new AuthAvatarClient(builder.build(), URL, "test-token");
    }

    @Test
    @DisplayName("Sends the internal token and returns pictures by user id")
    void returnsAvatars() {
        server.expect(requestTo(URL + "?ids=c-1,c-2"))
                .andExpect(header("X-Internal-Service-Token", "test-token"))
                .andRespond(withSuccess("{\"c-1\":\"data:image/png;base64,AAAA\"}", MediaType.APPLICATION_JSON));

        assertThat(client.findAvatars(List.of("c-1", "c-2")))
                .containsOnlyKeys("c-1")
                .containsEntry("c-1", "data:image/png;base64,AAAA");
        server.verify();
    }

    @Test
    @DisplayName("A failing auth-service returns no pictures instead of failing the page")
    void failureReturnsEmpty() {
        server.expect(requestTo(URL + "?ids=c-1")).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThat(client.findAvatars(List.of("c-1"))).isEmpty();
    }

    @Test
    @DisplayName("No ids -> no call")
    void noIdsNoCall() {
        assertThat(client.findAvatars(List.of())).isEmpty();
        server.verify();
    }

    @Test
    @DisplayName("URL defaults to the auth-service host of the JWKS URL")
    void derivesUrlFromJwksHost() {
        assertThat(AuthAvatarClient.resolveAvatarsUrl("", "http://auth-service:8081/.well-known/jwks.json"))
                .isEqualTo("http://auth-service:8081/internal/v1/users/avatars");
        assertThat(AuthAvatarClient.resolveAvatarsUrl("http://custom/x", "http://ignored/y"))
                .isEqualTo("http://custom/x");
    }
}
