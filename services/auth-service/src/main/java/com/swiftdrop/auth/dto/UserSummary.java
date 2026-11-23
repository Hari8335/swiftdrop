package com.swiftdrop.auth.dto;

public record UserSummary(
    String id,
    String email,
    String fullName,
    String phoneNumber,
    String role,
    String merchantId,
    /** Profile picture (or merchant business logo) as an image data URL; null when not set. */
    String avatarUrl
) {
    public UserSummary(String id, String email, String fullName, String phoneNumber, String role, String merchantId) {
        this(id, email, fullName, phoneNumber, role, merchantId, null);
    }

    public UserSummary(String id, String email, String fullName, String role, String merchantId) {
        this(id, email, fullName, null, role, merchantId, null);
    }
}
