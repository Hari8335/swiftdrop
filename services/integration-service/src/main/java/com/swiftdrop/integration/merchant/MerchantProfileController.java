package com.swiftdrop.integration.merchant;

import com.swiftdrop.common.security.CurrentUser;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Read-only business identity for the signed-in merchant (merchant portal header). */
@RestController
public class MerchantProfileController {
    private final MerchantRepository merchants;
    private final MerchantIdentityResolver identityResolver;

    public MerchantProfileController(MerchantRepository merchants, MerchantIdentityResolver identityResolver) {
        this.merchants = merchants;
        this.identityResolver = identityResolver;
    }

    @GetMapping("/api/v1/merchant/profile")
    public ResponseEntity<MerchantProfileResponse> profile() {
        // Identity comes only from the validated token's merchantId claim: tenant-isolated by construction.
        UUID merchantId = identityResolver.requireMerchantId(CurrentUser.require());
        Merchant merchant = merchants.findById(merchantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Merchant not found"));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(MerchantProfileResponse.from(merchant));
    }
}
