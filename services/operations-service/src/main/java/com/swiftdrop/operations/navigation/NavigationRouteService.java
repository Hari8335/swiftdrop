package com.swiftdrop.operations.navigation;

import com.swiftdrop.common.security.CurrentUser;
import com.swiftdrop.operations.courier.execution.client.AddressDto;
import com.swiftdrop.operations.courier.execution.client.ParcelResponse;
import com.swiftdrop.operations.courier.execution.client.ParcelServiceClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NavigationRouteService {
    private final ParcelServiceClient parcels;
    private final OsrmRoutingClient osrm;
    private final Duration minimumInterval;
    private final ConcurrentHashMap<String, Instant> lastRequests = new ConcurrentHashMap<>();

    public NavigationRouteService(
        ParcelServiceClient parcels,
        OsrmRoutingClient osrm,
        @Value("${swiftdrop.routing.minimum-interval-ms:15000}") long minimumIntervalMs
    ) {
        this.parcels = parcels;
        this.osrm = osrm;
        this.minimumInterval = Duration.ofMillis(minimumIntervalMs);
    }

    public NavigationRouteResponse route(UUID parcelId, String origin, Instant recordedAt, CurrentUser viewer) {
        if (viewer == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        ParcelResponse parcel = parcels.getParcel(parcelId);
        if (parcel == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Parcel not found");
        authorize(parcel, viewer);
        if (isTerminal(parcel.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Navigation is unavailable for a completed delivery");
        }
        Instant now = Instant.now();
        if (recordedAt == null || recordedAt.isBefore(now.minus(Duration.ofMinutes(5))) || recordedAt.isAfter(now.plusSeconds(30))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "GPS timestamp is outside the accepted window");
        }
        double[] point = parsePoint(origin);
        AddressDto nextStop = nextStop(parcel);
        if (nextStop == null || nextStop.latitude() == null || nextStop.longitude() == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Verified next-stop coordinates are required");
        }
        String key = viewer.userId() + ":" + parcelId;
        Instant previous = lastRequests.putIfAbsent(key, now);
        if (previous != null && Duration.between(previous, now).compareTo(minimumInterval) < 0) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Route requests are temporarily rate limited");
        }
        if (previous != null) lastRequests.put(key, now);
        return osrm.route(point[1], point[0], nextStop.latitude(), nextStop.longitude());
    }

    private static double[] parsePoint(String raw) {
        if (raw == null || raw.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Origin coordinates are required");
        String[] parts = raw.split(",", -1);
        if (parts.length != 2) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Origin must be longitude,latitude");
        try {
            double longitude = Double.parseDouble(parts[0]);
            double latitude = Double.parseDouble(parts[1]);
            if (!Double.isFinite(longitude) || !Double.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) throw new NumberFormatException();
            return new double[] { longitude, latitude };
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Origin coordinates are invalid");
        }
    }

    private static AddressDto nextStop(ParcelResponse parcel) {
        return "CREATED".equalsIgnoreCase(parcel.status()) || "ASSIGNED".equalsIgnoreCase(parcel.status())
            ? parcel.pickupAddress() : parcel.dropoffAddress();
    }

    private static boolean isTerminal(String status) {
        return "DELIVERED".equalsIgnoreCase(status)
            || "FAILED".equalsIgnoreCase(status)
            || "CANCELLED".equalsIgnoreCase(status);
    }

    private static void authorize(ParcelResponse parcel, CurrentUser viewer) {
        boolean allowed = viewer.isAdmin() || viewer.isDispatcher()
            || viewer.isCustomer() && viewer.userId().equals(parcel.customerId())
            || viewer.isCourier() && viewer.userId().equals(parcel.courierId());
        if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You may not route this parcel");
    }
}
