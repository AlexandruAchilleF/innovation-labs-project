# Geographic alignment for the demo map

## Intent and agreed source

Place demo houses on real mapped buildings and draw the illustrative network along actual streets. The user selected public map data rather than surveyed house and electrical-network coordinates.

## Approach

Bundle bounded OpenStreetMap building footprints and street geometry for every backend and offline demo neighborhood. Record the source query, extraction date, OSM element identifiers, and attribution with the data. A reproducible import script refreshes the snapshots; opening the app never depends on a public Overpass request.

Persist assignments by canonical dataset, neighborhood, and house ID in the snapshots; never recompute them from a filtered or simulated house list. Map backend and offline dataset IDs explicitly, including their differing centers and house counts. Assign houses to distinct buildings within 1,500 metres of the scenario center, accepting house, detached, semidetached_house, terrace, residential, apartments, and generic building=yes footprints, excluding known nonresidential uses. Prefer matching street names; otherwise use the nearest eligible building beside the connected road component and retain the actual mapped street name as geographic context. Store a point inside each footprint, rather than assuming a polygon centroid is inside a concave building. Keep selection stable across reloads and before/after simulation. Scale roof symbols to fit within the assigned footprint where practical; use a compact centered glyph for narrow footprints.

Construct connected road graphs from mapped road geometry. Anchor the illustrative transformer at a nearby road node and route feeder segments through connected streets to service-drop points beside the assigned buildings. Preserve road bends; never bridge disconnected roads with invented straight trunk lines. Service drops connect the road to the assigned house.

Represent each connection's display route as a variable-length polyline, separate from the existing one-trunk-vertex-per-house calculation. Keep electrical house ordering intact, use the previous house's road attachment as each segment's start, and reverse the complete polyline when flow reverses. All road attachments must be reachable from the illustrative transformer on the same road component.

Keep geographic display geometry separate from electrical simulation parameters. Do not alter feeder membership, electrical distances, impedances, voltage calculations, household identity, or time-series values to make a drawing fit. Use the same resolved house geometry for roofs, heat points, camera focus, and service-drop endpoints.

## Alternatives considered

1. **Bundled OSM snapshots (recommended):** stable, inspectable, works offline; needs a refresh script and bundled bounded geometry.
2. **Fetch OSM whenever the map opens:** smaller bundle, but introduces rate limits, outages, loading shifts, and unstable assignments.
3. **Manually hard-code positions:** initially simple, but difficult to audit and maintain across all neighborhoods.

The user selected public map data; bundling snapshots is the proposed implementation choice.

## Boundaries and missing coverage

OSM streets and buildings establish geographic context, not verified utility feeder connections, transformer positions, customer addresses, or existing solar installations. Display a concise Romanian label: “Amplasare demo pe clădiri OSM · conexiuni electrice ilustrative”, alongside OpenStreetMap attribution.

If mapped buildings or connected roads are insufficient, show an explicit unavailable-geometry state for affected connections; do not silently return to invented coordinates over satellite imagery. Preserve the underlying simulation and other neighborhoods.

Implementation evidence: Overpass requests failed, so the importer uses the official bounded OpenStreetMap map API. All 16 backend/offline dataset snapshots have complete house coverage. Automated tests verify interior anchors and every trunk segment against source street geometry. Dense-city requests retry a smaller bbox when the initial request exceeds the API node limit.

## Validation

Test point-in-footprint placement, unique and deterministic assignments, road-graph connectivity, preservation of intermediate road vertices, correct reversed flow geometry, identical before/after placement, missing-coverage handling, and unchanged simulation inputs. Run frontend tests, targeted lint, and the production build. Inspect representative backend and offline neighborhoods in the browser, including continuous pan/zoom anchoring.

## Scope

Add geographic snapshot/import and resolution modules; integrate them into the map workspace and feature builders. No utility-network accuracy claims, address geocoding of real customers, backend electrical-model changes, new map provider, or live public-data polling.
