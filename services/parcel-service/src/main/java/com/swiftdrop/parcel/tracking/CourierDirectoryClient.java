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
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Looks up public driver details (name, vehicle type, zone) in operations-service's internal courier
 * directory. Driver details are a nice-to-have on the assignment history, so any failure returns an
 * empty map and the history is still shown without them.
 */
@Component
class CourierDirectoryClient {

    private static final Logger log = LoggerFactory.getLogger(CourierDirectoryClient.class);
    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token";
    private static final String DIRECTORY_PATH = "/internal/v1/couriers";
    private static final Duration TIMEOUT = Duration.ofSeconds(2);

    /** Public driver details; never includes a phone number. */
    record DriverProfile(String courierId, String name, String vehicleType, String zone) {
    }

    private final RestClient restClient;
    private final String directoryUrl;
    private final String token;

    @Autowired
    CourierDirectoryClient(
            RestClient.Builder restClientBuilder,
            @Value("${swiftdrop.couriers.directory-url:}") String directoryUrl,
            @Value("${swiftdrop.pricing.quote-url:http://localhost:8083/internal/v1/pricing/quote}") String pricingQuoteUrl,
            @Value("${swiftdrop.security.internal.tokens.courier-directory:swiftdrop-internal-courier-secret-2026}") String token) {
        this(restClientBuilder.requestFactory(timeoutRequestFactory()).build(),
                resolveDirectoryUrl(directoryUrl, pricingQuoteUrl), token);
    }

    /** For tests: a prepared RestClient (for example bound to MockRestServiceServer). */
    CourierDirectoryClient(RestClient restClient, String directoryUrl, String token) {
        this.restClient = restClient;
        this.directoryUrl = directoryUrl;
        this.token = token;
    }

    /** A slow directory must not hold up the parcel page. */
    private static SimpleClientHttpRequestFactory timeoutRequestFactory() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(TIMEOUT);
        requestFactory.setReadTimeout(TIMEOUT);
        return requestFactory;
    }

    /** Same host as the pricing quote (both are operations-service) unless configured explicitly. */
    static String resolveDirectoryUrl(String configured, String pricingQuoteUrl) {
        if (configured != null && !configured.isBlank()) {
            return configured;
        }
        URI pricing = URI.create(pricingQuoteUrl);
        return UriComponentsBuilder.newInstance()
                .scheme(pricing.getScheme()).host(pricing.getHost()).port(pricing.getPort())
                .path(DIRECTORY_PATH).toUriString();
    }

    String directoryUrl() {
        return directoryUrl;
    }

    /** Profiles by courier id; couriers without a profile are missing from the map. Never throws. */
    Map<String, DriverProfile> findProfiles(Collection<String> courierIds) {
        if (courierIds.isEmpty()) {
            return Map.of();
        }
        try {
            List<DriverProfile> profiles = restClient.get()
                    .uri(directoryUrl, builder -> builder.queryParam("ids", String.join(",", courierIds)).build())
                    .header(INTERNAL_TOKEN_HEADER, token)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<DriverProfile>>() { });
            if (profiles == null) {
                return Map.of();
            }
            return profiles.stream()
                    .filter(profile -> profile.courierId() != null)
                    .collect(Collectors.toMap(DriverProfile::courierId, Function.identity(), (a, b) -> a));
        } catch (RuntimeException ex) {
            log.warn("Courier directory lookup failed, showing assignment history without driver details: {}",
                    ex.getMessage());
            return Map.of();
        }
    }
}
