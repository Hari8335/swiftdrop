package com.swiftdrop.parcel.parcel;

import com.swiftdrop.parcel.address.AddressDto;
import com.swiftdrop.parcel.address.District;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AddressSnapshot {

    public AddressSnapshot(String line1, String line2, String city, String district, String postalCode) {
        this(line1, line2, city, district, postalCode, null, null);
    }

    @Column(nullable = false, length = 255)
    private String line1;

    @Column(length = 255)
    private String line2;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 50)
    private String district;

    @Column(nullable = false, length = 20)
    private String postalCode;

    @Column(name = "latitude", precision = 9, scale = 6)
    private Double latitude;

    @Column(name = "longitude", precision = 9, scale = 6)
    private Double longitude;

    public static AddressSnapshot from(AddressDto dto) {
        if ((dto.latitude() == null) != (dto.longitude() == null)) {
            throw new IllegalArgumentException("Latitude and longitude must be supplied together");
        }
        return new AddressSnapshot(
                dto.line1().trim(),
                dto.line2() != null ? dto.line2().trim() : null,
                dto.city().trim(),
                District.normalize(dto.district()),
                dto.postalCode().trim(), dto.latitude(), dto.longitude()
        );
    }

    public AddressDto toDto() {
        return new AddressDto(line1, line2, city, district, postalCode, latitude, longitude);
    }
}
