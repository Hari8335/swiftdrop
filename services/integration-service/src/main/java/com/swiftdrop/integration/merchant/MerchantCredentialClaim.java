package com.swiftdrop.integration.merchant;

public record MerchantCredentialClaim(String clientId, String clientSecret) {
    @Override
    public String toString() {
        return "MerchantCredentialClaim[clientId=" + clientId + ", clientSecret=[REDACTED]]";
    }
}
