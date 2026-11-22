package com.swiftdrop.operations.navigation;

import java.util.List;

public record NavigationRouteResponse(String code, List<Route> routes) {
    public record Route(double distance, double duration, Geometry geometry) {}
    public record Geometry(String type, List<List<Double>> coordinates) {}
}
