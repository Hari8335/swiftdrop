package com.swiftdrop.auth.reset.dto;

import com.swiftdrop.auth.dto.UserSummary;

public record ResetPasswordResponse(
    String message,
    String accessToken,
    String tokenType,
    long expiresIn,
    UserSummary user
) {
    public static final String DEFAULT_MESSAGE =
        "Password has been successfully reset.";

    public ResetPasswordResponse() {
        this(DEFAULT_MESSAGE, null, null, 0, null);
    }
}

