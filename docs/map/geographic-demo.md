# Demo map geography

The map bundles a public OpenStreetMap snapshot in `frontend/src/lib/map-geometry.json`.
Each neighborhood records its source URL, query bounding box, retrieval date, source center,
and display center. Each house assignment records its OSM building ID, complete building
footprint, interior anchor, mapped street name, road ID, and street route.

Geography comes from [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
and is distributed under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/).
The map displays attribution. The JSON is available in source as the derived geographic database.

These are synthetic customers assigned to real mapped buildings. Their names, addresses,
solar installations, transformer location and electrical connections are not surveyed facts.
Street routing is an illustration, not verified utility-network topology. The electrical model
continues using its existing distances, equipment and feeder membership.

## Reproduce or refresh

Install the normal Python and frontend dependencies, then run from the repository root:

```sh
.venv/bin/python scripts/import_map_geometry.py
```

The importer reads the backend scenario specifications and bundles the actual frontend offline
scenario generator, rather than duplicating house IDs or random allocation rules. Cached source
XML is stored in the ignored `data/raw/map-geometry/` directory. Use `--refresh` to retrieve new
source data, or `--only NB-DUMBRAVITA` to rebuild one explicit dataset. Refreshing deliberately
may change assignments; regular page loads, filtering and simulations never reassign houses.
Requests run sequentially. Dense-city requests fall back to a smaller bbox when the map API
rejects the initial area. No OSM API requests run in the user's browser.

Road graphs join shared OSM nodes; geometric crossings alone do not connect roads. Buildings
must lie within 1,500 m of the scenario center, beside a road in the transformer's connected
component, with a service drop no longer than 90 m. Road attachments split actual OSM segments,
and shortest paths retain all intermediate bends. Footprint scanlines provide interior points
for concave buildings. Distinct demo houses receive distinct buildings within each dataset.

If a neighborhood or house is unmapped, or a feeder changes, the map explicitly reports missing
coverage and omits affected schematic markers and lines instead of drawing invented positions.
Offline and backend datasets are keyed separately because their IDs and centers differ.

## Verification

```sh
.venv/bin/python -m pytest tests/test_map_geometry_import.py
cd frontend
npm test
npm run build
```

Python tests compare bundled anchors with source footprints and each route segment with the
bundled source road geometry. Frontend tests cover all offline dataset houses, stable placement
across reorder/filter/simulation, reversed power flow, shared heat coordinates, and missing coverage.

## Romania-only basemap

`frontend/src/lib/romania-boundary.json` bundles the Romania feature from Natural Earth's
1:10m Admin 0 countries dataset, retrieved on 2026-10-25. Source URL and license are
recorded in its properties. [Natural Earth data is public domain](https://www.naturalearthdata.com/about/terms-of-use/).
An opaque inverse polygon hides the basemap outside Romania in both satellite and dark
views. Congestion layers sit below that mask, and repeated world copies are disabled.
