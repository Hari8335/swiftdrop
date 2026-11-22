package com.swiftdrop.operations.courier.execution;

import com.swiftdrop.common.security.CurrentUser;
import com.swiftdrop.operations.courier.execution.client.ParcelResponse;
import com.swiftdrop.operations.courier.execution.client.ParcelServiceClient;
import com.swiftdrop.operations.courier.execution.dto.CourierLocationRequest;
import com.swiftdrop.operations.courier.execution.dto.CourierLocationResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class CourierLocationService {
    private static final Duration MAX_AGE = Duration.ofMinutes(5);
    private static final Duration MIN_INTERVAL = Duration.ofSeconds(5);
    private final CourierLocationRepository locations;
    private final ParcelServiceClient parcels;

    public CourierLocationService(CourierLocationRepository locations, ParcelServiceClient parcels) {
        this.locations = locations;
        this.parcels = parcels;
    }

    @Transactional
    public CourierLocationResponse record(UUID parcelId, String courierId, CourierLocationRequest request) {
        ParcelResponse parcel = parcel(parcelId);
        requireAssignment(parcel, courierId);
        Instant now = Instant.now();
        if (request.recordedAt().isAfter(now.plusSeconds(30)) || request.recordedAt().isBefore(now.minus(MAX_AGE))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location timestamp is outside the accepted window");
        }
        CourierLocation previous = locations.findById(parcelId).orElse(null);
        if (previous != null) {
            if (!courierId.equals(previous.getCourierId())) {
                locations.delete(previous);
                previous = null;
            } else if (!request.recordedAt().isAfter(previous.getRecordedAt())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Location is older than the latest accepted update");
            } else if (Duration.between(previous.getReceivedAt(), now).compareTo(MIN_INTERVAL) < 0) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Location updates are limited to one every five seconds");
            }
        }
        CourierLocation location = previous != null ? previous : new CourierLocation();
        location.setParcelId(parcelId);
        location.setCourierId(courierId);
        location.setLatitude(request.latitude());
        location.setLongitude(request.longitude());
        location.setAccuracyMeters(request.accuracyMeters());
        location.setRecordedAt(request.recordedAt());
        location.setReceivedAt(now);
        return response(locations.save(location));
    }

    @Transactional(readOnly = true)
    public CourierLocationResponse latest(UUID parcelId, CurrentUser viewer) {
        ParcelResponse parcel = parcel(parcelId);
        if (!allowed(parcel, viewer)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You may not view this location");
        return locations.findById(parcelId).map(this::response).orElse(null);
    }

    private ParcelResponse parcel(UUID id) {
        ParcelResponse parcel = parcels.getParcel(id);
        if (parcel == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Parcel not found");
        return parcel;
    }

    private static void requireAssignment(ParcelResponse parcel, String courierId) {
        if (isTerminal(parcel.status())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Delivery is complete");
        if (parcel.courierId() == null || !parcel.courierId().equals(courierId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Courier is not assigned to this parcel");
        }
    }

    private static boolean allowed(ParcelResponse parcel, CurrentUser viewer) {
        if (viewer == null) return false;
        return viewer.isAdmin() || viewer.isDispatcher()
            || (viewer.isCustomer() && viewer.userId().equals(parcel.customerId()))
            || (viewer.isCourier() && viewer.userId().equals(parcel.courierId()));
    }

    private static boolean isTerminal(String status) {
        return "DELIVERED".equalsIgnoreCase(status) || "FAILED".equalsIgnoreCase(status) || "CANCELLED".equalsIgnoreCase(status);
    }

    private CourierLocationResponse response(CourierLocation l) {
        return new CourierLocationResponse(l.getParcelId(), l.getLatitude(), l.getLongitude(), l.getAccuracyMeters(), l.getRecordedAt(), l.getReceivedAt());
    }
}
