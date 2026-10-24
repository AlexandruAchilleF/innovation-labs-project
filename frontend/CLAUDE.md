# SunProof Frontend (React + Vite + Lovable)

Self-contained UI for SunProof Prosumer & Grid Intelligence.

## Scope & Monorepo Boundary
- **FRONTEND ONLY**: Work exclusively inside `frontend/`.
- **DO NOT** inspect or read `../sunproof/` (Python backend) or run pytest. All business rules and mock fallbacks are local to `frontend/src/`.

## Key Commands
- Dev server: `bun dev` (or `npm run dev`) -> http://127.0.0.1:8080
- Run tests: `bun test` (or `npm test`)
- Lint: `bun run lint`

## Architecture
- **API with deterministic fallback**: `src/lib/api.ts` (`withFallback`) calls FastAPI (`VITE_API_URL`) and falls back to mocks in `src/lib/mock/` so preview always works offline.
- **Pure business rules**: `src/lib/sim.ts` contains battery/grid what-if and guardrail logic; tested via `src/test/sunproof-rules.test.ts`.
- **Map workspace** (`/harta`, the default route): MapLibre GL with raster basemaps (Esri imagery / CARTO dark, no API key).
  `src/lib/geo.ts` turns backend `x_m`/`y_m` (metres from the PT) + neighborhood lat/lon into coordinates and computes
  per-15-min congestion (transformer loading, feeder loading, voltage headroom); `src/lib/geo-features.ts` builds the GeoJSON.
  Mocks lack geometry, so every accessor has a deterministic fallback. maplibre-gl is imported dynamically (client-only, SSR-safe).
- **Layout**: `components/sunproof/shell` (icon rail + top bar), `workspace/` (case panel | map stage | network panel),
  `map/` (canvas, layers, HTML overlay with `SolarRoof` 2D houses built from the `equipment.tsx` models: PV array, inverter, battery, smart meter, low-zoom `HousePin`). `/retea` redirects to `/harta`.
- **Localization**: Severity, status, and responsible party enums must use Romanian labels from `src/lib/i18n.ts`. Never render raw enums.
- **Git safety**: Connected to Lovable — avoid force-pushing or amending published commits.

## Design
- Visual style is **Altitude** (dark financial editorial): invoke the `altitude-design` skill
  (`.claude/skills/altitude-design/`) before any styling work.
