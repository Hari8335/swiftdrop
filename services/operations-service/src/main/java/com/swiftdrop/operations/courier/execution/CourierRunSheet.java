package com.swiftdrop.operations.courier.execution;

import com.swiftdrop.operations.courier.execution.client.ParcelResponse;
import com.swiftdrop.operations.courier.execution.client.ParcelServiceClient;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Rules for which parcels appear on a courier's run sheet.
 *
 * <ul>
 *   <li>To deliver: every parcel currently assigned to the courier that is not finished,
 *       regardless of when it was created, oldest assignment first. Shown for today and later.</li>
 *   <li>Done: parcels the courier finished (DELIVERED, FAILED, CANCELLED) on the selected day.</li>
 *   <li>Days are Sri Lanka days (Asia/Colombo).</li>
 * </ul>
 */
public final class CourierRunSheet {

    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Colombo");

    /** An open parcel assigned longer than this is flagged as overdue. */
    public static final Duration OVERDUE_AFTER = Duration.ofDays(2);

    private static final Set<String> COMPLETED_STATUSES = Set.of("DELIVERED", "FAILED", "CANCELLED");

    private CourierRunSheet() {
    }

    public static boolean isCompleted(String status) {
        return status != null && COMPLETED_STATUSES.contains(status.toUpperCase(Locale.ROOT));
    }

    /**
     * Loads the run sheet: open parcels first (only when {@code date} is today or later),
     * then parcels completed on {@code date}. Parcels now assigned to another courier are
     * dropped, so a reassigned parcel disappears from the previous courier's list.
     */
    public static List<ParcelResponse> load(ParcelServiceClient client, String courierId, LocalDate date, LocalDate today) {
        Map<Object, ParcelResponse> byId = new LinkedHashMap<>();
        if (!date.isBefore(today)) {
            addOwned(byId, client.getActiveParcelsForCourier(courierId), courierId);
        }
        addOwned(byId, client.getParcelsCompletedByCourierOn(courierId, date.toString()), courierId);
        return new ArrayList<>(byId.values());
    }

    public static boolean isOverdue(ParcelResponse parcel, Instant now) {
        return !isCompleted(parcel.status())
            && parcel.assignedAt() != null
            && parcel.assignedAt().plus(OVERDUE_AFTER).isBefore(now);
    }

    /** When the parcel was finished; falls back to updatedAt for records created before completedAt existed. */
    public static Instant completedAt(ParcelResponse parcel) {
        if (!isCompleted(parcel.status())) {
            return null;
        }
        return parcel.completedAt() != null ? parcel.completedAt() : parcel.updatedAt();
    }

    private static void addOwned(Map<Object, ParcelResponse> byId, List<ParcelResponse> parcels, String courierId) {
        if (parcels == null) {
            return;
        }
        for (ParcelResponse parcel : parcels) {
            if (parcel != null && courierId.equals(parcel.courierId())) {
                byId.putIfAbsent(parcel.id() != null ? parcel.id() : parcel.trackingNumber(), parcel);
            }
        }
    }
}
