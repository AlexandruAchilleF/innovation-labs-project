# SunProof — Energy & Grid Intelligence workspace

The app opens straight into the workspace (no landing page or login). All text is in Romanian. It connects to your FastAPI backend when it can reach it, and uses built-in demo data when it can't.

## Look and feel
- Light slate background, white cards with thin borders, Inter for text, JetBrains Mono (tabular numbers) for every V / kW / kWh / RON / EUR value.
- Status badges in Romanian: Critic (red), Avertizare (amber), Optim (emerald), Info (blue). Raw codes like `CRITICAL` never appear in the UI.
- Sticky header with: the SunProof logo, a switcher for the 3 views, and a status badge ("Live FastAPI Engine" or "Demo Preview Mode").

## Data layer
- `src/lib/api.ts` uses `VITE_API_URL` (default `http://127.0.0.1:8000`) and covers all 7 endpoint groups, with your exact JSON contracts as TypeScript types.
- Each call has a short timeout. If it fails, the app falls back to deterministic mock data that follows the same schemas. A shared flag drives the header badge.
- Mock data:
  - 81 households, including the 5 flagship scenarios (RO-TM-001 … RO-B-005) with the exact numbers from your brief.
  - 1440-minute timeseries generated per scenario, 15-minute meter voltage, 4 neighbors, and 24h OPCOM PZU prices.
  - 8 neighborhoods with feeder topology.
  - Client-side simulations for battery what-if, grid what-if, guardrail checks (number extraction + catching 999), Telegram message, and the PDF dossier (opened as a printable page in demo mode).
- Data is loaded with TanStack Query.

## View 1 — Triaj Portofoliu & Diagnostic
- KPI ribbon with 5 cards. The extrapolation card has a slider from 5k to 50k prosumers that scales EUR/year and MWh/year in a straight line from the 25k baseline.
- Two columns: a 360px sidebar and the main canvas.
  - Sidebar: "★ 5 Cazuri Principale" / "Toată Flota (81)" toggle, a search box, and selectable cards.
  - Canvas, in 4 sections:
    1. Triage header: metadata, the one-line triage banner, a Responsabil badge, and two buttons (PDF dossier, and a Telegram alert that opens a modal).
    2. Three verdict cards: grid vs local fault, battery & PZU, and the invoice–meter–inverter reconciliation.
    3. Two synchronized 24h charts:
       - Inverter voltage vs meter voltage, with a 253V reference line.
       - PV vs PVGIS vs house load, with PZU price on a second axis.
    4. Battery SoC simulator (slider from 5 to 100%, a "20%" button, before/after deltas, SoC curve) and the guardrail panel. The guardrail panel has 4 tabs, a "verified" badge, number pills, and a "Simulează Halucinație" button that shows 999 in red and then the fallback text.

## View 2 — Rețea JT & Cartiere
- 8 neighborhood selector cards.
- A topology picture built in SVG: transformer (PT) → feeders → houses, colored by voltage band and labeled by phase.
- Voltage-along-the-street chart with a 253V line.
- What-if controls (tap position, kVA, phase rebalancing, Volt-Watt, batteries) with a before/after comparison.

## View 3 — Aplicația Prosumatorului
- A centered layout, 900px wide, for the selected household:
  - The customer's question, with a plain-language answer.
  - Energy flow: produced → self-consumed / battery / exported, plus a note on the 0.62 RON/kWh tariff.
  - A step-by-step guide for the inverter brand's app, with the menu path.

## Technical details
- Routes:
  - `/` redirects to `/triaj`.
  - `/triaj?household=` for View 1.
  - `/retea?n=` for View 2.
  - `/prosumator?household=` for View 3.
  - Each route has its own `head()` metadata.
- Packages: `recharts` and `lucide-react` (shadcn components if they aren't already installed).
- Code layout:
  - Components grouped by view under `src/components/sunproof/`.
  - Mock data in `src/lib/mock/`.
  - Severity and responsible-party translations in `src/lib/i18n.ts`.
- Status badge colors are added to `src/styles.css` as theme colors (success / warning / info / critical).
- Tests check the rules: extrapolation scaling (25k → 5,667,168 EUR), guardrail catching 999, the RO-BV-004 billing delta of 312.80 RON, and the API falling back to mock data when fetch fails.
- No backend changes; Lovable Cloud isn't needed.
