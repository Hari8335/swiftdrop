package com.swiftdrop.integration.merchant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MerchantStatusTest {

    @Test
    void pendingCanBeApprovedOrRejected() {
        assertTrue(MerchantStatus.PENDING.canTransitionTo(MerchantStatus.APPROVED));
        assertTrue(MerchantStatus.PENDING.canTransitionTo(MerchantStatus.REJECTED));
    }

    @Test
    void approvedCanBeSuspendedButCannotBeReapproved() {
        assertTrue(MerchantStatus.APPROVED.canTransitionTo(MerchantStatus.SUSPENDED));
        assertFalse(MerchantStatus.APPROVED.canTransitionTo(MerchantStatus.PENDING));
        assertFalse(MerchantStatus.APPROVED.canTransitionTo(MerchantStatus.REJECTED));
    }

    @Test
    void rejectedIsTerminalAndSuspendedCanBeReactivated() {
        for (MerchantStatus target : MerchantStatus.values()) {
            assertFalse(MerchantStatus.REJECTED.canTransitionTo(target), "REJECTED -> " + target);
        }
        assertTrue(MerchantStatus.SUSPENDED.canTransitionTo(MerchantStatus.APPROVED));
        assertFalse(MerchantStatus.SUSPENDED.canTransitionTo(MerchantStatus.PENDING));
        assertFalse(MerchantStatus.SUSPENDED.canTransitionTo(MerchantStatus.REJECTED));
    }

    @Test
    void sameStateAndNullAreNotTransitions() {
        for (MerchantStatus status : MerchantStatus.values()) {
            assertFalse(status.canTransitionTo(status));
            assertFalse(status.canTransitionTo(null));
        }
    }

    @Test
    void onlyApprovedMerchantsCanPlaceOrders() {
        assertTrue(MerchantStatus.APPROVED.canPlaceOrders());
        assertFalse(MerchantStatus.PENDING.canPlaceOrders());
        assertFalse(MerchantStatus.REJECTED.canPlaceOrders());
        assertFalse(MerchantStatus.SUSPENDED.canPlaceOrders());
    }
}
