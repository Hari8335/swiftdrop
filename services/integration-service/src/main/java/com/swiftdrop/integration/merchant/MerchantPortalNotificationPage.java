package com.swiftdrop.integration.merchant;

import java.util.List;

public record MerchantPortalNotificationPage(
        List<MerchantPortalNotificationDto> items,
        long totalElements,
        long unreadCount) {}
