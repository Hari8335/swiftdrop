package com.swiftdrop.auth.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;
import java.util.UUID;

@Component
public class AuthEventPublisher {

    public static final String USER_REGISTERED_TOPIC = "user.registered.v1";
    private static final Logger log = LoggerFactory.getLogger(AuthEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public AuthEventPublisher(
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            ObjectMapper objectMapper
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void publishUserRegistered(String userId, String email, String fullName,
                                      String phoneNumber, String role, String merchantId, boolean enabled) {
        UserRegisteredEvent event = new UserRegisteredEvent(
                UUID.randomUUID().toString(),
                "USER_REGISTERED",
                Instant.now(),
                userId,
                email,
                fullName,
                phoneNumber,
                role,
                merchantId,
                enabled
        );

        if (kafkaTemplate != null) {
            final String payload;
            try {
                payload = objectMapper.writeValueAsString(event);
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize user.registered.v1 event for userId={}: {}",
                        userId, e.getMessage(), e);
                return;
            }

            try {
                CompletableFuture<?> sendFuture = kafkaTemplate.send(USER_REGISTERED_TOPIC, userId, payload);
                sendFuture.whenComplete((result, failure) -> {
                    if (failure == null) {
                        log.info("Published user.registered.v1 event for userId={}", userId);
                    } else {
                        log.warn("Failed to publish user.registered.v1 event for userId={}: {}",
                                userId, failure.getMessage(), failure);
                    }
                });
            } catch (Exception e) {
                log.warn("Failed to publish user.registered.v1 event for userId={}: {}",
                        userId, e.getMessage(), e);
            }
        } else {
            log.info("KafkaTemplate not configured; skipped publishing user.registered.v1 for userId={}", userId);
        }
    }
}
