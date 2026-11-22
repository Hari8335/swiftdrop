package com.swiftdrop.integration.merchant;

import com.swiftdrop.common.security.CurrentUser;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class MerchantPortalNotificationController {
    private final MerchantPortalNotificationService notificationService;
    private final MerchantIdentityResolver identityResolver;

    public MerchantPortalNotificationController(MerchantPortalNotificationService notificationService,
            MerchantIdentityResolver identityResolver) {
        this.notificationService = notificationService;
        this.identityResolver = identityResolver;
    }

    @GetMapping("/api/v1/merchant/notifications")
    public MerchantPortalNotificationPage list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return notificationService.list(requirePortalMerchantId(), page, size);
    }

    @PostMapping("/api/v1/merchant/notifications/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id) {
        notificationService.markRead(requirePortalMerchantId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/merchant/notifications/{id}/credential/claim")
    public ResponseEntity<MerchantCredentialClaim> claimCredential(@PathVariable UUID id) {
        var claim = notificationService.claim(requirePortalMerchantId(), id);
        if (claim.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.GONE, "The one-time credential handoff expired");
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(claim.get());
    }

    private UUID requirePortalMerchantId() {
        return identityResolver.requirePortalUserMerchantId(CurrentUser.require());
    }
}
