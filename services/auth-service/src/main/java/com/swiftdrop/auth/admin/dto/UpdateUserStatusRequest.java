package com.swiftdrop.auth.admin.dto;

public record UpdateUserStatusRequest(
    Boolean enabled,
    String fullName,
    String phoneNumber,
    String email,
    String zone
) {
    public UpdateUserStatusRequest(Boolean enabled) {
        this(enabled, null, null, null, null);
    }

    public UpdateUserStatusRequest(Boolean enabled, String fullName, String phoneNumber, String email) {
        this(enabled, fullName, phoneNumber, email, null);
    }
}
