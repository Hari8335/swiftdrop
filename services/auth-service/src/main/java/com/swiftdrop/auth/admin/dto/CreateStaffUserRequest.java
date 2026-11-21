package com.swiftdrop.auth.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateStaffUserRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,

    String password,

    @NotBlank(message = "Full name is required")
    String fullName,

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9]{10,14}$", message = "Phone number must be between 10 and 14 digits, optional leading +")
    String phoneNumber,

    @NotBlank(message = "Role is required")
    String role,

    String zone
) {
    public CreateStaffUserRequest(String email, String password, String fullName, String phoneNumber, String role) {
        this(email, password, fullName, phoneNumber, role, null);
    }
}
