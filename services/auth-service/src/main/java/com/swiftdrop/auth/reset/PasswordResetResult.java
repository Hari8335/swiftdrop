package com.swiftdrop.auth.reset;

import com.swiftdrop.auth.reset.dto.ResetPasswordResponse;

public record PasswordResetResult(
    ResetPasswordResponse response,
    String refreshToken
) {}
