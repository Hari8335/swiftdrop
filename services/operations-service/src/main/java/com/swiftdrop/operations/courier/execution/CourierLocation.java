package com.swiftdrop.operations.courier.execution;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "courier_locations")
@Getter
@Setter
@NoArgsConstructor
public class CourierLocation {
    @Id
    @Column(name = "parcel_id", nullable = false)
    private UUID parcelId;
    @Column(name = "courier_id", nullable = false, length = 64)
    private String courierId;
    @Column(nullable = false)
    private double latitude;
    @Column(nullable = false)
    private double longitude;
    @Column(name = "accuracy_meters", nullable = false)
    private double accuracyMeters;
    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;
    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;
}
