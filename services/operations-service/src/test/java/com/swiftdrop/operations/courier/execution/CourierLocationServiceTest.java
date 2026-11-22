package com.swiftdrop.operations.courier.execution;

import com.swiftdrop.operations.courier.execution.client.ParcelResponse;
import com.swiftdrop.operations.courier.execution.client.ParcelServiceClient;
import com.swiftdrop.operations.courier.execution.dto.CourierLocationRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourierLocationServiceTest {
    @Mock CourierLocationRepository locations;
    @Mock ParcelServiceClient parcels;

    @Test
    void rejectsLocationFromAnotherCourier() {
        UUID parcelId = UUID.randomUUID();
        ParcelResponse parcel = mock(ParcelResponse.class);
        when(parcel.courierId()).thenReturn("courier-a");
        when(parcel.status()).thenReturn("OUT_FOR_DELIVERY");
        when(parcels.getParcel(parcelId)).thenReturn(parcel);

        CourierLocationService service = new CourierLocationService(locations, parcels);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.record(parcelId, "courier-b", request(Instant.now())));

        assertEquals(403, error.getStatusCode().value());
        verifyNoInteractions(locations);
    }

    @Test
    void rejectsOutOfOrderLocation() {
        UUID parcelId = UUID.randomUUID();
        ParcelResponse parcel = mock(ParcelResponse.class);
        when(parcel.courierId()).thenReturn("courier-a");
        when(parcel.status()).thenReturn("OUT_FOR_DELIVERY");
        when(parcels.getParcel(parcelId)).thenReturn(parcel);
        CourierLocation previous = new CourierLocation();
        previous.setParcelId(parcelId); previous.setCourierId("courier-a"); previous.setRecordedAt(Instant.now()); previous.setReceivedAt(Instant.now().minusSeconds(10));
        when(locations.findById(parcelId)).thenReturn(java.util.Optional.of(previous));

        CourierLocationService service = new CourierLocationService(locations, parcels);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.record(parcelId, "courier-a", request(previous.getRecordedAt())));

        assertEquals(409, error.getStatusCode().value());
    }

    private static CourierLocationRequest request(Instant recordedAt) {
        return new CourierLocationRequest(6.9271, 79.8612, 12.0, recordedAt);
    }
}
