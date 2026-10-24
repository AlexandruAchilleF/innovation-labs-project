# Geographic demo alignment implementation plan

> Execute inline using superpowers:executing-plans; approved design governs scope.

**Goal:** Anchor demo houses to OSM buildings and illustrative network routes to streets.
**Spec:** ../specs/2026-10-24-geographic-demo-alignment-design.md
**Architecture:** Bundle source geometry and stable assignments; resolve display geometry separately from electrical parameters. Reuse it across map overlays, camera, heat and feeder features.
**Tech stack:** TypeScript/React, Python standard library import tool, MapLibre, Vitest.

## Tasks
1. Obtain bounded OSM snapshots and create reproducible import/assignment script. Validate real building and road counts and source metadata for every demo center.
2. Add regression tests for interior anchors, stable unique assignments, connected routes retaining bends, reversed flow, missing coverage, and unchanged electrical values. Watch tests fail, implement snapshot resolver and route support, then rerun.
3. Integrate resolved display houses/routes into MapStage, camera and overlay. Include attribution and illustrative connection label; never fall back silently to schematic geometry.
4. Run full frontend tests, targeted lint, production build and browser checks. Request a fresh read-only review and fix material findings.

## Review focus
- Backend/offline IDs differ: explicit dataset keys, complete original house sets.
- Polygons may be concave: anchor inside footprint.
- Roads may be disconnected: only route within transformer component.
- Before/after states may omit or reorder houses: persisted identity mapping.
- Unknown neighborhoods/data failure: explicit unavailable geometry, no invented positions.

## Execution ledger
- Approved source: public map data. Approved design: user said “Ok continue”.
- Ruling: work in current checkout per ongoing user's main-branch workflow; preserve the existing local commit and remote divergence, do not merge or push.
- Public Overpass primary returned HTTP 406; checking mirrors and official bounded OSM map API.

- Complete: official OSM API snapshots for 16 datasets and 340 placements; all source anchors and route segments verified.
- Complete: shared map resolver, road polylines, scaled roof markers, camera/heat/service-drop integration, attribution and missing coverage UI.
- Review: independent gpt-6-astra review found camera retry missing after stale simulation data; regression reproduced (1 fitBounds call instead of 2), fixed by tracking geometry readiness. No other material findings.
- Verification: 30 frontend tests pass; 5 importer/source-geometry tests pass; targeted ESLint, standalone TypeScript checking and production build pass. The Vite strict-option errors were fixed without changing deployment behavior.
- Browser: offline Dumbrăvița inspected over satellite imagery; 19 animated move samples showed maximum anchor drift below 0.001 px. Normalized backend responses from existing local server on port 8011 cover all eight backend neighborhoods with zero missing houses. Fresh backend cold startup on 8000 exceeded the frontend 15 s timeout; no API timeout code was changed.
- Full Python suite: 897 passed in 50.64 s outside the sandbox. Faulthandler identified the sandbox-only stall in the Starlette TestClient async portal during test_index_html_and_health setup; that test passes outside the restriction. No backend production code changed.
- Integration: merged the six latest origin/main commits, retaining responsive map chrome, reduced-motion handling and visible-house camera preservation. Added a regression test for that camera behavior; second independent review found no material issues.
- Repository-wide lint has the same 83 formatting errors and 11 warnings on origin/main and the integrated result; changed-file lint passes.
