# Contracts cheatsheet (exact fields; generated from `sunproof/models/*`)

Import everything from `sunproof.models` (`from sunproof.models import X`). Do NOT open the model files
unless a field's semantics are unclear: then read only the single class you need (`grep -n "class X" sunproof/models/<file>.py`).
Aliases: `ProsumerInvoice` accepts `compensated_active_energy_kwh` or `compensated_Active_energy_kwh`;
`PortfolioSummaryMetrics` accepts `misconfigured_batteries_count` or `misconfigured_Batteries_count`
(lowercase `@property` on both; dump/serialize keeps the capitalized field name).
Models use `extra="forbid"` where declared: never pass unknown keys. Human-readable text fields end in `_ro` (Romanian).

## Public data API (`sunproof/scenarios.py`)
```python
get_all_scenarios() -> list[HouseholdScenario]            # 5 curated stories first, then generated; 81 total
get_scenarios_dict() -> dict[str, HouseholdScenario]
get_scenario_by_id(household_id: str) -> HouseholdScenario  # KeyError if unknown
get_ground_truth(household_id: str) -> HouseholdGroundTruth # TESTS ONLY (what was injected)
build_opcom_pzu_august_curve() -> list[OpcomHourlyPrice]    # 24 hourly PZU prices
get_neighborhoods() -> list[Neighborhood]
get_neighborhood_analysis(neighborhood_id: str) -> NeighborhoodGridAnalysis
get_all_neighborhood_analyses() -> list[NeighborhoodGridAnalysis]
simulate_neighborhood_what_if(neighborhood_id, tap_setting_pct=None, transformer_kva=None,
    feeder_cable_upgrades=None, rebalance_phases=False, enable_volt_watt_all=False,
    fix_all_batteries=False) -> NeighborhoodGridAnalysis
simulate_scenario_with_battery_override(household_id, new_min_soc_pct: float,
    new_mode: BatteryMode | None = None) -> HouseholdScenario
STORY_HOUSEHOLD_IDS = ["RO-TM-001", "RO-IF-002", "RO-CJ-003", "RO-BV-004", "RO-B-005"]
```
Scenario invariants: 1440 inverter samples (1/min), 96 meter intervals (15 min), exactly 24 OPCOM prices,
neighbors = 6..14 consenting clients on the same transformer (anonymized, each with its own 1-min telemetry).
`battery_power_kw`: + = charging, - = discharging. Month = August 2026 (31 days), analyzed day 2026-08-18. Power conservation per minute:
`P_pv + P_import + P_batt_discharge == P_load + P_export + P_batt_charge`.

## INPUTS
### HouseholdScenario  (`sunproof/models/verdicts.py`)
- `household_id: str`
- `scenario_badge_ro: str`
- `customer_name: str`
- `city: str`
- `county: str`
- `street_address: str`
- `pod_code: str`
- `distribution_operator: DistributionOperator`
- `transformer_id: str`
- `distance_from_transformer_m: int`
- `connection_phase: str = 'L1 (Monofazat 230V)'`
- `neighborhood_id: str | None = None`
- `feeder_id: str | None = None`
- `inverter_brand: InverterBrand`
- `inverter_model: str`
- `installed_pv_kw: float`
- `configured_overvoltage_trip_v: float = 253.0`
- `internal_ac_cable_section_mm2: float = 6.0`
- `internal_ac_cable_length_m: float = 12.0`
- `date_analyzed: str = '2026-08-18'`
- `battery_intent: CustomerBatteryIntent`
- `battery_config: InverterBatteryConfig`
- `monthly_summary: MonthlyEnergySummary`
- `invoice: ProsumerInvoice`
- `inverter_telemetry: List[InverterMinuteSample] = <factory>`
- `neighbors: List[NeighborNode] = <factory>`
- `smart_meter_15m: List[SmartMeterInterval15m] = <factory>`
- `opcom_pzu_hourly: List[OpcomHourlyPrice] = <factory>`

### CustomerBatteryIntent  (`sunproof/models/billing_and_battery.py`)
- `goal_description_ro: str`
- `desired_mode: BatteryMode`
- `desired_min_soc_pct: float`
- `evening_discharge_allowed: bool = True`
- `wants_supplier_storage_bonus: bool = True`

