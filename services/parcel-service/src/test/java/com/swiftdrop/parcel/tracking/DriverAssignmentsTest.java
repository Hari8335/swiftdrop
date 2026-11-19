package com.swiftdrop.parcel.tracking;

import com.swiftdrop.parcel.parcel.ParcelStatus;
import com.swiftdrop.parcel.parcel.StatusHistoryView;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DriverAssignmentsTest {

    private static final Instant T0 = Instant.parse("2026-11-19T08:00:00Z");

    private static StatusHistoryView row(ParcelStatus from, ParcelStatus to, String reason, int minutes) {
        return new StatusHistoryView(from, to, reason, T0.plusSeconds(minutes * 60L));
    }

    @Test
    @DisplayName("No assignment rows -> empty history")
    void neverAssigned() {
        List<StatusHistoryView> history = List.of(
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, null, 0));

        assertThat(DriverAssignments.from(history, null)).isEmpty();
    }

    @Test
    @DisplayName("One assignment that is still in place is CURRENT with no reassignment time")
    void singleCurrent() {
        List<StatusHistoryView> history = List.of(
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, null, 0),
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, "Assigned to courier c-1", 5),
                row(ParcelStatus.CREATED, ParcelStatus.PICKED_UP, null, 30));

        assertThat(DriverAssignments.from(history, "c-1")).containsExactly(
                new DriverAssignments.Assignment("c-1", T0.plusSeconds(300), null, true));
    }

    @Test
    @DisplayName("Reassignments are listed oldest first; each earlier one ends when the next starts")
    void reassignedTwice() {
        List<StatusHistoryView> history = List.of(
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, null, 0),
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, "Assigned to courier c-1", 5),
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, "Reassigned to courier c-2 from c-1", 20),
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, "Reassigned to courier c-3 from c-2", 45));

        assertThat(DriverAssignments.from(history, "c-3")).containsExactly(
                new DriverAssignments.Assignment("c-1", T0.plusSeconds(300), T0.plusSeconds(1200), false),
                new DriverAssignments.Assignment("c-2", T0.plusSeconds(1200), T0.plusSeconds(2700), false),
                new DriverAssignments.Assignment("c-3", T0.plusSeconds(2700), null, true));
    }

    @Test
    @DisplayName("Latest assignment is not CURRENT if the parcel no longer has that courier")
    void latestNoLongerOnParcel() {
        List<StatusHistoryView> history = List.of(
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, "Assigned to courier c-1", 5));

        assertThat(DriverAssignments.from(history, null).get(0).current()).isFalse();
    }

    @Test
    @DisplayName("Status changes and cancellation reasons are not mistaken for assignments")
    void ignoresOtherRows() {
        assertThat(DriverAssignments.courierIdOf(
                row(ParcelStatus.CREATED, ParcelStatus.CANCELLED, "Assigned to courier c-9", 1))).isNull();
        assertThat(DriverAssignments.courierIdOf(
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, "Customer asked to wait", 1))).isNull();
        assertThat(DriverAssignments.courierIdOf(
                row(ParcelStatus.CREATED, ParcelStatus.CREATED, null, 1))).isNull();
    }
}
