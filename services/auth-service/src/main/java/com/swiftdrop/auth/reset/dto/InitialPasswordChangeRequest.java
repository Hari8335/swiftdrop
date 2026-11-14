package com.swiftdrop.auth.reset.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InitialPasswordChangeRequest(
        @NotBlank @Size(min = 8, max = 128) String newPassword
) {}