### InverterBatteryConfig  (`sunproof/models/billing_and_battery.py`)
- `has_battery: bool = True`
- `battery_brand_model: str = 'Fără baterie'`
- `usable_capacity_kwh: float = 0.0`
- `max_charge_discharge_kw: float = 0.0`
- `configured_mode: BatteryMode = BatteryMode.NO_BATTERY`
- `configured_min_soc_pct: float = 0.0`
- `grid_charge_enabled: bool = False`
- `state_of_health_pct: float = 100.0`
- `app_setting_path_ro: str = ''`

### MonthlyEnergySummary  (`sunproof/models/billing_and_battery.py`)
- `month_label: str`
- `days_in_month: int = 31`
- `pvgis_expected_production_kwh: float`
- `inverter_total_production_kwh: float`
- `inverter_direct_self_consumption_kwh: float`
- `inverter_battery_charged_kwh: float = 0.0`
- `inverter_battery_discharged_kwh: float = 0.0`
- `inverter_reported_export_kwh: float`
- `inverter_reported_import_kwh: float`
- `meter_verified_export_kwh: float`
- `meter_verified_import_kwh: float`
- `meter_previous_export_index: float`
- `meter_current_export_index: float`
- `meter_previous_import_index: float`
- `meter_current_import_index: float`

### ProsumerInvoice  (`sunproof/models/billing_and_battery.py`)
- `invoice_number: str`
- `issue_date: str`
- `billing_period: str`
- `settlement_regime: SettlementRegime = SettlementRegime.QUANTITY_COMPENSATION_UNDER_200KW`
- `billed_import_kwh: float`
- `billed_export_kwh: float`
- `is_export_index_missing_on_bill: bool = False`
- `is_import_estimated: bool = False`
- `compensated_Active_energy_kwh: float`
- `net_billed_active_energy_kwh: float`
- `carried_forward_export_credit_kwh: float = 0.0`
- `active_energy_supply_price_ron_kwh: float`
- `grid_tariffs_and_taxes_ron_kwh: float`
- `total_retail_import_price_ron_kwh: float`
- `total_payable_ron: float`
- `customer_question_ro: str`

### InverterMinuteSample  (`sunproof/models/telemetry.py`)
- `timestamp: str`
- `minute_of_day: int`
- `ac_voltage_v: float`
- `grid_frequency_hz: float = 50.0`
- `pv_power_kw: float`
- `pvgis_expected_kw: float`
- `house_load_kw: float`
- `battery_power_kw: float = 0.0`
- `battery_soc_pct: float = 0.0`
- `grid_import_kw: float`
- `grid_export_kw: float`
- `status: InverterStatus = InverterStatus.NORMAL`
- `error_code: str | None = None`

### NeighborNode  (`sunproof/models/telemetry.py`)
- `neighbor_id: str`
- `anonymized_label: str`
- `distance_from_transformer_m: int`
- `inverter_brand: InverterBrand`
- `installed_kw: float`
- `phase: str = 'L1'`
- `feeder_id: str | None = None`
- `telemetry: List[NeighborMinuteSample] = <factory>`

### NeighborMinuteSample  (`sunproof/models/telemetry.py`)
- `timestamp: str`
- `minute_of_day: int`
- `ac_voltage_v: float`
- `pv_power_kw: float`
- `expected_kw: float`
- `status: InverterStatus = InverterStatus.NORMAL`

### SmartMeterInterval15m  (`sunproof/models/telemetry.py`)
- `interval_index: int`
- `interval_start: str`
- `interval_end: str`
- `active_import_kwh: float`
- `active_export_kwh: float`
- `meter_voltage_avg_v: float`

### OpcomHourlyPrice  (`sunproof/models/telemetry.py`)
- `hour: int`
- `interval_label: str`
- `pzu_price_ron_mwh: float`
- `pzu_price_ron_kwh: float`
- `zone: PriceZone`


### Neighborhood inputs (only for app.py/UI neighborhood views)
### Neighborhood  (`sunproof/models/topology.py`)
- `neighborhood_id: str`
- `name_ro: str`
- `city: str`
- `county: str`
- `county_code: str`
- `latitude: float`
- `longitude: float`
- `description_ro: str`
- `designed_stress_cause: GridStressCause`
- `transformer: TransformerStation`
- `feeders: List[FeederLine]`
- `houses: List[GridHouse]`
- `cloud_events: List[CloudEvent] = <factory>`

