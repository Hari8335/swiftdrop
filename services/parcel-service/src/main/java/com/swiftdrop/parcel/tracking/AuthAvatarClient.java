package com.swiftdrop.parcel.tracking;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.Collection;
import java.util.Map;

/**
 * Looks up courier profile pictures in auth-service's internal avatar directory so the driver assignment
 * history can show them without exposing courier ids to the browser. Pictures are optional, so any failure
 * returns an empty map and the history falls back to initials.
 */
@Component
class AuthAvatarClient {

    private static final Logger log = LoggerFactory.getLogger(AuthAvatarClient.class);
    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token";
    private static final String AVATARS_PATH = "/internal/v1/users/avatars";
    private static final Duration TIMEOUT = Duration.ofSeconds(2);

    private final RestClient restClient;
    private final String avatarsUrl;
    private final String token;

    @Autowired
    AuthAvatarClient(
            RestClient.Builder restClientBuilder,
            @Value("${swiftdrop.auth.avatars-url:}") String avatarsUrl,
            @Value("${JWKS_URL:http://localhost:8081/.well-known/jwks.json}") String jwksUrl,
            @Value("${swiftdrop.security.internal.tokens.auth-avatars:swiftdrop-internal-parcel-secret-2026}") String token) {
        this(restClientBuilder.requestFactory(timeoutRequestFactory()).build(), resolveAvatarsUrl(avatarsUrl, jwksUrl), token);
    }

    /** For tests: a prepared RestClient (for example bound to MockRestServiceServer). */
    AuthAvatarClient(RestClient restClient, String avatarsUrl, String token) {
        this.restClient = restClient;
        this.avatarsUrl = avatarsUrl;
        this.token = token;
    }

    private static SimpleClientHttpRequestFactory timeoutRequestFactory() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(TIMEOUT);
        requestFactory.setReadTimeout(TIMEOUT);
        return requestFactory;
    }

    /** Same host as the JWKS endpoint (both are auth-service) unless configured explicitly. */
    static String resolveAvatarsUrl(String configured, String jwksUrl) {
        if (configured != null && !configured.isBlank()) {
            return configured;
        }
        URI jwks = URI.create(jwksUrl);
        return UriComponentsBuilder.newInstance()
                .scheme(jwks.getScheme()).host(jwks.getHost()).port(jwks.getPort())
                .path(AVATARS_PATH).toUriString();
    }

    String avatarsUrl() {
        return avatarsUrl;
    }

    /** Picture data URLs by user id; users without a picture are missing. Never throws. */
    Map<String, String> findAvatars(Collection<String> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        try {
            Map<String, String> avatars = restClient.get()
                    .uri(avatarsUrl, builder -> builder.queryParam("ids", String.join(",", userIds)).build())
                    .header(INTERNAL_TOKEN_HEADER, token)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, String>>() { });
            return avatars == null ? Map.of() : avatars;
        } catch (RuntimeException ex) {
            log.warn("Avatar lookup failed, showing driver initials instead: {}", ex.getMessage());
            return Map.of();
        }
    }
}
