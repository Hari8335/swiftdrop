package com.swiftdrop.integration.webhook;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WebhookDeliveryRepository extends JpaRepository<WebhookDeliveryEntity, UUID>,
        JpaSpecificationExecutor<WebhookDeliveryEntity> {

    Optional<WebhookDeliveryEntity> findByDeliveryIdAndMerchantId(UUID deliveryId, UUID merchantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM WebhookDeliveryEntity d WHERE d.deliveryId = :deliveryId AND d.merchantId = :merchantId")
    Optional<WebhookDeliveryEntity> findForRetry(@Param("deliveryId") UUID deliveryId,
                                                  @Param("merchantId") UUID merchantId);

    Optional<WebhookDeliveryEntity> findFirstByEventIdAndMerchantIdOrderByCreatedAtAsc(UUID eventId, UUID merchantId);

    /**
     * Attempt statistics for a page of deliveries in one query: [deliveryId, totalAttempts, cycleStarts].
     * Only a manual retry restarts attemptNumber at 1, so cycleStarts - 1 is the manual retry count.
     */
    @Query("SELECT a.delivery.deliveryId, COUNT(a), SUM(CASE WHEN a.attemptNumber = 1 THEN 1 ELSE 0 END) " +
            "FROM WebhookDeliveryAttemptEntity a WHERE a.delivery.deliveryId IN :deliveryIds " +
            "GROUP BY a.delivery.deliveryId")
    List<Object[]> summarizeAttempts(@Param("deliveryIds") Collection<UUID> deliveryIds);

    @Query("SELECT d FROM WebhookDeliveryEntity d WHERE d.merchantId = :merchantId " +
            "AND (:status IS NULL OR d.status = :status) " +
            "AND (:eventType IS NULL OR d.eventType = :eventType) " +
            "AND (CAST(:fromDate AS timestamp) IS NULL OR d.createdAt >= :fromDate) " +
            "AND (CAST(:toDate AS timestamp) IS NULL OR d.createdAt <= :toDate)")
    Page<WebhookDeliveryEntity> findDeliveries(
            @Param("merchantId") UUID merchantId,
            @Param("status") String status,
            @Param("eventType") String eventType,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable
    );
}
