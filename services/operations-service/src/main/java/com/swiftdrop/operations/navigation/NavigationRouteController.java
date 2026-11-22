package com.swiftdrop.operations.navigation;

import com.swiftdrop.common.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/navigation")
public class NavigationRouteController {
    private final NavigationRouteService routes;

    public NavigationRouteController(NavigationRouteService routes) { this.routes = routes; }

    @GetMapping("/route")
    public ResponseEntity<NavigationRouteResponse> route(
        @RequestParam UUID parcelId,
        @RequestParam String origin,
        @RequestParam Instant recordedAt
    ) {
        return ResponseEntity.ok(routes.route(parcelId, origin, recordedAt, CurrentUser.require()));
    }
}
