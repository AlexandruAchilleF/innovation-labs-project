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
- **Localization**: Severity, status, and responsible party enums must use Romanian labels from `src/lib/i18n.ts`. Never render raw enums.
- **Git safety**: Connected to Lovable — avoid force-pushing or amending published commits.
