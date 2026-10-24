# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, each with its own dashboard:

- **Energy supplier staff** (operations / O&M and customer support). They triage a fleet of prosumer households and decide, per household, who has to act: the distribution operator, the installer, the customer's settings, or supplier billing.
- **Prosumer households** (homeowners with PV and often a battery). They want plain answers: why the inverter stops at midday, whether the battery is actually used in the evening peak, and whether the invoice is correct.

## Product Purpose

For each prosumer household (Romania, August 2026), SunProof answers three questions:

1. Is a midday inverter trip caused by the grid or by the local installation?
2. Is the battery locked out of the expensive evening peak?
3. Is the invoice correct?

Success for the supplier means avoided truck rolls, recovered evening-peak (PZU) value and prevented ANRE complaints. Success for the prosumer means a clear explanation plus the exact setting or step that fixes the problem.

## Positioning

**Deterministic engines decide; text only explains.** The grid-fault, battery and billing verdicts come from deterministic engines. Generated text (LLM or template) only explains numbers those engines already computed. A numeric guardrail rejects any number that is not in the deterministic facts and falls back to a template.

## Operating Context

- **Grid-vs-local proof:** many neighbours on the same transformer tripping at once points to the grid; only this house tripping, with high internal cable voltage rise, points to the local installation.
- **Battery value:** comes from comparing the customer's battery intent with the configured battery settings, priced at the evening PZU price minus the midday PZU price.
- **Billing check:** applies Law 160/2026 (1:1 quantity compensation) and compares inverter readings, the smart meter and the invoice.
- **Supplier outputs:** a PDF dossier for the distributor and an O&M technician alert sent through Telegram.

## Capabilities and Constraints

- **Stack:** FastAPI backend (`sunproof/`) with a React / TanStack Start frontend (`frontend/`). The frontend falls back to deterministic local mocks when the backend is unreachable.
- **Units and limits:** RON, kWh, kW, V. The EN 50549-1 overvoltage limit is 253 V.
- **Supplier capabilities:** fleet triage, LV grid map with congestion and what-if measures, PDF dossier, Telegram alert.
- **Prosumer capabilities:** energy-flow explanation, battery savings, step-by-step fix in the inverter app.

## Brand Commitments

- **Language:** all user-facing UI is in Romanian. Severity, status and responsible-party enums always use the Romanian labels.
- **Visual style:** the Altitude style (`frontend/.claude/skills/altitude-design/DESIGN.md`) is the binding visual direction.

## Evidence on Hand

- **Scenario data:** 81 household scenarios across 8 LV neighbourhoods, served by the backend's scenario API (`sunproof/scenarios.py`).
- **Not on hand:** no real customers, testimonials, deployments, partners or pricing are on record. Future work must not invent them.

## Product Principles

1. Numbers come from the engines; words never introduce a number the engines did not produce.
2. Every verdict names who must act (distributor, installer, customer setting, supplier billing, or no one).
3. Show the proof (voltages, neighbours, prices, meter indexes) next to the conclusion.
4. Speak to each audience in its own terms: technical evidence for the supplier, plain Romanian and concrete steps for the prosumer.
