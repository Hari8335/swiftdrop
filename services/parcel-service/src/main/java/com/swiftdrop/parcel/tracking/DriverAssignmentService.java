package com.swiftdrop.parcel.tracking;

import com.swiftdrop.common.security.CurrentUser;
import com.swiftdrop.parcel.parcel.ParcelQueryService;
import com.swiftdrop.parcel.parcel.ParcelResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/** Driver assignment history for the parcel detail page. Reads parcels only through ParcelQueryService. */
@Service
class DriverAssignmentService {

    private final ParcelQueryService parcelQueryService;
    private final CourierDirectoryClient courierDirectory;
    private final AuthAvatarClient avatars;

    DriverAssignmentService(ParcelQueryService parcelQueryService, CourierDirectoryClient courierDirectory,
                            AuthAvatarClient avatars) {
        this.parcelQueryService = parcelQueryService;
        this.courierDirectory = courierDirectory;
        this.avatars = avatars;
    }

    /** 404 and 403 come from ParcelQueryService (owner customer, assigned courier, DISPATCHER, ADMIN). */
    DriverAssignmentHistoryResponse history(String parcelId, CurrentUser caller) {
        if (caller != null && caller.isMerchant()) {
            throw new AccessDeniedException("Merchants may view status history but not courier assignment history");
        }
        ParcelResponse parcel = parcelQueryService.getAccessibleParcel(parcelId, caller);
        List<DriverAssignments.Assignment> assignments =
                DriverAssignments.from(parcelQueryService.findStatusHistory(parcel.id()), parcel.courierId());

        Map<String, CourierDirectoryClient.DriverProfile> profiles = courierDirectory.findProfiles(
                new LinkedHashSet<>(assignments.stream().map(DriverAssignments.Assignment::courierId).toList()));

        // Only couriers with a directory profile are shown by name, so only they need a picture.
        Map<String, String> photos = profiles.isEmpty() ? Map.of() : avatars.findAvatars(profiles.keySet());

        List<DriverAssignmentHistoryResponse.Entry> entries = assignments.stream()
                .map(a -> new DriverAssignmentHistoryResponse.Entry(
                        driver(profiles.get(a.courierId()), photos.get(a.courierId())),
                        a.assignedAt(),
                        a.current() ? DriverAssignmentHistoryResponse.Status.CURRENT
                                : DriverAssignmentHistoryResponse.Status.PREVIOUS,
                        a.reassignedAt()))
                .toList();
        return new DriverAssignmentHistoryResponse(parcel.id(), entries);
    }

    private static DriverAssignmentHistoryResponse.Driver driver(CourierDirectoryClient.DriverProfile profile, String photoUrl) {
        if (profile == null || profile.name() == null || profile.name().isBlank()) {
            return null;
        }
        return new DriverAssignmentHistoryResponse.Driver(profile.name(), profile.vehicleType(), profile.zone(), photoUrl);
    }
}
