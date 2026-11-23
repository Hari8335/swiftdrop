package com.swiftdrop.parcel.tracking;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * GET /api/v1/parcels/{id}/assignments (contracts/openapi/parcel-read.yaml). Oldest assignment first.
 * Courier ids and phone numbers are deliberately not part of the response.
 */
record DriverAssignmentHistoryResponse(String parcelId, List<Entry> assignments) {

    enum Status { CURRENT, PREVIOUS }

    /** {@code driver} and {@code reassignedAt} are always present, as values or null. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    record Entry(Driver driver, Instant assignedAt, Status status, Instant reassignedAt) {
    }

    /** {@code photoUrl} is the courier's profile picture (image data URL), or null to show initials. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    record Driver(String name, String vehicleType, String zone, String photoUrl) {
    }
}
