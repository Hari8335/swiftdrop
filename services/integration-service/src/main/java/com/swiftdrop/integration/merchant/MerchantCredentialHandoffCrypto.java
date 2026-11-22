package com.swiftdrop.integration.merchant;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Encrypts the short-lived portal handoff independently from webhook signing secrets. */
@Component
public class MerchantCredentialHandoffCrypto {
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    private final String configuredKey;
    private final SecureRandom random = new SecureRandom();

    public MerchantCredentialHandoffCrypto(
            @Value("${swiftdrop.merchant.credentials.handoff-encryption-key:}") String configuredKey) {
        this.configuredKey = configuredKey == null ? "" : configuredKey.trim();
    }

    public void assertConfigured() {
        if (configuredKey.length() < 32) {
            throw new IllegalStateException("Merchant credential handoff encryption key must be configured with at least 32 characters");
        }
    }

    public String encrypt(UUID merchantId, UUID notificationId, String clientId, String secret) {
        return crypt(Cipher.ENCRYPT_MODE, merchantId, notificationId, clientId, secret, null);
    }

    public String decrypt(UUID merchantId, UUID notificationId, String clientId, String ciphertext) {
        return crypt(Cipher.DECRYPT_MODE, merchantId, notificationId, clientId, null, ciphertext);
    }

    private String crypt(int mode, UUID merchantId, UUID notificationId, String clientId, String plaintext, String ciphertext) {
        assertConfigured();
        try {
            byte[] key = MessageDigest.getInstance("SHA-256").digest(configuredKey.getBytes(StandardCharsets.UTF_8));
            byte[] iv = new byte[IV_BYTES];
            byte[] input;
            if (mode == Cipher.ENCRYPT_MODE) {
                random.nextBytes(iv);
                input = plaintext.getBytes(StandardCharsets.UTF_8);
            } else {
                byte[] packed = Base64.getDecoder().decode(ciphertext);
                if (packed.length <= IV_BYTES) throw new IllegalArgumentException("Invalid encrypted handoff");
                iv = java.util.Arrays.copyOfRange(packed, 0, IV_BYTES);
                input = java.util.Arrays.copyOfRange(packed, IV_BYTES, packed.length);
            }

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(mode, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD((merchantId + ":" + notificationId + ":" + clientId).getBytes(StandardCharsets.UTF_8));
            byte[] result = cipher.doFinal(input);
            if (mode == Cipher.ENCRYPT_MODE) {
                return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + result.length).put(iv).put(result).array());
            }
            return new String(result, StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("Merchant credential handoff encryption failed", exception);
        }
    }
}
