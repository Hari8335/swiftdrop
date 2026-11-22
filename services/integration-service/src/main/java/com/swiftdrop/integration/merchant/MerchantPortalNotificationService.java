package com.swiftdrop.integration.merchant;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MerchantPortalNotificationService {
    private static final int HANDOFF_HOURS = 24;

    private final MerchantPortalNotificationRepository notifications;
    private final MerchantCredentialHandoffRepository handoffs;
    private final MerchantCredentialHandoffCrypto crypto;

    public MerchantPortalNotificationService(MerchantPortalNotificationRepository notifications,
            MerchantCredentialHandoffRepository handoffs, MerchantCredentialHandoffCrypto crypto) {
        this.notifications = notifications;
        this.handoffs = handoffs;
        this.crypto = crypto;
    }

    public void assertHandoffReady() {
        crypto.assertConfigured();
    }

    @Transactional
    public void merchantApproved(Merchant merchant) {
        create(merchant, MerchantPortalNotificationType.MERCHANT_APPROVED,
                "Merchant registration approved", "Your merchant account has been approved. You can now use the Merchant Portal.");
    }

    @Transactional
    public UUID credentialReplaced(Merchant merchant, String clientId, String clientSecret) {
        crypto.assertConfigured();
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        handoffs.deleteForMerchant(merchant.getId());
        MerchantPortalNotificationEntity notification = notifications.save(new MerchantPortalNotificationEntity(
                id, merchant.getId(), MerchantPortalNotificationType.CREDENTIALS_REPLACED,
                "Replacement API credentials ready",
                "An administrator replaced your API credentials. Open this notification to reveal the new client secret once within 24 hours.", now));
        String encrypted = crypto.encrypt(merchant.getId(), id, clientId, clientSecret);
        handoffs.save(new MerchantCredentialHandoffEntity(id, merchant.getId(), clientId, encrypted,
                now, now.plus(HANDOFF_HOURS, ChronoUnit.HOURS)));
        return notification.getId();
    }

    @Transactional(readOnly = true)
    public MerchantPortalNotificationPage list(UUID merchantId, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page must be non-negative and size must be between 1 and 100");
        }
        var result = notifications.findAllByMerchantIdOrderByCreatedAtDesc(merchantId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        Instant now = Instant.now();
        var items = result.getContent().stream()
                .map(item -> MerchantPortalNotificationDto.from(item,
                        handoffs.existsByNotificationIdAndMerchantIdAndExpiresAtAfter(item.getId(), merchantId, now)))
                .toList();
        return new MerchantPortalNotificationPage(items, result.getTotalElements(),
                notifications.countByMerchantIdAndReadAtIsNull(merchantId));
    }

    @Transactional
    public void markRead(UUID merchantId, UUID notificationId) {
        MerchantPortalNotificationEntity notification = notifications.findByIdAndMerchantId(notificationId, merchantId)
                .orElseThrow(MerchantPortalNotificationService::notFound);
        notification.markRead(Instant.now());
        notifications.save(notification);
    }

    /** Empty means the handoff expired; the row deletion commits before the controller returns 410. */
    @Transactional
    public Optional<MerchantCredentialClaim> claim(UUID merchantId, UUID notificationId) {
        MerchantPortalNotificationEntity notification = notifications.findByIdAndMerchantId(notificationId, merchantId)
                .orElseThrow(MerchantPortalNotificationService::notFound);
        MerchantCredentialHandoffEntity handoff = handoffs.findForClaim(notificationId, merchantId)
                .orElseThrow(MerchantPortalNotificationService::notFound);
        if (!Instant.now().isBefore(handoff.getExpiresAt())) {
            handoffs.delete(handoff);
            notification.markRead(Instant.now());
            notifications.save(notification);
            return Optional.empty();
        }

        String secret = crypto.decrypt(merchantId, notificationId, handoff.getClientId(), handoff.getEncryptedSecret());
        handoffs.delete(handoff);
        notification.markRead(Instant.now());
        notifications.save(notification);
        return Optional.of(new MerchantCredentialClaim(handoff.getClientId(), secret));
    }

    @Transactional
    public int purgeExpired() {
        return handoffs.eraseExpiredSecrets(Instant.now());
    }

    private void create(Merchant merchant, MerchantPortalNotificationType type, String title, String message) {
        notifications.save(new MerchantPortalNotificationEntity(UUID.randomUUID(), merchant.getId(), type,
                title, message, Instant.now()));
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Merchant notification not found");
    }
}
