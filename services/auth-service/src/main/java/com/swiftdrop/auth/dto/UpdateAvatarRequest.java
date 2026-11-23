package com.swiftdrop.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Body for PUT /api/v1/auth/me/avatar: a base64 image data URL
 * (data:image/png|jpeg|webp;base64,...).
 */
public record UpdateAvatarRequest(
    @NotBlank(message = "Image is required")
    String image
) {}
