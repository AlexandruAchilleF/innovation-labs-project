# SunProof — Prosumer & Grid Intelligence Engine

Answers 3 questions per prosumer household (Romania, Aug 2026): (1) is a midday inverter trip the grid or the
local installation? (2) is the battery locked out of the expensive evening peak? (3) is the invoice correct?
Deterministic engines decide; text (LLM or template) only explains numbers the engines already computed.

## Commands
- Python: `.venv/bin/python` (3.14). Tests: `.venv/bin/python -m pytest -q --tb=short` (~16 s; 900 passed).
- Run API + UI: `.venv/bin/uvicorn sunproof.app:app --reload` (env: `SUNPROOF_USE_LLM=1` + `ANTHROPIC_API_KEY` for LLM
  texts, `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` for real alerts; otherwise templates / simulated alerts).
- Run full demo: `./scripts/run_demo.sh` (FastAPI backend :8000 + React 19 Frontend :3000).

## GOLDEN RULE: CONTEXT BUDGET (read this before opening any file)
1. FIRST read `.claude/context/contracts_cheatsheet.md`: exact fields of every input/output model,
   the public data API and the frozen signature of every module still to implement. It replaces reading the models.
2. FORBIDDEN to read (or grep -A through) these when working on `sunproof/engine/*`, `explainer.py`,
   `pdf_dossier.py`, `telegram_bot.py`, `app.py`, `static/index.html`:
   `sunproof/data/*`, `sunproof/neighborhoods.py`, `sunproof/grid.py` (simulation internals, ~2.4k lines).
3. Get data ONLY through the public API of `sunproof/scenarios.py` (`get_all_scenarios`, `get_scenario_by_id`, ...).
4. If a field's meaning is unclear, read ONLY the single class: `grep -n "class X" sunproof/models/*.py`, then
   `sed -n` that range. Never read a whole file when a 40-line slice answers the question.
5. Never print scenario telemetry (1440 rows/household); aggregate in code and print summaries.
6. Edit only the files you own (see roadmap in the cheatsheet). Do not touch models or `scenarios.py` signatures;
   if a contract must change, stop and report instead of editing.
7. MONOREPO ISOLATION: When working on backend (`sunproof/`), DO NOT inspect or grep `frontend/`.
   When working on UI, run Claude directly inside `frontend/` (using its isolated `frontend/CLAUDE.md`).

## File map (lines) — keep each file < 250 lines when adding code
```
sunproof/
  __init__.py                    10   version + docstring
  scenarios.py                  120   PUBLIC FACADE (cached fleet API)  <- the only data entry point
  models/                       (re-exported by __init__: `from sunproof.models import X`)
    __init__.py                 107   __all__ with all 45 models/enums
    enums.py                    136   InverterBrand, DistributionOperator, InverterStatus, BatteryMode,
                                      SettlementRegime, GridFaultCause, Battery/BillingVerdictStatus, SeverityLevel,
                                      ResponsibleParty, PriceZone, GridPhase, PanelOrientation,
                                      InstallationFault, GridStressCause
    telemetry.py                102   InverterMinuteSample, NeighborMinuteSample, NeighborNode,
                                      SmartMeterInterval15m, OpcomHourlyPrice
    billing_and_battery.py      163   CustomerBatteryIntent, InverterBatteryConfig, MonthlyEnergySummary, ProsumerInvoice
    verdicts.py                 376   OvervoltageEventWindow, Grid/Battery/Billing verdicts, VerifiedTextOutput,
                                      HouseholdScenario, HouseholdCompleteAnalysis, PortfolioSummaryMetrics
    topology.py                 308   LV grid topology + neighborhood results + HouseholdGroundTruth
  data/                               HEAVY, DO NOT READ (see rule 2)
    opcom_and_physics.py        156   constants, OPCOM PZU curve, trace -> inverter/meter/neighbor contracts
    archetypes.py               172   5 curated stories: hand-checked monthly totals + invoices
    scenario_builders.py        256   generated HouseholdScenario builders, ground-truth battery status
    fleet.py                     34   ordered scenario registry + ground truth assembly
    neighborhood_analysis.py     73   neighborhood diagnosis + what-if runner/labels
  grid.py                       838   coupled LV power-flow simulation (DO NOT READ)
  neighborhoods.py             1130   8 neighborhood specs + descriptions + what-if builders (DO NOT READ)
  engine/                             grid_fault.py, battery.py, billing.py, pipeline.py
  explainer.py                  186   numeric guardrail (verify_text_against_facts) + LLM/template texts
  text_templates.py             140   deterministic RO templates, fmt_ro, analysis_facts (guardrail fact set)
  pdf_dossier.py                172   fpdf2 distributor dossier (ASCII transliteration, core fonts)
  telegram_bot.py                94   O&M technician alert (httpx; simulated without env)
  app.py                        204   FastAPI routes
  api_support.py                213   caches, summaries, 5-min downsampling, what-if deltas
static/index.html               183   single-file RO UI (vanilla JS, no CDN)
tests/  test_step1_models_and_scenarios.py (185)  test_neighborhoods.py (241)  test_step2_engines.py (180)
        test_step3_modules.py (196)  test_step3_and_api.py (163)  test_engine_*.py
```

## Domain conventions
- Currency RON, energy kWh, power kW, voltage V. Text fields `*_ro` are Romanian (user-facing).
- EN 50549-1 overvoltage limit 253.0 V; inverter trips at `configured_overvoltage_trip_v`.
- Grid vs local fault: grid = many neighbors on the same transformer rise/trip simultaneously
  (`simultaneity_ratio`); local = only this house, high internal cable voltage rise, healthy neighbors.
- Battery verdicts compare `battery_intent` vs `battery_config`; value = evening PZU price - midday PZU price.
- Billing: Law 160/2026 1:1 quantity compensation; compare inverter vs smart meter vs invoice.
- `battery_power_kw`: + charging, - discharging. Per-minute power conservation holds in all samples.
- Guardrail: any number in generated text must appear in `deterministic_facts`; otherwise fall back to template.
- Romanian-case field quirks: use the lowercase aliases `compensated_active_energy_kwh` /
  `misconfigured_batteries_count` (both casings validate; serialized names keep the capital letter).

## Parallel work (git worktrees)
Three agents, disjoint files, frozen signatures (details in the cheatsheet roadmap):
A = `sunproof/engine/*` | B = `explainer.py`, `pdf_dossier.py`, `telegram_bot.py` | C = `app.py`, `static/index.html`.
Each agent: own branch/worktree, own tests file, run full `pytest -q` before committing, small commits.

## Testing
- Engines are validated against `get_ground_truth(household_id)` (tests only) for all 81 scenarios.
- Prefer assertions on verdict enums and key numbers; avoid snapshotting full models.
- Always use `-q --tb=short` to avoid polluting context windows with verbose tracebacks.
