package com.swiftdrop.auth.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class AuthEventPublisherTest {

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private AuthEventPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new AuthEventPublisher(kafkaTemplate, objectMapper);
    }

    @Test
    void publishesContractCompatibleJsonPayload() throws Exception {
        CompletableFuture<SendResult<String, Object>> sendFuture = new CompletableFuture<>();
        when(kafkaTemplate.send(eq(AuthEventPublisher.USER_REGISTERED_TOPIC), eq("user-1"), anyString()))
                .thenReturn(sendFuture);

        publisher.publishUserRegistered(
                "user-1", "courier@example.com", "Courier One",
                "+94770000000", "COURIER", null, true
        );

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(kafkaTemplate).send(
                eq(AuthEventPublisher.USER_REGISTERED_TOPIC),
                eq("user-1"),
                payloadCaptor.capture()
        );

        JsonNode payload = objectMapper.readTree(payloadCaptor.getValue());
        assertThat(payload.get("eventType").asText()).isEqualTo("USER_REGISTERED");
        assertThat(payload.get("userId").asText()).isEqualTo("user-1");
        assertThat(payload.get("role").asText()).isEqualTo("COURIER");
    }

    @Test
    void logsSuccessfulPublicationOnlyAfterKafkaAcknowledges(CapturedOutput output) {
        CompletableFuture<SendResult<String, Object>> sendFuture = new CompletableFuture<>();
        when(kafkaTemplate.send(eq(AuthEventPublisher.USER_REGISTERED_TOPIC), eq("user-1"), anyString()))
                .thenReturn(sendFuture);

        publisher.publishUserRegistered(
                "user-1", "courier@example.com", "Courier One",
                "+94770000000", "COURIER", null, true
        );

        assertThat(output).doesNotContain("Published user.registered.v1 event for userId=user-1");

        sendFuture.complete(new SendResult<>(null, (RecordMetadata) null));

        assertThat(output).contains("Published user.registered.v1 event for userId=user-1");
    }

    @Test
    void reportsPublicationFailureWithoutSuccessLog(CapturedOutput output) {
        CompletableFuture<SendResult<String, Object>> sendFuture = new CompletableFuture<>();
        when(kafkaTemplate.send(eq(AuthEventPublisher.USER_REGISTERED_TOPIC), eq("user-1"), anyString()))
                .thenReturn(sendFuture);

        publisher.publishUserRegistered(
                "user-1", "courier@example.com", "Courier One",
                "+94770000000", "COURIER", null, true
        );

        sendFuture.completeExceptionally(new IllegalStateException("broker unavailable"));

        assertThat(output).contains("Failed to publish user.registered.v1 event for userId=user-1");
        assertThat(output).doesNotContain("Published user.registered.v1 event for userId=user-1");
    }

    @Test
    void reportsSerializationFailureWithoutPublishing(CapturedOutput output) throws JsonProcessingException {
        ObjectMapper failingMapper = org.mockito.Mockito.mock(ObjectMapper.class);
        when(failingMapper.writeValueAsString(org.mockito.ArgumentMatchers.any(UserRegisteredEvent.class)))
                .thenThrow(new JsonProcessingException("serialization failed") {});
        publisher = new AuthEventPublisher(kafkaTemplate, failingMapper);

        publisher.publishUserRegistered(
                "user-1", "courier@example.com", "Courier One",
                "+94770000000", "COURIER", null, true
        );

        verifyNoInteractions(kafkaTemplate);
        assertThat(output).contains("Failed to serialize user.registered.v1 event for userId=user-1");
    }
}
