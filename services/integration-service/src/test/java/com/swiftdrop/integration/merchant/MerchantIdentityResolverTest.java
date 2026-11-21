package com.swiftdrop.integration.merchant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.swiftdrop.common.security.CurrentUser;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class MerchantIdentityResolverTest {
    private static final String DEMO_EMAIL = "merchant@swiftdrop.lk";
    private static final UUID DEMO_MERCHANT_ID = UUID.fromString("5a5bda96-61f7-4de5-b680-0ee204822315");

    private final MerchantRepository merchants = org.mockito.Mockito.mock(MerchantRepository.class);

    @Test
    void resolvesLocalDemoAccountBySignedEmailWhenMerchantClaimIsAbsent() {
        Merchant merchant = new Merchant(DEMO_MERCHANT_ID, "Demo Store", "Demo User", DEMO_EMAIL,
                "+94770000000", null, Instant.now());
        merchant.approve(null);
        when(merchants.findByEmailIgnoreCase(DEMO_EMAIL)).thenReturn(Optional.of(merchant));

        UUID resolved = new MerchantIdentityResolver(merchants, true, DEMO_EMAIL).requireMerchantId(user(
                "sample-user", DEMO_EMAIL, null, "MERCHANT"));

        assertThat(resolved).isEqualTo(DEMO_MERCHANT_ID);
    }

    @Test
    void usesMerchantClaimWithoutLookingUpDemoFallback() {
        UUID merchantId = UUID.randomUUID();

        UUID resolved = new MerchantIdentityResolver(merchants, false, DEMO_EMAIL).requireMerchantId(user(
                "merchant-user", "merchant@example.test", merchantId.toString(), "MERCHANT"));

        assertThat(resolved).isEqualTo(merchantId);
        verifyNoInteractions(merchants);
    }

    @Test
    void rejectsMissingMerchantClaimOutsideLocalDemoAccount() {
        assertThatThrownBy(() -> new MerchantIdentityResolver(merchants, true, DEMO_EMAIL)
                .requireMerchantId(user("other-user", "other@example.test", null, "MERCHANT")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Merchant credentials are required");
        verifyNoInteractions(merchants);
    }

    @Test
    void rejectsMissingMerchantClaimWhenLocalFallbackIsDisabled() {
        assertThatThrownBy(() -> new MerchantIdentityResolver(merchants, false, DEMO_EMAIL)
                .requireMerchantId(user("sample-user", DEMO_EMAIL, null, "MERCHANT")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Merchant credentials are required");
        verifyNoInteractions(merchants);
    }

    @Test
    void rejectsUnapprovedLocalDemoMerchant() {
        Merchant merchant = new Merchant(DEMO_MERCHANT_ID, "Demo Store", "Demo User", DEMO_EMAIL,
                "+94770000000", null, Instant.now());
        when(merchants.findByEmailIgnoreCase(DEMO_EMAIL)).thenReturn(Optional.of(merchant));

        assertThatThrownBy(() -> new MerchantIdentityResolver(merchants, true, DEMO_EMAIL)
                .requireMerchantId(user("sample-user", DEMO_EMAIL, null, "MERCHANT")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Merchant credentials are required");
    }

    @Test
    void rejectsNonMerchantRoleEvenWhenEmailMatchesLocalSample() {
        assertThatThrownBy(() -> new MerchantIdentityResolver(merchants, true, DEMO_EMAIL)
                .requireMerchantId(user("customer-user", DEMO_EMAIL, null, "CUSTOMER")))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(merchants);
    }

    private static CurrentUser user(String id, String email, String merchantId, String role) {
        return new CurrentUser(id, email, role, Set.of(role), merchantId, Set.of("ROLE_" + role));
    }
}
