package com.swiftdrop.auth.admin.dto;

public record UpdateUserStatusRequest(
    Boolean enabled,
    String fullName,
    String phoneNumber,
    String email
) {
    public UpdateUserStatusRequest(Boolean enabled) {
        this(enabled, null, null, null);
    }
}
