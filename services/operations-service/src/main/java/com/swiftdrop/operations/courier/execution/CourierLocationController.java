package com.swiftdrop.operations.courier.execution;

import com.swiftdrop.common.security.CurrentUser;
import com.swiftdrop.operations.courier.execution.dto.CourierLocationRequest;
import com.swiftdrop.operations.courier.execution.dto.CourierLocationResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class CourierLocationController {
    private final CourierLocationService locations;
    public CourierLocationController(CourierLocationService locations) { this.locations = locations; }

    @PostMapping("/courier/deliveries/{parcelId}/location")
    public ResponseEntity<CourierLocationResponse> update(@PathVariable UUID parcelId, @Valid @RequestBody CourierLocationRequest request, Principal principal) {
        String courierId = CurrentUser.get().map(CurrentUser::userId).orElseGet(principal::getName);
        return ResponseEntity.ok(locations.record(parcelId, courierId, request));
    }

    @GetMapping("/parcels/{parcelId}/location/latest")
    public ResponseEntity<CourierLocationResponse> latest(@PathVariable UUID parcelId) {
        CourierLocationResponse location = locations.latest(parcelId, CurrentUser.require());
        return location == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(location);
    }
}
