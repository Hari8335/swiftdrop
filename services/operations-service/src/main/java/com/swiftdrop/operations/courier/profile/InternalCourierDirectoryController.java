package com.swiftdrop.operations.courier.profile;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Internal courier directory for other SwiftDrop services (parcel-service's driver assignment history).
 *
 * <p>Returns only public courier details (name, vehicle type, zone); phone numbers are not exposed.
 * Callers present the shared {@code X-Internal-Service-Token}. The gateway blocks {@code /internal/}
 * from outside, and Spring Security permits this path so the token check below is the guard.
 */
@RestController
@RequestMapping("/internal/v1/couriers")
class InternalCourierDirectoryController {

    static final String INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token";
    static final int MAX_IDS = 50;

    private final CourierProfileRepository profiles;
    private final byte[] expectedToken;

    InternalCourierDirectoryController(
            CourierProfileRepository profiles,
            @Value("${swiftdrop.security.internal.tokens.courier-directory:swiftdrop-internal-courier-secret-2026}")
            String expectedToken) {
        this.profiles = profiles;
        this.expectedToken = expectedToken.getBytes(StandardCharsets.UTF_8);
    }

    /** Profiles of the given courier ids; unknown ids are left out. */
    @GetMapping
    ResponseEntity<List<CourierPublicProfile>> lookup(
            @RequestHeader(value = INTERNAL_TOKEN_HEADER, required = false) String token,
            @RequestParam List<String> ids) {
        if (token == null || !MessageDigest.isEqual(expectedToken, token.trim().getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<String> distinct = ids.stream().filter(id -> id != null && !id.isBlank()).map(String::trim).distinct().toList();
        if (distinct.isEmpty() || distinct.size() > MAX_IDS) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(profiles.findAllById(distinct).stream().map(CourierPublicProfile::from).toList());
    }

    record CourierPublicProfile(String courierId, String name, String vehicleType, String zone) {
        static CourierPublicProfile from(CourierProfileEntity entity) {
            return new CourierPublicProfile(entity.getUserId(), entity.getName(), entity.getVehicleType(), entity.getZone());
        }
    }
}