### NeighborhoodGridAnalysis  (`sunproof/models/topology.py`)
- `neighborhood_id: str`
- `name_ro: str`
- `city: str`
- `county: str`
- `latitude: float`
- `longitude: float`
- `description_ro: str`
- `date_analyzed: str`
- `what_if_label_ro: str | None = None`
- `transformer_id: str`
- `transformer_name: str`
- `rated_kva: float`
- `tap_setting_pct: float`
- `distribution_operator: DistributionOperator`
- `stress_cause: GridStressCause`
- `houses_total: int`
- `pv_houses: int`
- `battery_houses: int`
- `monitored_households: int`
- `monitored_household_ids: List[str]`
- `installed_pv_kw: float`
- `pv_to_transformer_ratio_pct: float`
- `phase_installed_pv_kw: Dict[str, float]`
- `max_voltage_v: float`
- `max_voltage_time: str`
- `min_voltage_v: float`
- `min_voltage_time: str`
- `minutes_above_253v: int`
- `peak_phase_voltage_v: Dict[str, float]`
- `houses_tripped: int`
- `trip_events_total: int`
- `lost_energy_kwh: float`
- `peak_reverse_power_kw: float`
- `peak_reverse_loading_pct: float`
- `peak_reverse_time: str`
- `peak_voltage_minute: int`
- `headline_ro: str`
- `explanation_ro: str`
- `recommended_distributor_action_ro: str`
- `feeders: List[FeederDaySummary]`
- `houses: List[HouseDaySummary]`
- `transformer_timeseries: List[TransformerMinuteSample]`
- `voltage_profile_at_peak: List[VoltageProfilePoint]`


## OUTPUTS (engines must produce these, field-for-field)
### OvervoltageEventWindow  (`sunproof/models/verdicts.py`)
- `start_time: str`
- `end_time: str`
- `duration_minutes: int`
- `peak_inverter_voltage_v: float`
- `peak_meter_voltage_v: float`
- `internal_cable_voltage_rise_v: float`
- `neighbors_tripped_count: int`
- `neighbors_over_250v_count: int`
- `lost_energy_kwh: float`
- `error_code: str | None = None`

### GridFaultVerdict  (`sunproof/models/verdicts.py`)
- `cause: GridFaultCause`
- `severity: SeverityLevel`
- `responsible_party: ResponsibleParty`
- `headline_ro: str`
- `explanation_ro: str`
- `technical_proof_summary_ro: str`
- `recommended_action_supplier_ro: str`
- `recommended_action_customer_ro: str`
- `events: List[OvervoltageEventWindow] = <factory>`
- `total_trip_minutes_today: int`
- `total_derating_minutes_today: int = 0`
- `max_inverter_voltage_v: float`
- `max_meter_voltage_v: float`
- `voltage_rise_internal_cable_v: float`
- `en50549_legal_limit_v: float = 253.0`
- `configured_trip_threshold_v: float`
- `neighbors_total: int`
- `neighbors_affected_simultaneously: int`
- `simultaneity_ratio: float`
- `affected_neighbor_ids: List[str] = <factory>`
- `pvgis_expected_today_kwh: float`
- `actual_produced_today_kwh: float`
- `lost_production_today_kwh: float`
- `lost_production_month_est_kwh: float`
- `lost_value_customer_month_ron: float`
- `avoided_truck_roll_saving_ron: float`
- `requires_distributor_pdf_dossier: bool = False`
- `requires_technician_telegram_alert: bool = False`

