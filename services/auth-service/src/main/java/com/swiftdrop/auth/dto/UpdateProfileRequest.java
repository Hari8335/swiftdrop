package com.swiftdrop.auth.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    String fullName,

    @Size(max = 32, message = "Phone number cannot exceed 32 characters")
    String phoneNumber,

    String email
) {}

