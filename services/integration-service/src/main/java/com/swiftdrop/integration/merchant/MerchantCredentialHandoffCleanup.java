package com.swiftdrop.integration.merchant;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MerchantCredentialHandoffCleanup {
    private final MerchantPortalNotificationService notifications;

    public MerchantCredentialHandoffCleanup(MerchantPortalNotificationService notifications) {
        this.notifications = notifications;
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    public void deleteExpiredCredentialHandoffs() {
        notifications.purgeExpired();
    }
}
