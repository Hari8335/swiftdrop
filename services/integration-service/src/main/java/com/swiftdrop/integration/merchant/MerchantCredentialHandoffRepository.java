package com.swiftdrop.integration.merchant;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MerchantCredentialHandoffRepository extends JpaRepository<MerchantCredentialHandoffEntity, UUID> {
    boolean existsByNotificationIdAndMerchantIdAndExpiresAtAfter(UUID notificationId, UUID merchantId, Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select handoff from MerchantCredentialHandoffEntity handoff where handoff.notificationId=:notificationId and handoff.merchantId=:merchantId")
    Optional<MerchantCredentialHandoffEntity> findForClaim(
            @Param("notificationId") UUID notificationId, @Param("merchantId") UUID merchantId);

    @Modifying
    @Query("delete from MerchantCredentialHandoffEntity handoff where handoff.merchantId = :merchantId")
    void deleteForMerchant(@Param("merchantId") UUID merchantId);

    @Modifying
    @Query("update MerchantCredentialHandoffEntity handoff set handoff.encryptedSecret = '' where handoff.expiresAt <= :now and handoff.encryptedSecret <> ''")
    int eraseExpiredSecrets(@Param("now") Instant now);
}
