package com.swiftdrop.integration.merchant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class MerchantCredentialHandoffCryptoTest {
    private static final String KEY = "test-only-key-long-enough-for-aes-gcm-123456";

    @Test
    void encryptsAndBindsHandoffToItsMerchantNotificationAndClient() {
        var crypto = new MerchantCredentialHandoffCrypto(KEY);
        UUID merchantId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        String ciphertext = crypto.encrypt(merchantId, notificationId, "client-1", "sensitive-secret");

        assertThat(ciphertext).doesNotContain("sensitive-secret");
        assertThat(crypto.decrypt(merchantId, notificationId, "client-1", ciphertext)).isEqualTo("sensitive-secret");
        assertThatThrownBy(() -> crypto.decrypt(UUID.randomUUID(), notificationId, "client-1", ciphertext))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Merchant credential handoff encryption failed");
    }

    @Test
    void refusesAnUnconfiguredEncryptionKey() {
        var crypto = new MerchantCredentialHandoffCrypto("");
        assertThatThrownBy(crypto::assertConfigured)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("must be configured");
    }
}
