package com.swiftdrop.integration.merchant;

import com.swiftdrop.common.security.CurrentUser;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Resolves a signed merchant identity while keeping the local sample-account bridge disabled by default. */
@Component
public class MerchantIdentityResolver {
    private final MerchantRepository merchants;
    private final boolean localDemoFallbackEnabled;
    private final String localDemoEmail;

    public MerchantIdentityResolver(
            MerchantRepository merchants,
            @Value("${swiftdrop.merchant.local-demo.enabled:false}") boolean localDemoFallbackEnabled,
            @Value("${swiftdrop.merchant.local-demo.email:merchant@swiftdrop.lk}") String localDemoEmail) {
        this.merchants = merchants;
        this.localDemoFallbackEnabled = localDemoFallbackEnabled;
        this.localDemoEmail = localDemoEmail.trim();
    }

    public UUID requireMerchantId(CurrentUser user) {
        if (user == null || !user.isMerchant() || user.userId() == null || user.userId().isBlank()) {
            throw required();
        }

        if (user.merchantId() != null && !user.merchantId().isBlank()) {
            try {
                return UUID.fromString(user.merchantId());
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Merchant credentials are invalid");
            }
        }

        if (localDemoFallbackEnabled && user.email() != null
                && localDemoEmail.equalsIgnoreCase(user.email().trim())) {
            return merchants.findByEmailIgnoreCase(localDemoEmail)
                    .filter(merchant -> merchant.getStatus().canPlaceOrders())
                    .map(Merchant::getId)
                    .orElseThrow(MerchantIdentityResolver::required);
        }

        throw required();
    }

    public UUID requireApprovedMerchantId(CurrentUser user) {
        UUID merchantId = requireMerchantId(user);
        return merchants.findById(merchantId)
                .filter(merchant -> merchant.getStatus() == MerchantStatus.APPROVED)
                .map(Merchant::getId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Merchant account is not approved for this operation"));
    }

    private static ResponseStatusException required() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "Merchant credentials are required");
    }
}