### BatteryOptimizationVerdict  (`sunproof/models/verdicts.py`)
- `status: BatteryVerdictStatus`
- `severity: SeverityLevel`
- `responsible_party: ResponsibleParty`
- `headline_ro: str`
- `explanation_ro: str`
- `step_by_step_fix_ro: List[str] = <factory>`
- `has_battery: bool`
- `battery_model: str`
- `usable_capacity_kwh: float`
- `desired_mode: BatteryMode`
- `configured_mode: BatteryMode`
- `desired_min_soc_pct: float`
- `configured_min_soc_pct: float`
- `locked_unused_soc_pct: float`
- `locked_capacity_kwh: float`
- `midday_grid_export_kwh_today: float`
- `evening_peak_grid_import_kwh_today: float`
- `evening_battery_discharge_kwh_today: float`
- `shiftable_evening_energy_kwh_per_day: float`
- `shiftable_evening_energy_kwh_per_month: float`
- `avg_midday_pzu_ron_mwh: float`
- `avg_evening_pzu_ron_mwh: float`
- `pzu_spread_ron_mwh: float`
- `supplier_daily_pzu_loss_ron: float`
- `supplier_monthly_pzu_loss_ron: float`
- `supplier_annual_pzu_loss_ron: float`
- `customer_monthly_grid_tax_loss_ron: float`
- `supplier_battery_bonus_monthly_ron: float`
- `eligible_for_supplier_bonus_now: bool = False`
- `evening_delivery_verified_today: bool = False`

### BillingReconciliationVerdict  (`sunproof/models/verdicts.py`)
- `status: BillingVerdictStatus`
- `severity: SeverityLevel`
- `responsible_party: ResponsibleParty`
- `headline_ro: str`
- `call_center_script_ro: str`
- `customer_explanation_ro: str`
- `recommended_action_ro: str`
- `pvgis_expected_kwh: float`
- `inverter_production_kwh: float`
- `direct_self_consumption_kwh: float`
- `self_consumption_ratio_pct: float`
- `battery_net_buffered_kwh: float = 0.0`
- `inverter_export_kwh: float`
- `meter_export_kwh: float`
- `billed_export_kwh: float`
- `missing_unbilled_export_kwh: float`
- `inverter_import_kwh: float`
- `meter_import_kwh: float`
- `billed_import_kwh: float`
- `billed_payable_ron: float`
- `correct_payable_ron: float`
- `financial_discrepancy_ron: float`
- `self_consumption_savings_ron: float`
- `anre_complaint_risk_high: bool = False`

### VerifiedTextOutput  (`sunproof/models/verdicts.py`)
- `document_type: str`
- `text_ro: str`
- `source: str`
- `guardrail_passed: bool`
- `numbers_extracted_from_text: List[float] = <factory>`
- `unverified_numbers_caught: List[float] = <factory>`
- `facts_used: Dict[str, float | int | str] = <factory>`

### HouseholdCompleteAnalysis  (`sunproof/models/verdicts.py`)
- `household_id: str`
- `scenario_badge_ro: str`
- `customer_name: str`
- `city: str`
- `street_address: str`
- `pod_code: str`
- `distribution_operator: DistributionOperator`
- `transformer_id: str`
- `inverter_brand: InverterBrand`
- `inverter_model: str`
- `installed_pv_kw: float`
- `date_analyzed: str`
- `grid_verdict: GridFaultVerdict`
- `battery_verdict: BatteryOptimizationVerdict`
- `billing_verdict: BillingReconciliationVerdict`
- `overall_severity: SeverityLevel`
- `primary_responsible_party: ResponsibleParty`
- `one_line_triage_ro: str`
- `total_supplier_monthly_benefit_ron: float`
- `total_customer_monthly_benefit_ron: float`
- `deterministic_facts: Dict[str, float | int | str] = <factory>`
- `distributor_complaint_text: VerifiedTextOutput | None = None`
- `invoice_explanation_text: VerifiedTextOutput | None = None`
- `battery_guide_text: VerifiedTextOutput | None = None`

### PortfolioSummaryMetrics  (`sunproof/models/verdicts.py`)
- `monitored_households_count: int`
- `grid_fault_households_count: int`
- `local_fault_households_count: int`
- `misconfigured_Batteries_count: int`
- `invoice_issues_count: int`
- `fleet_avoided_truck_rolls_ron: float`
- `fleet_monthly_pzu_savings_ron: float`
- `fleet_total_supplier_monthly_value_ron: float`
- `fleet_total_customer_monthly_value_ron: float`
- `fleet_anre_complaints_prevented: int`
- `extrapolated_prosumers_count: int = 25000`
- `extrapolated_annual_supplier_savings_eur: float`
- `extrapolated_evening_peak_shifted_mwh_year: float`


## Ground truth (tests only)
### HouseholdGroundTruth  (`sunproof/models/topology.py`)
- `household_id: str`
- `neighborhood_id: str`
- `installation_fault: InstallationFault`
- `grid_cause: GridFaultCause`
- `battery_status: BatteryVerdictStatus`
- `billing_status: BillingVerdictStatus`


