package com.swiftdrop.operations.courier.execution.client;

public record AddressDto(
    String line1,
    String line2,
    String city,
    String district,
    String postalCode,
    Double latitude,
    Double longitude
) {
    public AddressDto(String line1, String line2, String city, String district, String postalCode) {
        this(line1, line2, city, district, postalCode, null, null);
    }
    public String toSingleLineString() {
        StringBuilder sb = new StringBuilder();
        if (line1 != null && !line1.isBlank()) sb.append(line1);
        if (line2 != null && !line2.isBlank()) sb.append(", ").append(line2);
        if (city != null && !city.isBlank()) sb.append(", ").append(city);
        if (postalCode != null && !postalCode.isBlank()) sb.append(" ").append(postalCode);
        return sb.toString();
    }
}
