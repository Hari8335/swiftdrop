# Self-hosted OSRM routing readiness

This is a deployment-readiness plan. It is not active Compose configuration and must not be used to modify the existing QA stack without platform and feature-owner approval.

## Recommended architecture

Use the authenticated Courier Portal flow through a backend-owned proxy:

`Courier browser -> Nginx -> approved navigation endpoint -> OSRM on the private Compose network`

The browser must not call OSRM directly. The proxy owns authentication, parcel authorization, request limits, timeout handling, provider URL configuration, and response normalization. It must never accept an arbitrary upstream URL from a browser request.

The existing frontend `RoutingProvider` remains the seam. `OsrmRoutingProvider` is an inactive adapter targeting the proposed backend proxy path `/api/v1/navigation/route`; it is not registered as the default provider.

Proposed proxy contract:

`GET /api/v1/navigation/route?origin=<lon>,<lat>&destination=<lon>,<lat>`

The proxy should call OSRM with `profile=driving`, `geometries=geojson`, `overview=full`, and `steps=false` for the map route. It should return only the normalized route fields needed by the client: geometry, distance meters, duration seconds, and a provider status. Exact courier coordinates remain available only to authorized viewers.

## Dataset and licensing

Use the current Sri Lanka country extract from Geofabrik, downloaded with its checksum. Keep the source URL and extract timestamp in deployment records. The extract is derived from OpenStreetMap data and must retain ODbL attribution; any redistribution of a derivative database must be reviewed for ODbL share-alike obligations. The map already displays OpenStreetMap attribution.

Do not commit the PBF, generated `.osrm*` files, or provider image layers to Git. Store them in an operator-managed data directory with a documented refresh process.

## Preprocessing

Use the OSRM MLD pipeline and the standard `car.lua` profile:

1. `osrm-extract --profile /opt/car.lua sri-lanka-latest.osm.pbf --output /data/sri-lanka`
2. `osrm-partition /data/sri-lanka.osrm`
3. `osrm-customize /data/sri-lanka.osrm`
4. Run `osrm-routed --algorithm mld /data/sri-lanka.osrm`

The standard car profile is the initial choice; it encodes car access, restrictions, turn penalties, and vehicle assumptions. A courier-specific vehicle profile requires owner review and a fresh preprocessing cycle.

The current host has about 25.5 GB free disk and only about 2.3 GB free physical memory at inspection time. That is not a safe preprocessing margin. As a planning minimum, reserve at least 8 GB available RAM, 4 CPU cores, and 10–20 GB of disposable working/storage headroom; measure the actual generated graph before activation because OSRM output size and peak memory are workload-dependent.

## Adapter validation

`OsrmRoutingProvider` converts OSRM GeoJSON coordinates from `[longitude, latitude]` to Leaflet `[latitude, longitude]`. It rejects `NoRoute`, malformed geometry, out-of-range coordinates, negative/absent distance, and negative/absent duration. The adapter targets the backend proxy rather than a public OSRM demo endpoint.

## Navigation and rerouting policy

- Route only to the verified next stop: pickup before collection, drop-off after collection.
- Accept only finite coordinates in valid geographic ranges.
- Validate route geometry before drawing the blue route.
- Keep provider calls server-side, authenticated, bounded by timeout, and rate-limited.
- Reroute only after sustained off-route distance exceeds a configured threshold plus GPS accuracy; debounce requests and allow only one request in flight.
- Do not expose route history or current courier position to public tracking-number requests.
- Show “route unavailable” rather than drawing a fabricated road route.

Suggested initial policy values for review: 50 m minimum deviation, `max(50 m, accuracyMeters * 1.5)`, 15-second reroute debounce, 10-second provider timeout, and a per-courier request budget. These are proposed defaults, not approved production values.

## Activation checklist

Before activation, obtain approval for:

1. OSRM image version/digest and vulnerability scan.
2. Geofabrik/OSM data refresh and ODbL attribution process.
3. Host resource allocation and persistent data directory.
4. Backend navigation proxy endpoint and owner (M9 platform plus M2/M8 feature owners).
5. Gateway routing and authentication contract.
6. Route request quotas, timeout, cache policy, and rerouting thresholds.
7. Sri Lanka route-quality validation using known courier routes.

The optional Compose file `deploy/routing/docker-compose.osrm.example.yml` is not referenced by the QA Compose project and has not been activated.
