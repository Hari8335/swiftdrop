package com.swiftdrop.parcel.address;

import jakarta.validation.constraints.NotBlank;

public record AddressDto(
    @NotBlank(message = "Address line 1 is required")
    String line1,

    String line2,

    @NotBlank(message = "City is required")
    String city,

    @NotBlank(message = "District is required")
    String district,

    @NotBlank(message = "Postal code is required")
    String postalCode,
    @jakarta.validation.constraints.DecimalMin(value = "-90.0")
    @jakarta.validation.constraints.DecimalMax(value = "90.0")
    Double latitude,
    @jakarta.validation.constraints.DecimalMin(value = "-180.0")
    @jakarta.validation.constraints.DecimalMax(value = "180.0")
    Double longitude
) {
    public AddressDto(String line1, String line2, String city, String district, String postalCode) {
        this(line1, line2, city, district, postalCode, null, null);
    }
}
