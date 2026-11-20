package com.swiftdrop.parcel.tracking;

import com.swiftdrop.parcel.parcel.StatusHistoryView;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Driver assignment history of a parcel, rebuilt from M1's {@code status_history}.
 *
 * <p>{@code ParcelService.assignCourier} writes one CREATED -> CREATED row per assignment, with the
 * reason "Assigned to courier {id}" or "Reassigned to courier {id} from {previous}". Those rows,
 * oldest first, are the assignments; each one ends when the next one starts.
 */
final class DriverAssignments {

    /** Same reason prefixes as the V7 migration's assigned_at backfill. */
    private static final Pattern ASSIGNMENT_REASON =
            Pattern.compile("^(?:Assigned|Reassigned) to courier (\\S+)");

    private DriverAssignments() {
    }

    /** One assignment: who, when it started, and when the next courier replaced them (null if not replaced). */
    record Assignment(String courierId, Instant assignedAt, Instant reassignedAt, boolean current) {
    }

    /**
     * @param history          status history, oldest first
     * @param currentCourierId the parcel's courier now; the latest assignment is current only if it matches
     */
    static List<Assignment> from(List<StatusHistoryView> history, String currentCourierId) {
        List<String> courierIds = new ArrayList<>();
        List<Instant> assignedAt = new ArrayList<>();
        for (StatusHistoryView row : history) {
            String courierId = courierIdOf(row);
            if (courierId != null) {
                courierIds.add(courierId);
                assignedAt.add(row.occurredAt());
            }
        }
        List<Assignment> assignments = new ArrayList<>(courierIds.size());
        for (int i = 0; i < courierIds.size(); i++) {
            boolean last = i == courierIds.size() - 1;
            Instant replacedAt = last ? null : assignedAt.get(i + 1);
            boolean current = last && courierIds.get(i).equals(currentCourierId);
            assignments.add(new Assignment(courierIds.get(i), assignedAt.get(i), replacedAt, current));
        }
        return assignments;
    }

    /** The courier id of an assignment row, or null if the row is not an assignment. */
    static String courierIdOf(StatusHistoryView row) {
        if (row.fromStatus() != row.toStatus() || row.reason() == null) {
            return null;
        }
        Matcher matcher = ASSIGNMENT_REASON.matcher(row.reason());
        return matcher.find() ? matcher.group(1) : null;
    }
}