## Enums (member names; values are lowercase/str, see `sunproof/models/enums.py` only if needed)
- `InverterBrand`: HUAWEI | DEYE | FRONIUS | GROWATT | SOLAREDGE | SMA | VICTRON
- `DistributionOperator`: if_reteaua_electrica | RETRASIB_DEER | DISTRI_OLTENIA | DELGAZ_GRID
- `InverterStatus`: NORMAL | DERATING | TRIPPED_OVERVOLTAGE | STANDBY_NIGHT | OFFLINE
- `BatteryMode`: MAX_SELF_CONSUMPTION | BACKUP_RESERVE | TIME_OF_USE | FORCED_CHARGE_FROM_GRID | NO_BATTERY
- `SettlementRegime`: QUANTITY_COMPENSATION_UNDER_200KW | QUANTITY_COMPENSATION_200_400KW | FINANCIAL_SETTLEMENT_PZU_WEIGHTED | POST_2027_HOURLY_SETTLEMENT
- `GridFaultCause`: NONE | GRID_OVERVOLTAGE | LOCAL_OVERVOLTAGE_SENSITIVITY | LOCAL_CABLE_IMPEDANCE | LOCAL_EQUIPMENT_FAULT
- `BatteryVerdictStatus`: NO_BATTERY | OPTIMAL | MISCONFIGURED_SOC_RESERVE | MISCONFIGURED_MODE | UNDERPERFORMING_CAPACITY
- `BillingVerdictStatus`: INVOICE_VALID_EXPLAINED | MISSING_EXPORT_INDEX | ESTIMATED_INDEX_OVERCHARGE | METER_INVERTER_DISCREPANCY
- `SeverityLevel`: CRITICAL | WARNING | INFO | OK
- `ResponsibleParty`: DISTRIBUTOR | INSTALLER_TECHNICIAN | CUSTOMER_SETTINGS | SUPPLIER_BILLING | NONE
- `PriceZone`: OFF_PEAK | MORNING_PEAK | SOLAR_DIP | EVENING_PEAK
- `GridPhase`: L1 | L2 | L3 | THREE_PHASE
- `PanelOrientation`: SOUTH | EAST | WEST | EAST_WEST
- `InstallationFault`: NONE | WRONG_TRIP_THRESHOLD | UNDERSIZED_AC_CABLE | STRING_FAULT | INVERTER_DEVICE_FAULT | SOILING_DEGRADATION
- `GridStressCause`: NONE | FEEDER_VOLTAGE_RISE | PHASE_IMBALANCE | TRANSFORMER_TAP_HIGH | TRANSFORMER_REVERSE_OVERLOAD

---

# ROADMAP: modules still to implement (frozen signatures, 3 parallel agents, disjoint files)

All functions are PURE and deterministic (no I/O) unless stated. Every `*_ro` text must be Romanian.
Inputs come only from a `HouseholdScenario` (never call `get_ground_truth` outside tests).
Constants: EN 50549-1 limit 253.0 V; analyzed day = `scenario.date_analyzed`; month = 31 days.

## Agent A: engines (owns `sunproof/engine/*`, `tests/test_engine_*.py`)
| File | Main function (exact signature) | Produces |
|---|---|---|
| `sunproof/engine/grid_fault.py` | `def analyze_grid_fault(scenario: HouseholdScenario) -> GridFaultVerdict` | cause GRID vs LOCAL via neighbor simultaneity, internal cable voltage rise, trip events, lost kWh/RON |
| `sunproof/engine/battery.py` | `def analyze_battery(scenario: HouseholdScenario) -> BatteryOptimizationVerdict` | configured vs desired mode/SoC, locked kWh, PZU spread losses, bonus eligibility |
| `sunproof/engine/billing.py` | `def reconcile_billing(scenario: HouseholdScenario) -> BillingReconciliationVerdict` | inverter vs meter vs invoice kWh, correct vs billed RON, ANRE complaint risk |
| `sunproof/engine/pipeline.py` | `def analyze_household(scenario: HouseholdScenario) -> HouseholdCompleteAnalysis` | combines 3 verdicts; fills `deterministic_facts` (every number later quoted in text); text fields left `None` |
| `sunproof/engine/pipeline.py` | `def analyze_portfolio(analyses: list[HouseholdCompleteAnalysis]) -> PortfolioSummaryMetrics` | fleet KPIs + 25,000-prosumer extrapolation |
| `sunproof/engine/__init__.py` | re-exports the five functions above | |

