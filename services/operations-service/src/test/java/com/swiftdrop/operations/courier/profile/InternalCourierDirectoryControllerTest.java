package com.swiftdrop.operations.courier.profile;

import com.swiftdrop.operations.OperationsKafkaIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Full security chain: the internal courier directory needs the internal token, not a user JWT. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class InternalCourierDirectoryControllerTest extends OperationsKafkaIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    private static final String TOKEN = "swiftdrop-internal-courier-secret-2026";

    @Autowired MockMvc mockMvc;
    @Autowired CourierProfileRepository profiles;

    @BeforeEach
    void seed() {
        profiles.deleteAll();
        profiles.save(CourierProfileEntity.builder().userId("courier-a").name("Saman Perera")
                .phone("+94771234567").zone("Colombo").availability(true).vehicleType("Motorbike").build());
        profiles.save(CourierProfileEntity.builder().userId("courier-b").name("Nimal Silva")
                .phone("+94777654321").zone("Kandy").availability(false).vehicleType(null).build());
    }

    @Test
    @DisplayName("Returns name, vehicle type and zone for known ids; unknown ids are left out")
    void returnsPublicProfiles() throws Exception {
        mockMvc.perform(get("/internal/v1/couriers")
                        .header("X-Internal-Service-Token", TOKEN)
                        .param("ids", "courier-a", "courier-b", "courier-unknown"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].courierId", containsInAnyOrder("courier-a", "courier-b")))
                .andExpect(jsonPath("$[?(@.courierId == 'courier-a')].name").value("Saman Perera"))
                .andExpect(jsonPath("$[?(@.courierId == 'courier-a')].vehicleType").value("Motorbike"))
                .andExpect(jsonPath("$[?(@.courierId == 'courier-a')].zone").value("Colombo"));
    }

    @Test
    @DisplayName("Never exposes phone numbers")
    void omitsPhoneNumbers() throws Exception {
        mockMvc.perform(get("/internal/v1/couriers")
                        .header("X-Internal-Service-Token", TOKEN)
                        .param("ids", "courier-a"))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("phone"))))
                .andExpect(content().string(not(containsString("+9477"))));
    }

    @Test
    @DisplayName("Rejects a missing or wrong internal token with 401")
    void rejectsMissingOrWrongToken() throws Exception {
        mockMvc.perform(get("/internal/v1/couriers").param("ids", "courier-a"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/internal/v1/couriers")
                        .header("X-Internal-Service-Token", "wrong")
                        .param("ids", "courier-a"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Rejects more than 50 ids with 400")
    void rejectsTooManyIds() throws Exception {
        String ids = IntStream.rangeClosed(1, 51).mapToObj(i -> "c" + i).collect(Collectors.joining(","));
        mockMvc.perform(get("/internal/v1/couriers")
                        .header("X-Internal-Service-Token", TOKEN)
                        .param("ids", ids))
                .andExpect(status().isBadRequest());
    }
}
