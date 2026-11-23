package com.swiftdrop.parcel.tracking;

import com.swiftdrop.parcel.parcel.ParcelStatus;

import java.time.Instant;
import java.util.List;

/**
 * Masked public tracking view (parcel-read.yaml PublicTrackingResponse).
 * Adding a field here needs a masking review (docs/tracking-design.md section 2).
 * Never add coordinates (exact or rounded), the internal parcel id, phone numbers or full
 * addresses: exact locations and courier GPS are served only by authenticated endpoints.
 */
public record PublicTrackingResponse(
        String trackingNumber,
        ParcelStatus status,
        String recipientNameMasked,
        String dropoffDistrict,
        Instant lastUpdatedAt,
        List<PublicTimelineEntry> timeline
) {
}
