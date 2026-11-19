package com.swiftdrop.parcel.tracking;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.common.security.dev.DevJwtTokenMinter;
import com.swiftdrop.parcel.parcel.AddressSnapshot;
import com.swiftdrop.parcel.parcel.Parcel;
import com.swiftdrop.parcel.parcel.ParcelRepository;
import com.swiftdrop.parcel.parcel.ParcelSize;
import com.swiftdrop.parcel.parcel.ParcelStatus;
import com.swiftdrop.parcel.parcel.PricingQuoteClient;
import com.swiftdrop.parcel.parcel.StatusHistory;
import com.swiftdrop.parcel.parcel.StatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/** GET /api/v1/parcels/{id}/assignments with the real security chain and database. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("dev")
class DriverAssignmentIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    private static final String OWNER = "c1a2b3c4-0000-4000-8000-0000000000f1";
    private static final String OTHER = "c1a2b3c4-0000-4000-8000-0000000000f2";
    private static final String DRIVER_1 = "c1a2b3c4-0000-4000-8000-0000000000d1";
    private static final String DRIVER_2 = "c1a2b3c4-0000-4000-8000-0000000000d2";
    private static final Instant CREATED_AT = Instant.parse("2026-11-19T08:00:00Z");
    private static final Instant FIRST_ASSIGNED = Instant.parse("2026-11-19T08:05:00Z");
    private static final Instant REASSIGNED = Instant.parse("2026-11-19T09:30:00Z");

    @Autowired private MockMvc mockMvc;
    @Autowired private ParcelRepository parcelRepository;
    @Autowired private StatusHistoryRepository statusHistoryRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private DevJwtTokenMinter tokens;

    @MockBean private PricingQuoteClient pricingQuoteClient;
    @MockBean private CourierDirectoryClient courierDirectory;
    /** No broker in this test: status events are not published. */
    @MockBean private KafkaTemplate<String, Object> kafkaTemplate;

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM parcel_rating");
        statusHistoryRepository.deleteAll();
        parcelRepository.deleteAll();
        when(courierDirectory.findProfiles(any())).thenReturn(Map.of(
                DRIVER_1, new CourierDirectoryClient.DriverProfile(DRIVER_1, "Saman Perera", "Motorbike", "Colombo"),
                DRIVER_2, new CourierDirectoryClient.DriverProfile(DRIVER_2, "Nimal Silva", "Van", "Kandy")));
    }

    /** A parcel with the given assignment reasons, each at the matching time. */
    private Parcel parcel(String trackingNumber, String courierId, List<String> reasons, List<Instant> times) {
        Parcel p = new Parcel();
        p.setTrackingNumber(trackingNumber);
        p.setStatus(ParcelStatus.CREATED);
        p.setCustomerId(OWNER);
        p.setCourierId(courierId);
        p.setPickupAddress(new AddressSnapshot("45 Galle Road", null, "Colombo 03", "Colombo", "00300"));
        p.setDropoffAddress(new AddressSnapshot("12 Temple Road", null, "Kandy", "Kandy", "20000"));
        p.setWeightKg(new BigDecimal("2.50"));
        p.setSize(ParcelSize.MEDIUM);
        p.setFee(new BigDecimal("700.00"));
        p.setRecipientName("Sunil Silva");
        p.setRecipientPhone("0771234567");
        Parcel saved = parcelRepository.saveAndFlush(p);
        List<StatusHistory> rows = new ArrayList<>();
        StatusHistory created = new StatusHistory(saved.getId(), ParcelStatus.CREATED, ParcelStatus.CREATED, OWNER, "Parcel order created");
        created.setCreatedAt(CREATED_AT);
        rows.add(created);
        for (int i = 0; i < reasons.size(); i++) {
            StatusHistory row = new StatusHistory(saved.getId(), ParcelStatus.CREATED, ParcelStatus.CREATED, "dispatcher", reasons.get(i));
            row.setCreatedAt(times.get(i));
            rows.add(row);
        }
        statusHistoryRepository.saveAll(rows);
        return saved;
    }

    private MvcResult call(String parcelId, String token) throws Exception {
        return mockMvc.perform(get("/api/v1/parcels/" + parcelId + "/assignments")
                .header("Authorization", "Bearer " + token)).andReturn();
    }

    @Test
    @DisplayName("Reassigned parcel: both drivers, oldest first, with profile, times and status")
    void reassignedParcel() throws Exception {
        Parcel p = parcel("SD-20261119-DRV001", DRIVER_2,
                List.of("Assigned to courier " + DRIVER_1, "Reassigned to courier " + DRIVER_2 + " from " + DRIVER_1),
                List.of(FIRST_ASSIGNED, REASSIGNED));

        MvcResult result = call(p.getId(), tokens.mintCustomerToken(OWNER));

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        String body = result.getResponse().getContentAsString();
        JsonNode list = objectMapper.readTree(body).get("assignments");
        assertThat(list).hasSize(2);

        assertThat(list.get(0).get("driver").get("name").asText()).isEqualTo("Saman Perera");
        assertThat(list.get(0).get("driver").get("vehicleType").asText()).isEqualTo("Motorbike");
        assertThat(Instant.parse(list.get(0).get("assignedAt").asText())).isEqualTo(FIRST_ASSIGNED);
        assertThat(list.get(0).get("status").asText()).isEqualTo("PREVIOUS");
        assertThat(Instant.parse(list.get(0).get("reassignedAt").asText())).isEqualTo(REASSIGNED);

        assertThat(list.get(1).get("driver").get("name").asText()).isEqualTo("Nimal Silva");
        assertThat(Instant.parse(list.get(1).get("assignedAt").asText())).isEqualTo(REASSIGNED);
        assertThat(list.get(1).get("status").asText()).isEqualTo("CURRENT");
        assertThat(list.get(1).has("reassignedAt")).isTrue();
        assertThat(list.get(1).get("reassignedAt").isNull()).isTrue();

        assertThat(body).doesNotContain(DRIVER_1).doesNotContain(DRIVER_2).doesNotContain("phone");
    }

    @Test
    @DisplayName("Never-assigned parcel returns an empty list")
    void neverAssigned() throws Exception {
        Parcel p = parcel("SD-20261119-DRV002", null, List.of(), List.of());

        MvcResult result = call(p.getId(), tokens.mintCustomerToken(OWNER));

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(objectMapper.readTree(result.getResponse().getContentAsString()).get("assignments")).isEmpty();
    }

    @Test
    @DisplayName("Driver without a profile is still listed, with driver null")
    void driverWithoutProfile() throws Exception {
        when(courierDirectory.findProfiles(any())).thenReturn(Map.of());
        Parcel p = parcel("SD-20261119-DRV003", DRIVER_1,
                List.of("Assigned to courier " + DRIVER_1), List.of(FIRST_ASSIGNED));

        JsonNode list = objectMapper.readTree(call(p.getId(), tokens.mintCustomerToken(OWNER))
                .getResponse().getContentAsString()).get("assignments");

        assertThat(list).hasSize(1);
        assertThat(list.get(0).get("driver").isNull()).isTrue();
        assertThat(list.get(0).get("status").asText()).isEqualTo("CURRENT");
    }

    @Test
    @DisplayName("Same access rule as the history: another customer gets 403, unknown parcel 404")
    void accessRule() throws Exception {
        Parcel p = parcel("SD-20261119-DRV004", DRIVER_1,
                List.of("Assigned to courier " + DRIVER_1), List.of(FIRST_ASSIGNED));

        assertThat(call(p.getId(), tokens.mintCustomerToken(OTHER)).getResponse().getStatus()).isEqualTo(403);
        assertThat(call("00000000-0000-4000-8000-000000000000", tokens.mintCustomerToken(OWNER))
                .getResponse().getStatus()).isEqualTo(404);
        assertThat(mockMvc.perform(get("/api/v1/parcels/" + p.getId() + "/assignments")).andReturn()
                .getResponse().getStatus()).isEqualTo(401);
    }
}
