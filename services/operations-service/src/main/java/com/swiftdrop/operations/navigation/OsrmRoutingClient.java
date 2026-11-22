package com.swiftdrop.operations.navigation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;

@Component
public class OsrmRoutingClient {
    private final RestClient client;
    private final String baseUrl;

    public OsrmRoutingClient(
        RestClient.Builder builder,
        @Value("${swiftdrop.routing.osrm-url:}") String baseUrl,
        @Value("${swiftdrop.routing.timeout-ms:10000}") int timeoutMs
    ) {
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));
        RestClient.Builder configured = builder.requestFactory(factory);
        this.client = this.baseUrl.isBlank() ? configured.build() : configured.baseUrl(this.baseUrl).build();
    }

    public NavigationRouteResponse route(double originLatitude, double originLongitude, double destinationLatitude, double destinationLongitude) {
        if (baseUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Road routing service is not configured");
        }
        String coordinates = originLongitude + "," + originLatitude + ";" + destinationLongitude + "," + destinationLatitude;
        try {
            NavigationRouteResponse response = client.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/route/v1/driving/" + coordinates)
                    .queryParam("overview", "full")
                    .queryParam("geometries", "geojson")
                    .queryParam("steps", "false")
                    .build())
                .retrieve()
                .body(NavigationRouteResponse.class);
            validate(response);
            return response;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (ResourceAccessException ex) {
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "Road routing service timed out", ex);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Road routing service returned an invalid response", ex);
        }
    }

    private static void validate(NavigationRouteResponse response) {
        if (response == null || !"Ok".equals(response.code()) || response.routes() == null || response.routes().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "No road route is available");
        }
        NavigationRouteResponse.Route route = response.routes().get(0);
        if (!Double.isFinite(route.distance()) || route.distance() < 0 || !Double.isFinite(route.duration()) || route.duration() < 0
            || route.geometry() == null || !"LineString".equals(route.geometry().type())
            || route.geometry().coordinates() == null || route.geometry().coordinates().size() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Road routing service returned invalid geometry");
        }
        for (List<Double> point : route.geometry().coordinates()) {
            if (point == null || point.size() < 2 || point.get(0) == null || point.get(1) == null
                || !Double.isFinite(point.get(0)) || !Double.isFinite(point.get(1))
                || point.get(0) < -180 || point.get(0) > 180 || point.get(1) < -90 || point.get(1) > 90) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Road routing service returned invalid coordinates");
            }
        }
    }
}
