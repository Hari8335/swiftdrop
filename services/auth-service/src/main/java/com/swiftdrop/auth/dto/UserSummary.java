package com.swiftdrop.auth.dto;

public record UserSummary(
    String id,
    String email,
    String fullName,
    String phoneNumber,
    String role,
    String merchantId
) {
    public UserSummary(String id, String email, String fullName, String role, String merchantId) {
        this(id, email, fullName, null, role, merchantId);
    }
}
