package com.swiftdrop.auth.dto;

public record AuthResponse(
    String accessToken,
    String tokenType,
    long expiresIn,
    UserSummary user,
    boolean mustChangePassword
) {
    public AuthResponse(String accessToken, String tokenType, long expiresIn, UserSummary user) {
        this(accessToken, tokenType, expiresIn, user, false);
    }
}
