package com.swiftdrop.integration.merchant;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@TestPropertySource(properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration"
})
class MerchantProfileIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private MockMvc mockMvc;
    @Autowired private MerchantRepository merchantRepository;
    @Autowired private MerchantOrderRepository orderRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    @MockitoBean private JwtDecoder jwtDecoder;
    @MockitoBean private ParcelClient parcelClient;

    private UUID acme;
    private UUID bravo;

    @BeforeEach
    void setup() {
        jdbcTemplate.update("delete from idempotency_keys");
        orderRepository.deleteAll();
        merchantRepository.deleteAll();
        acme = createMerchant("Acme Stores (Pvt) Ltd", "Alice Perera", "alice@acme.test", true);
        bravo = createMerchant("Bravo Goods", "Bob Silva", "bob@bravo.test", false);
    }

    private UUID createMerchant(String businessName, String contactName, String email, boolean approve) {
        Merchant merchant = new Merchant(UUID.randomUUID(), businessName, contactName, email,
                "+94771234567", "PV-12345", Instant.now());
        if (approve) {
            merchant.approve("client-" + UUID.randomUUID());
        }
        return merchantRepository.saveAndFlush(merchant).getId();
    }

    private MockHttpServletRequestBuilder merchantGet(UUID merchantId) {
        return get("/api/v1/merchant/profile").with(jwt().jwt(token -> token
                .subject("user-" + merchantId)
                .claim("role", "MERCHANT")
                .claim("roles", List.of("ROLE_MERCHANT"))
                .claim("merchantId", merchantId.toString()))
                // MockMvc's jwt() bypasses the app's JwtAuthenticationConverter; grant the mapped role explicitly.
                .authorities(new SimpleGrantedAuthority("ROLE_MERCHANT")));
    }

    @Test
    @DisplayName("GET /api/v1/merchant/profile returns the signed-in merchant's business identity only")
    void profile_returnsOwnBusinessName() throws Exception {
        mockMvc.perform(merchantGet(acme))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.merchantId").value(acme.toString()))
                .andExpect(jsonPath("$.businessName").value("Acme Stores (Pvt) Ltd"))
                .andExpect(jsonPath("$.contactName").value("Alice Perera"))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.phoneNumber").doesNotExist())
                .andExpect(jsonPath("$.clientId").doesNotExist())
                .andExpect(jsonPath("$.businessRegistrationNumber").doesNotExist());
    }

    @Test
    @DisplayName("Each merchant sees only its own profile (tenant isolation), including pending merchants")
    void profile_isTenantIsolated() throws Exception {
        mockMvc.perform(merchantGet(bravo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.merchantId").value(bravo.toString()))
                .andExpect(jsonPath("$.businessName").value("Bravo Goods"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Unknown merchant id returns 404")
    void profile_unknownMerchant_notFound() throws Exception {
        mockMvc.perform(merchantGet(UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Non-merchant roles and tokens without a merchantId claim are rejected")
    void profile_requiresMerchantIdentity() throws Exception {
        mockMvc.perform(get("/api/v1/merchant/profile").with(jwt().jwt(token -> token
                        .subject("customer-1")
                        .claim("role", "CUSTOMER")
                        .claim("roles", List.of("ROLE_CUSTOMER"))
                        .claim("merchantId", acme.toString()))
                        .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/merchant/profile").with(jwt().jwt(token -> token
                        .subject("user-x")
                        .claim("role", "MERCHANT")
                        .claim("roles", List.of("ROLE_MERCHANT")))
                        .authorities(new SimpleGrantedAuthority("ROLE_MERCHANT"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/merchant/profile"))
                .andExpect(status().isUnauthorized());
    }
}
