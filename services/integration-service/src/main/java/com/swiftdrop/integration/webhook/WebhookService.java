package com.swiftdrop.integration.webhook;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.common.EventEnvelope;
import com.swiftdrop.integration.merchant.MerchantOrder;
import com.swiftdrop.integration.merchant.MerchantOrderQuery;
import com.swiftdrop.integration.merchant.ParcelStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);
    public static final String CONSUMER_GROUP = "integration-webhook";

    public enum DeliveryDisposition {
        SKIPPED, SUCCESS, RETRYABLE_FAILURE, TERMINAL_FAILURE
    }

    public record DeliveryOutcome(DeliveryDisposition disposition, UUID deliveryId,
                                  UUID merchantId, String errorMessage) {
        static DeliveryOutcome skipped() {
            return new DeliveryOutcome(DeliveryDisposition.SKIPPED, null, null, null);
        }
    }

    private final WebhookEndpointRepository endpointRepository;
    private final MerchantOrderQuery merchantOrderQuery;
    private final WebhookDeliveryRepository deliveryRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final WebhookCryptoService cryptoService;
    private final SsrfGuard ssrfGuard;
    private final WebhookDispatcher dispatcher;
    private final ObjectMapper objectMapper;

    public WebhookService(
            WebhookEndpointRepository endpointRepository,
            MerchantOrderQuery merchantOrderQuery,
            WebhookDeliveryRepository deliveryRepository,
            ProcessedEventRepository processedEventRepository,
            WebhookCryptoService cryptoService,
            SsrfGuard ssrfGuard,
            WebhookDispatcher dispatcher,
            ObjectMapper objectMapper) {
        this.endpointRepository = endpointRepository;
        this.merchantOrderQuery = merchantOrderQuery;
        this.deliveryRepository = deliveryRepository;
        this.processedEventRepository = processedEventRepository;
        this.cryptoService = cryptoService;
        this.ssrfGuard = ssrfGuard;
        this.dispatcher = dispatcher;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public WebhookSettingsResponse getSettings(UUID merchantId) {
        return endpointRepository.findById(merchantId)
                .map(endpoint -> new WebhookSettingsResponse(
                        endpoint.getMerchantId(),
                        endpoint.getUrl(),
                        endpoint.isActive(),
                        endpoint.getSubscribedEventsList(),
                        endpoint.getEncryptedSecret() != null,
                        endpoint.getSecretPreview(),
                        null,
                        endpoint.getCreatedAt(),
                        endpoint.getUpdatedAt()
                ))
                .orElseGet(() -> new WebhookSettingsResponse(
                        merchantId,
                        null,
                        false,
                        List.of("PARCEL_CREATED", "PARCEL_STATUS_CHANGED"),
                        false,
                        null,
                        null,
                        Instant.now(),
                        Instant.now()
                ));
    }

    @Transactional
    public WebhookSettingsResponse updateSettings(UUID merchantId, UpdateWebhookSettingsRequest request) {
        ssrfGuard.validateUrl(request.url());

        Optional<WebhookEndpointEntity> existingOpt = endpointRepository.findById(merchantId);
        WebhookEndpointEntity endpoint;
        String rawSecretToReturn = null;

        if (existingOpt.isPresent()) {
            endpoint = existingOpt.get();
            endpoint.setUrl(request.url());
            endpoint.setActive(Boolean.TRUE.equals(request.active()));
            if (request.subscribedEvents() != null) {
                endpoint.setSubscribedEventsList(request.subscribedEvents());
            }
            if (request.isRegenerateSecret() || endpoint.getEncryptedSecret() == null) {
                String plainSecret = cryptoService.generateSecret();
                endpoint.setEncryptedSecret(cryptoService.encrypt(plainSecret));
                endpoint.setSecretPreview(cryptoService.generatePreview(plainSecret));
                rawSecretToReturn = plainSecret;
            }
            endpoint.setUpdatedAt(Instant.now());
        } else {
            String plainSecret = cryptoService.generateSecret();
            String encrypted = cryptoService.encrypt(plainSecret);
            String preview = cryptoService.generatePreview(plainSecret);
            rawSecretToReturn = plainSecret;

            endpoint = new WebhookEndpointEntity(
                    merchantId,
                    request.url(),
                    Boolean.TRUE.equals(request.active()),
                    request.subscribedEvents() != null ? String.join(",", request.subscribedEvents()) : "PARCEL_CREATED,PARCEL_STATUS_CHANGED",
                    encrypted,
                    preview
            );
        }

        endpointRepository.save(endpoint);

        return new WebhookSettingsResponse(
                endpoint.getMerchantId(),
                endpoint.getUrl(),
                endpoint.isActive(),
                endpoint.getSubscribedEventsList(),
                true,
                endpoint.getSecretPreview(),
                rawSecretToReturn,
                endpoint.getCreatedAt(),
                endpoint.getUpdatedAt()
        );
    }

    public TestWebhookResultResponse triggerTestWebhook(UUID merchantId, TestWebhookRequest request) {
        WebhookEndpointEntity endpoint = endpointRepository.findById(merchantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook settings not configured for merchant"));

        String targetUrl = (request != null && request.targetUrlOverride() != null && !request.targetUrlOverride().isBlank())
                ? request.targetUrlOverride().trim()
                : endpoint.getUrl();

        if (targetUrl == null || targetUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No webhook destination URL specified or configured");
        }

        ssrfGuard.validateUrl(targetUrl);

        String secret = cryptoService.decrypt(endpoint.getEncryptedSecret());
        UUID testDeliveryId = UUID.randomUUID();
        UUID testEventId = UUID.randomUUID();
        String eventType = (request != null && request.sampleEventType() != null) ? request.sampleEventType() : "TEST_EVENT";

        WebhookPayload testPayload = new WebhookPayload(
                testDeliveryId,
                testEventId,
                eventType,
                Instant.now(),
                1L,
                merchantId,
                new WebhookParcelFields(
                        "pcl-test-" + UUID.randomUUID().toString().substring(0, 8),
                        "SD-TEST-" + Instant.now().getEpochSecond(),
                        "OUT_FOR_DELIVERY",
                        "IN_TRANSIT",
                        "OUT_FOR_DELIVERY",
                        1.5,
                        "Test Recipient",
                        "123 Test Street, Colombo",
                        Instant.now(),
                        null
                )
        );

        WebhookDispatcher.DispatchResult result = dispatcher.dispatch(targetUrl, secret, testDeliveryId.toString(), testPayload);

        return new TestWebhookResultResponse(
                result.success(),
                result.statusCode(),
                result.latencyMs(),
                Instant.now(),
                targetUrl,
                result.signatureSent(),
                result.timestampSent(),
                result.responseBodySummary(),
                result.errorMessage()
        );
    }

    /** One grouped query for the whole page: deliveryId -> {totalAttempts, cycleStarts}. */
    private Map<UUID, long[]> summarizeAttempts(List<WebhookDeliveryEntity> deliveries) {
        if (deliveries.isEmpty()) {
            return Map.of();
        }
        List<UUID> ids = deliveries.stream().map(WebhookDeliveryEntity::getDeliveryId).toList();
        Map<UUID, long[]> stats = new java.util.HashMap<>();
        for (Object[] row : deliveryRepository.summarizeAttempts(ids)) {
            long total = row[1] == null ? 0 : ((Number) row[1]).longValue();
            long cycleStarts = row[2] == null ? 0 : ((Number) row[2]).longValue();
            stats.put((UUID) row[0], new long[] {total, cycleStarts});
        }
        return stats;
    }

    /**
     * Parcel status carried by a parcel lifecycle delivery's own stored payload. Only known
     * lifecycle values are returned; anything else (test events, unreadable payloads) is null.
     */
    private String payloadParcelStatus(WebhookDeliveryEntity delivery) {
        if (!"PARCEL_STATUS_CHANGED".equals(delivery.getEventType())
                && !"PARCEL_CREATED".equals(delivery.getEventType())) {
            return null;
        }
        String payload = delivery.getPayload();
        if (payload == null || payload.isBlank()) {
            return null;
        }
        try {
            var parcel = objectMapper.readTree(payload).path("parcel");
            String status = parcel.path("toStatus").asText(null);
            if (status == null || status.isBlank()) {
                status = parcel.path("status").asText(null);
            }
            if (status == null) {
                return null;
            }
            return ParcelStatus.valueOf(status).name();
        } catch (JsonProcessingException | IllegalArgumentException e) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public WebhookDeliveryLogPage listDeliveries(UUID merchantId, String status, String eventType,
                                                Instant from, Instant to, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<WebhookDeliveryEntity> entityPage = deliveryRepository.findDeliveries(
                merchantId, status, eventType, from, to, pageable
        );

        Map<UUID, long[]> attemptStats = summarizeAttempts(entityPage.getContent());
        List<WebhookDeliveryLogItem> items = entityPage.getContent().stream()
                .map(e -> {
                    long[] stats = attemptStats.getOrDefault(e.getDeliveryId(), new long[] {0, 0});
                    // Deliveries recorded before attempt history existed fall back to the cycle counter.
                    int totalAttempts = stats[0] > 0 ? (int) stats[0] : e.getAttempts();
                    int manualRetryCount = (int) Math.max(0, stats[1] - 1);
                    return new WebhookDeliveryLogItem(
                            e.getDeliveryId(),
                            e.getEventId(),
                            e.getEventType(),
                            e.getTrackingNumber(),
                            e.getTargetUrl(),
                            e.getStatus(),
                            e.getHttpStatusCode(),
                            e.getAttempts(),
                            e.getLastAttemptAt(),
                            e.getNextRetryAt(),
                            safeFailureSummary(e.getErrorSummary()),
                            e.getCreatedAt(),
                            payloadParcelStatus(e),
                            totalAttempts,
                            manualRetryCount
                    );
                })
                .toList();

        return new WebhookDeliveryLogPage(
                items,
                entityPage.getTotalElements(),
                entityPage.getTotalPages(),
                entityPage.getNumber(),
                entityPage.getSize()
        );
    }

    @Transactional(readOnly = true)
    public WebhookDeliveryDetailResponse getDeliveryDetail(UUID merchantId, UUID deliveryId) {
        WebhookDeliveryEntity entity = deliveryRepository.findByDeliveryIdAndMerchantId(deliveryId, merchantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Webhook delivery not found"));

        return toDeliveryDetailResponse(entity);
    }

    @Transactional
    public WebhookDeliveryDetailResponse retryDelivery(UUID merchantId, UUID deliveryId) {
        WebhookDeliveryEntity delivery = deliveryRepository.findForRetry(deliveryId, merchantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Webhook delivery not found"));

        if (!"FAILED".equals(delivery.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only failed webhook deliveries can be retried");
        }

        WebhookEndpointEntity endpoint = endpointRepository.findById(merchantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook settings not configured"));

        if (!endpoint.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook endpoint is inactive");
        }

        if (endpoint.getUrl() == null || endpoint.getEncryptedSecret() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook endpoint is incomplete");
        }
        String secret = cryptoService.decrypt(endpoint.getEncryptedSecret());

        // The scoped row lock serializes concurrent retries through the final status check.
        // Manual retry executes immediately as allowed by the merged OpenAPI contract.
        // It retains the attempt history and uses the currently configured destination.
        delivery.setTargetUrl(endpoint.getUrl());
        delivery.setAttempts(1);
        delivery.setNextRetryAt(null);
        Instant attemptedAt = Instant.now();
        delivery.setLastAttemptAt(attemptedAt);

        WebhookDispatcher.DispatchResult result;
        try {
            result = dispatcher.dispatch(delivery.getTargetUrl(), secret,
                    delivery.getDeliveryId().toString(), delivery.getPayload());
        } catch (SsrfException e) {
            boolean transientDnsFailure = e.isTransientDnsFailure();
            result = new WebhookDispatcher.DispatchResult(false,
                    transientDnsFailure ? 0 : 400, 0, Map.of(), Map.of(), null, null,
                    transientDnsFailure ? "Webhook DNS resolution failed" : "Webhook destination rejected",
                    null, null);
        }

        delivery.setHttpStatusCode(result.statusCode());
        delivery.setStatus(result.success() ? "SUCCESS" : "FAILED");
        delivery.setNextRetryAt(null);
        delivery.setErrorSummary(result.errorMessage());
        try {
            delivery.setRequestHeaders(objectMapper.writeValueAsString(result.requestHeaders()));
            delivery.setResponseHeaders(objectMapper.writeValueAsString(result.responseHeaders()));
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize webhook headers");
        }
        // Merchant endpoints may return credentials or PII. Keep transport diagnostics,
        // but do not persist an untrusted response body in delivery logs.
        delivery.setResponseBody(null);

        WebhookDeliveryAttemptEntity attempt = new WebhookDeliveryAttemptEntity(
                delivery,
                delivery.getAttempts(),
                attemptedAt,
                result.statusCode(),
                result.latencyMs(),
                result.success(),
                result.errorMessage()
        );
        delivery.addAttempt(attempt);

        deliveryRepository.save(delivery);

        return toDeliveryDetailResponse(delivery);
    }

    @Transactional
    public DeliveryOutcome processParcelStatusChangedEvent(EventEnvelope event) {
        return processParcelLifecycleEvent(event, false);
    }

    @Transactional
    public DeliveryOutcome processParcelStatusChangedEvent(EventEnvelope event, boolean fromRetryTopic) {
        return processParcelLifecycleEvent(event, fromRetryTopic);
    }

    @Transactional
    public DeliveryOutcome processParcelCreatedEvent(EventEnvelope event) {
        return processParcelLifecycleEvent(event, false);
    }

    @Transactional
    public DeliveryOutcome processParcelCreatedEvent(EventEnvelope event, boolean fromRetryTopic) {
        return processParcelLifecycleEvent(event, fromRetryTopic);
    }

    @Transactional
    public DeliveryOutcome processParcelLifecycleEvent(EventEnvelope event) {
        return processParcelLifecycleEvent(event, false);
    }

    @Transactional
    public DeliveryOutcome processParcelLifecycleEvent(EventEnvelope event, boolean fromRetryTopic) {
        if (event == null || event.eventId() == null) {
            return DeliveryOutcome.skipped();
        }

        UUID eventId;
        try {
            eventId = UUID.fromString(event.eventId());
        } catch (IllegalArgumentException e) {
            log.warn("Malformed eventId in parcel lifecycle event");
            return DeliveryOutcome.skipped();
        }

        if (processedEventRepository.existsByEventIdAndConsumerGroup(eventId, CONSUMER_GROUP)) {
            return DeliveryOutcome.skipped();
        }

        if (!"PARCEL_STATUS_CHANGED".equals(event.eventType()) && !"PARCEL_CREATED".equals(event.eventType())) {
            recordProcessedEvent(eventId);
            return DeliveryOutcome.skipped();
        }

        UUID parcelId = null;
        if (event.parcelId() != null && !event.parcelId().isBlank()) {
            try {
                parcelId = UUID.fromString(event.parcelId());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid parcelId UUID in event {}", eventId);
            }
        }

        Optional<MerchantOrder> mappedOrderOpt = parcelId != null
                ? merchantOrderQuery.findByParcelId(parcelId)
                : Optional.empty();

        UUID merchantId = null;
        if (event.merchantId() != null && !event.merchantId().isBlank()) {
            try {
                merchantId = UUID.fromString(event.merchantId());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid merchantId UUID in event {}", eventId);
                recordProcessedEvent(eventId);
                return DeliveryOutcome.skipped();
            }
        }

        if (merchantId == null) {
            if (mappedOrderOpt.isPresent()) {
                merchantId = mappedOrderOpt.get().merchantId();
            } else {
                recordProcessedEvent(eventId);
                return DeliveryOutcome.skipped();
            }
        } else if (mappedOrderOpt.isPresent() && !merchantId.equals(mappedOrderOpt.get().merchantId())) {
            log.warn("Merchant identity does not match parcel order mapping for event {}", event.eventId());
            recordProcessedEvent(eventId);
            return DeliveryOutcome.skipped();
        }

        final UUID resolvedMerchantId = merchantId;

        if ("PARCEL_STATUS_CHANGED".equals(event.eventType())) {
            if (event.occurredAt() == null) {
                recordProcessedEvent(eventId);
                return DeliveryOutcome.skipped();
            }
            if (mappedOrderOpt.isPresent() && parcelId != null) {
                try {
                    ParcelStatus status = ParcelStatus.valueOf(event.toStatus());
                    MerchantOrder mappedOrder = mappedOrderOpt.get();
                    if (mappedOrder.updatedAt() == null || !event.occurredAt().isBefore(mappedOrder.updatedAt())) {
                        merchantOrderQuery.updateParcelStatusByParcelId(parcelId, status, event.occurredAt());
                    }
                } catch (IllegalArgumentException | NullPointerException exception) {
                    log.warn("Invalid parcel status in merchant webhook event: {}", event.toStatus());
                    recordProcessedEvent(eventId);
                    return DeliveryOutcome.skipped();
                }
            }
        }

        Optional<WebhookDeliveryEntity> existing = deliveryRepository
                .findFirstByEventIdAndMerchantIdOrderByCreatedAtAsc(eventId, resolvedMerchantId);
        if (existing.isPresent() && ("SUCCESS".equals(existing.get().getStatus())
                || "FAILED".equals(existing.get().getStatus())
                || "CANCELLED".equals(existing.get().getStatus()))) {
            recordProcessedEvent(eventId);
            return DeliveryOutcome.skipped();
        }
        if (existing.isPresent() && !fromRetryTopic) {
            // A duplicate on the main topic must not bypass the Kafka retry delay.
            return DeliveryOutcome.skipped();
        }

        Optional<WebhookEndpointEntity> endpointOpt = endpointRepository.findById(resolvedMerchantId);
        if (endpointOpt.isEmpty() || !endpointOpt.get().isActive() || endpointOpt.get().getUrl() == null
                || !endpointOpt.get().isSubscribedTo(event.eventType())) {
            existing.ifPresent(delivery -> {
                delivery.setStatus("CANCELLED");
                delivery.setNextRetryAt(null);
                deliveryRepository.save(delivery);
            });
            recordProcessedEvent(eventId);
            return DeliveryOutcome.skipped();
        }

        WebhookEndpointEntity endpoint = endpointOpt.get();
        MerchantOrder mappedOrder = mappedOrderOpt.orElse(null);
        WebhookDeliveryEntity delivery = existing.orElseGet(() -> newDelivery(event, eventId, resolvedMerchantId, endpoint, mappedOrder));
        int attemptNumber = delivery.getAttempts() + 1;
        Instant attemptedAt = Instant.now();
        delivery.setAttempts(attemptNumber);
        delivery.setStatus("PENDING");
        delivery.setLastAttemptAt(attemptedAt);
        delivery.setNextRetryAt(null);

        WebhookDispatcher.DispatchResult result;
        try {
            String secret = cryptoService.decrypt(endpoint.getEncryptedSecret());
            result = dispatcher.dispatch(delivery.getTargetUrl(), secret,
                    delivery.getDeliveryId().toString(), delivery.getPayload());
        } catch (SsrfException e) {
            boolean retryableDnsFailure = e.isTransientDnsFailure();
            result = new WebhookDispatcher.DispatchResult(false, retryableDnsFailure ? 0 : 400, 0,
                    Map.of(), Map.of(), null, null,
                    retryableDnsFailure ? "Webhook DNS resolution failed" : "Webhook destination rejected",
                    null, null);
        }

        delivery.setHttpStatusCode(result.statusCode());
        delivery.setErrorSummary(result.errorMessage());
        try {
            delivery.setRequestHeaders(objectMapper.writeValueAsString(result.requestHeaders()));
            delivery.setResponseHeaders(objectMapper.writeValueAsString(result.responseHeaders()));
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize webhook headers");
        }
        delivery.setResponseBody(null);
        delivery.addAttempt(new WebhookDeliveryAttemptEntity(delivery, attemptNumber, attemptedAt,
                result.statusCode(), result.latencyMs(), result.success(), result.errorMessage()));

        DeliveryDisposition disposition;
        if (result.success()) {
            delivery.setStatus("SUCCESS");
            disposition = DeliveryDisposition.SUCCESS;
        } else if (WebhookDeliveryPolicy.isRetryable(result)) {
            delivery.setNextRetryAt(WebhookDeliveryPolicy.nextDelay(attemptNumber)
                    .map(delay -> Instant.now().plus(delay)).orElse(null));
            delivery.setStatus(attemptNumber < WebhookDeliveryPolicy.MAX_ATTEMPTS ? "PENDING_RETRY" : "FAILED");
            disposition = DeliveryDisposition.RETRYABLE_FAILURE;
        } else {
            delivery.setStatus("FAILED");
            disposition = DeliveryDisposition.TERMINAL_FAILURE;
        }

        deliveryRepository.save(delivery);
        if (disposition != DeliveryDisposition.RETRYABLE_FAILURE
                || attemptNumber >= WebhookDeliveryPolicy.MAX_ATTEMPTS) {
            recordProcessedEvent(eventId);
        }
        return new DeliveryOutcome(disposition, delivery.getDeliveryId(), resolvedMerchantId, result.errorMessage());
    }

    @Transactional
    public void markDltFailed(EventEnvelope event) {
        if (event == null || event.eventId() == null) {
            return;
        }
        try {
            UUID eventId = UUID.fromString(event.eventId());
            UUID merchantId = null;
            if (event.merchantId() != null && !event.merchantId().isBlank()) {
                merchantId = UUID.fromString(event.merchantId());
            } else if (event.parcelId() != null && !event.parcelId().isBlank()) {
                try {
                    UUID parcelId = UUID.fromString(event.parcelId());
                    merchantId = merchantOrderQuery.findByParcelId(parcelId)
                            .map(MerchantOrder::merchantId)
                            .orElse(null);
                } catch (IllegalArgumentException ex) {
                    // ignore
                }
            }
            if (merchantId == null) {
                return;
            }
            deliveryRepository.findFirstByEventIdAndMerchantIdOrderByCreatedAtAsc(eventId, merchantId)
                    .ifPresent(delivery -> {
                        if (!"SUCCESS".equals(delivery.getStatus()) && !"CANCELLED".equals(delivery.getStatus())) {
                            delivery.setStatus("FAILED");
                            delivery.setNextRetryAt(null);
                            deliveryRepository.save(delivery);
                        }
                    });
            if (!processedEventRepository.existsByEventIdAndConsumerGroup(eventId, CONSUMER_GROUP)) {
                recordProcessedEvent(eventId);
            }
        } catch (IllegalArgumentException e) {
            log.warn("Malformed event identifiers in webhook DLT record");
        }
    }

    private WebhookDeliveryEntity newDelivery(EventEnvelope event, UUID eventId, UUID merchantId,
                                               WebhookEndpointEntity endpoint, MerchantOrder mappedOrder) {
        UUID deliveryId = UUID.randomUUID();
        Instant occurredAt = event.occurredAt() != null ? event.occurredAt() : Instant.now();
        String recipientName = mappedOrder != null ? mappedOrder.recipientName() : null;
        String recipientAddress = mappedOrder != null ? mappedOrder.recipientAddress() : null;
        WebhookPayload payload = new WebhookPayload(deliveryId, eventId, event.eventType(), occurredAt,
                event.sequence() != null ? event.sequence() : 1L, merchantId,
                new WebhookParcelFields(event.parcelId(), event.trackingNumber(), event.toStatus(),
                        event.fromStatus(), event.toStatus(), null, recipientName, recipientAddress, occurredAt, event.reason()));
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize webhook payload");
        }
        WebhookDeliveryEntity delivery = new WebhookDeliveryEntity();
        delivery.setDeliveryId(deliveryId);
        delivery.setEventId(eventId);
        delivery.setMerchantId(merchantId);
        delivery.setEventType(event.eventType());
        delivery.setTrackingNumber(event.trackingNumber());
        delivery.setTargetUrl(endpoint.getUrl());
        delivery.setStatus("PENDING");
        delivery.setAttempts(0);
        delivery.setPayload(payloadJson);
        delivery.setCreatedAt(Instant.now());
        return delivery;
    }

    private void recordProcessedEvent(UUID eventId) {
        processedEventRepository.save(new ProcessedEventEntity(eventId, CONSUMER_GROUP, Instant.now()));
    }

    private WebhookDeliveryDetailResponse toDeliveryDetailResponse(WebhookDeliveryEntity entity) {
        WebhookPayload payload = null;
        if (entity.getPayload() != null) {
            try {
                payload = objectMapper.readValue(entity.getPayload(), WebhookPayload.class);
            } catch (JsonProcessingException e) {
                log.warn("Could not deserialize saved webhook payload: {}", e.getMessage());
            }
        }

        Map<String, String> requestHeaders = Collections.emptyMap();
        if (entity.getRequestHeaders() != null) {
            try {
                requestHeaders = objectMapper.readValue(entity.getRequestHeaders(), new TypeReference<>() {});
            } catch (JsonProcessingException e) {
                // Ignore parse error
            }
        }

        Map<String, String> responseHeaders = Collections.emptyMap();
        if (entity.getResponseHeaders() != null) {
            try {
                Map<String, String> savedHeaders = objectMapper.readValue(
                        entity.getResponseHeaders(), new TypeReference<>() {});
                responseHeaders = savedHeaders.entrySet().stream()
                        .filter(entry -> "content-type".equalsIgnoreCase(entry.getKey()))
                        .map(entry -> entry.getValue().split(";", 2)[0].trim())
                        .filter(value -> value.matches("[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+"))
                        .collect(java.util.stream.Collectors.toMap(value -> "Content-Type", value -> value));
            } catch (JsonProcessingException e) {
                // Ignore parse error
            }
        }

        List<DeliveryAttemptRecord> history = new ArrayList<>();
        if (entity.getRetryHistory() != null) {
            for (WebhookDeliveryAttemptEntity attempt : entity.getRetryHistory()) {
                history.add(new DeliveryAttemptRecord(
                        attempt.getAttemptNumber(),
                        attempt.getAttemptedAt(),
                        attempt.getHttpStatusCode(),
                        attempt.getLatencyMs(),
                        attempt.isSuccess(),
                        safeFailureSummary(attempt.getErrorMessage())
                ));
            }
        }

        return new WebhookDeliveryDetailResponse(
                entity.getDeliveryId(),
                entity.getEventId(),
                entity.getEventType(),
                entity.getStatus(),
                entity.getTargetUrl(),
                entity.getAttempts(),
                entity.getHttpStatusCode(),
                requestHeaders,
                payload,
                responseHeaders,
                null,
                entity.getLastAttemptAt(),
                entity.getNextRetryAt(),
                history,
                entity.getCreatedAt()
        );
    }

    private String safeFailureSummary(String message) {
        if (message == null) {
            return null;
        }
        if (message.matches("Target returned HTTP [0-9]{3}")) {
            return message;
        }
        if ("Webhook DNS resolution failed".equals(message)
                || "Webhook destination rejected".equals(message)) {
            return message;
        }
        return "Webhook delivery failed";
    }
}
