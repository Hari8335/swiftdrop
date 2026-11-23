package com.swiftdrop.integration.merchant;

import java.util.UUID;

/** Display identity for the authenticated merchant. Deliberately excludes contact details and credentials. */
public record MerchantProfileResponse(
        UUID merchantId,
        String businessName,
        String contactName,
        MerchantStatus status
) {
    static MerchantProfileResponse from(Merchant merchant) {
        return new MerchantProfileResponse(
                merchant.getId(),
                merchant.getBusinessName(),
                merchant.getContactName(),
                merchant.getStatus());
    }
}
