package com.swiftdrop.integration.merchant;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MerchantPortalNotificationRepository extends JpaRepository<MerchantPortalNotificationEntity, UUID> {
    Page<MerchantPortalNotificationEntity> findAllByMerchantIdOrderByCreatedAtDesc(UUID merchantId, Pageable pageable);
    Optional<MerchantPortalNotificationEntity> findByIdAndMerchantId(UUID id, UUID merchantId);
    long countByMerchantIdAndReadAtIsNull(UUID merchantId);
}
