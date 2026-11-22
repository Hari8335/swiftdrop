package com.swiftdrop.operations.navigation;

import com.swiftdrop.common.security.CurrentUser;
import com.swiftdrop.operations.courier.execution.client.AddressDto;
import com.swiftdrop.operations.courier.execution.client.ParcelResponse;
import com.swiftdrop.operations.courier.execution.client.ParcelServiceClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NavigationRouteServiceTest {
    @Mock ParcelServiceClient parcels;
    @Mock OsrmRoutingClient osrm;

    @Test
    void routesAssignedCourierToTheCurrentNextStop() {
        UUID parcelId = UUID.randomUUID();
        ParcelResponse parcel = parcel(parcelId, "courier-1", "customer-1", "OUT_FOR_DELIVERY", true, true);
        when(parcels.getParcel(parcelId)).thenReturn(parcel);
        NavigationRouteResponse expected = routeResponse();
        when(osrm.route(6.9271, 79.8612, 6.9344, 79.8428)).thenReturn(expected);

        NavigationRouteResponse actual = service().route(parcelId, "79.8612,6.9271", Instant.now(), courier("courier-1"));

        assertEquals(expected, actual);
    }

    @Test
    void rejectsAParcelAssignedToAnotherCourier() {
        UUID parcelId = UUID.randomUUID();
        when(parcels.getParcel(parcelId)).thenReturn(parcel(parcelId, "courier-1", "customer-1", "OUT_FOR_DELIVERY", true, true));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service().route(parcelId, "79.8612,6.9271", Instant.now(), courier("courier-2")));

        assertEquals(403, error.getStatusCode().value());
    }

    @Test
    void rejectsInvalidOriginAndMissingDestination() {
        UUID parcelId = UUID.randomUUID();
        when(parcels.getParcel(parcelId)).thenReturn(parcel(parcelId, "courier-1", "customer-1", "OUT_FOR_DELIVERY", true, false));

        ResponseStatusException invalidOrigin = assertThrows(ResponseStatusException.class,
            () -> service().route(parcelId, "6.9271,181.0", Instant.now(), courier("courier-1")));
        assertEquals(400, invalidOrigin.getStatusCode().value());

        ResponseStatusException missingDestination = assertThrows(ResponseStatusException.class,
            () -> service().route(parcelId, "79.8612,6.9271", Instant.now(), courier("courier-1")));
        assertEquals(422, missingDestination.getStatusCode().value());
    }

    @Test
    void rejectsTerminalDeliveries() {
        UUID parcelId = UUID.randomUUID();
        when(parcels.getParcel(parcelId)).thenReturn(parcel(parcelId, "courier-1", "customer-1", "DELIVERED", true, true));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service().route(parcelId, "79.8612,6.9271", Instant.now(), courier("courier-1")));

        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void rateLimitsRepeatedRouteRequestsForTheSameUserAndParcel() {
        UUID parcelId = UUID.randomUUID();
        when(parcels.getParcel(parcelId)).thenReturn(parcel(parcelId, "courier-1", "customer-1", "OUT_FOR_DELIVERY", true, true));
        when(osrm.route(6.9271, 79.8612, 6.9344, 79.8428)).thenReturn(routeResponse());
        NavigationRouteService service = service();

        service.route(parcelId, "79.8612,6.9271", Instant.now(), courier("courier-1"));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.route(parcelId, "79.8612,6.9271", Instant.now(), courier("courier-1")));

        assertEquals(429, error.getStatusCode().value());
    }

    private NavigationRouteService service() {
        return new NavigationRouteService(parcels, osrm, 15_000);
    }

    private static CurrentUser courier(String id) {
        return new CurrentUser(id, null, "COURIER", Set.of("COURIER"), null, Set.of("ROLE_COURIER"));
    }

    private static ParcelResponse parcel(UUID id, String courierId, String customerId, String status, boolean pickup, boolean dropoff) {
        return new ParcelResponse(id, "SD-TEST", status, customerId, null, courierId,
            pickup ? address(6.9271, 79.8612) : address(null, null),
            dropoff ? address(6.9344, 79.8428) : address(null, null),
            1.0, "SMALL", 100.0, 1, null, "Recipient", null, null, null, 1L,
            Instant.now(), Instant.now());
    }

    private static AddressDto address(Double latitude, Double longitude) {
        return new AddressDto("line", null, "Colombo", null, null, latitude, longitude);
    }

    private static NavigationRouteResponse routeResponse() {
        return new NavigationRouteResponse("Ok", List.of(new NavigationRouteResponse.Route(
            1234.0, 456.0,
            new NavigationRouteResponse.Geometry("LineString", List.of(List.of(79.8612, 6.9271), List.of(79.8428, 6.9344)))
        )));
    }
}