Acceptance: for all 81 scenarios the verdict enums equal `get_ground_truth(id)` (`grid_cause`, `battery_status`, `billing_status`).

## Agent B: text + documents (owns `explainer.py`, `pdf_dossier.py`, `telegram_bot.py`, `tests/test_texts_*.py`)
| File | Main function (exact signature) | Notes |
|---|---|---|
| `sunproof/explainer.py` | `def explain_household(scenario: HouseholdScenario, analysis: HouseholdCompleteAnalysis, *, use_llm: bool = True) -> HouseholdCompleteAnalysis` | returns a copy with `distributor_complaint_text`, `invoice_explanation_text`, `battery_guide_text` filled |
| `sunproof/explainer.py` | `def verify_text(text_ro: str, document_type: str, source: str, facts: dict[str, float \| int \| str]) -> VerifiedTextOutput` | numeric guardrail: every number in the text must exist in `facts`; otherwise `guardrail_passed=False` and fall back to the deterministic template (`source="template"`; LLM = `source="llm"`, Anthropic API, optional, key from `ANTHROPIC_API_KEY`; without it use templates) |
| `sunproof/pdf_dossier.py` | `def build_distributor_dossier_pdf(scenario: HouseholdScenario, analysis: HouseholdCompleteAnalysis) -> bytes` | fpdf2; DejaVu or latin-safe Romanian diacritics; evidence tables from `analysis.grid_verdict` |
| `sunproof/telegram_bot.py` | `def format_technician_alert(scenario: HouseholdScenario, analysis: HouseholdCompleteAnalysis) -> str` | short HTML message |
| `sunproof/telegram_bot.py` | `def send_technician_alert(scenario: HouseholdScenario, analysis: HouseholdCompleteAnalysis, *, dry_run: bool = True) -> dict` | httpx to Telegram Bot API (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`); `dry_run` returns the payload without network |

B depends only on the OUTPUT models; until Agent A lands, build test fixtures by constructing `HouseholdCompleteAnalysis` by hand.

## Agent C: API + UI (owns `sunproof/app.py`, `static/index.html`, `tests/test_app.py`)
| File | Main symbol (exact signature) | Notes |
|---|---|---|
| `sunproof/app.py` | `app: fastapi.FastAPI` | serves `static/` at `/`; run: `uvicorn sunproof.app:app` |
| | `GET /api/households` -> `list[{household_id, customer_name, city, scenario_badge_ro, overall_severity, one_line_triage_ro}]` | |
| | `GET /api/households/{id}/analysis` -> `HouseholdCompleteAnalysis` (texts filled) | 404 on unknown id |
| | `GET /api/households/{id}/timeseries` -> `{minutes: [...], neighbors: [...], pzu: [...]}` (downsampled, for charts) | |
| | `POST /api/households/{id}/battery-override` body `{min_soc_pct: float, mode: BatteryMode \| null}` -> `{before: HouseholdCompleteAnalysis, after: HouseholdCompleteAnalysis}` | uses `simulate_scenario_with_battery_override` |
| | `GET /api/households/{id}/dossier.pdf` -> `application/pdf` | |
| | `POST /api/households/{id}/telegram-alert` -> `dict` (dry-run unless env set) | |
| | `GET /api/portfolio` -> `PortfolioSummaryMetrics` | |
| | `GET /api/neighborhoods` / `GET /api/neighborhoods/{id}` -> `NeighborhoodGridAnalysis` | |
| `static/index.html` | single self-contained file (no build step) | fleet list, 3-verdict household view, voltage/power charts, battery-override slider, portfolio KPIs |

C imports ONLY: `sunproof.scenarios`, `sunproof.models`, `sunproof.engine` (`analyze_household`, `analyze_portfolio`),
`sunproof.explainer.explain_household`, `sunproof.pdf_dossier.build_distributor_dossier_pdf`,
`sunproof.telegram_bot.send_technician_alert`. Until those exist, guard with local stubs that raise `NotImplementedError`.
