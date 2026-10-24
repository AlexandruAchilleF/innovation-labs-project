"""Engine outputs (grid fault, battery, billing verdicts), HouseholdScenario input, complete analysis, portfolio KPIs."""

from __future__ import annotations

from typing import Dict, List, Optional, Union
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator
from sunproof.models.billing_and_battery import (
    CustomerBatteryIntent,
    InverterBatteryConfig,
    MonthlyEnergySummary,
    ProsumerInvoice,
)
from sunproof.models.enums import (
    BatteryMode,
    BatteryVerdictStatus,
    BillingVerdictStatus,
    DistributionOperator,
    GridFaultCause,
    InverterBrand,
    ResponsibleParty,
    SeverityLevel,
)
from sunproof.models.telemetry import (
    InverterMinuteSample,
    NeighborNode,
    OpcomHourlyPrice,
    SmartMeterInterval15m,
)


class OvervoltageEventWindow(BaseModel):
    """A continuous midday window where the inverter suffered derating or overvoltage shutdown."""
    model_config = ConfigDict(extra="forbid")

    start_time: str = Field(..., description="HH:MM when the anomaly began")
    end_time: str = Field(..., description="HH:MM when normal generation resumed")
    duration_minutes: int = Field(..., ge=1)
    peak_inverter_voltage_v: float = Field(..., ge=0.0)
    peak_meter_voltage_v: float = Field(..., ge=0.0)
    internal_cable_voltage_rise_v: float = Field(..., ge=0.0)
    neighbors_tripped_count: int = Field(..., ge=0)
    neighbors_over_250v_count: int = Field(..., ge=0)
    lost_energy_kwh: float = Field(..., ge=0.0)
    error_code: Optional[str] = None


class GridFaultVerdict(BaseModel):
    """
    Deterministic output of Engine 1 (sunproof/engine/grid_fault.py).
    Answers: 'When the panels stopped at midday, was it the grid or the installation?'
    """
    model_config = ConfigDict(extra="forbid")

    cause: GridFaultCause
    severity: SeverityLevel
    responsible_party: ResponsibleParty
    headline_ro: str
    explanation_ro: str
    technical_proof_summary_ro: str
    recommended_action_supplier_ro: str
    recommended_action_customer_ro: str

    # Quantitative evidence
    events: List[OvervoltageEventWindow] = Field(default_factory=list)
    total_trip_minutes_today: int = Field(..., ge=0)
    total_derating_minutes_today: int = Field(default=0, ge=0)
    max_inverter_voltage_v: float = Field(..., ge=0.0)
    max_meter_voltage_v: float = Field(..., ge=0.0)
    voltage_rise_internal_cable_v: float = Field(
        ...,
        ge=0.0,
        description="Difference between inverter terminal voltage and smart meter PCC voltage (V)"
    )
    en50549_legal_limit_v: float = Field(default=253.0, description="230V + 10% legal upper limit (EN 50549-1)")
    configured_trip_threshold_v: float = Field(..., ge=0.0)

    # Neighbor correlation
    neighbors_total: int = Field(..., ge=0)
    neighbors_affected_simultaneously: int = Field(..., ge=0)
    simultaneity_ratio: float = Field(..., ge=0.0, le=1.0)
    affected_neighbor_ids: List[str] = Field(default_factory=list)

    # Energy & Financial impact
    pvgis_expected_today_kwh: float = Field(..., ge=0.0)
    actual_produced_today_kwh: float = Field(..., ge=0.0)
    lost_production_today_kwh: float = Field(..., ge=0.0)
    lost_production_month_est_kwh: float = Field(..., ge=0.0)
    lost_value_customer_month_ron: float = Field(..., ge=0.0)
    avoided_truck_roll_saving_ron: float = Field(
        ...,
        ge=0.0,
        description="Money saved by the supplier/O&M by NOT dispatching a field crew when the grid is at fault"
    )

    # Workflow triggers
    requires_distributor_pdf_dossier: bool = Field(default=False)
    requires_technician_telegram_alert: bool = Field(default=False)
    evidence_status: str = "sufficient"
    avoided_visit_saving_ron: float = Field(default=0.0, ge=0.0)


class BatteryOptimizationVerdict(BaseModel):
    """
    Deterministic output of Engine 2 (sunproof/engine/battery.py).
    Answers: 'Is the battery configured properly, and how much does misconfiguration cost on OPCOM PZU?'
    """
    model_config = ConfigDict(extra="forbid")

    status: BatteryVerdictStatus
    severity: SeverityLevel
    responsible_party: ResponsibleParty
    headline_ro: str
    explanation_ro: str
    step_by_step_fix_ro: List[str] = Field(default_factory=list)

    # Configuration comparison
    has_battery: bool
    battery_model: str
    usable_capacity_kwh: float = Field(..., ge=0.0)
    desired_mode: BatteryMode
    configured_mode: BatteryMode
    desired_min_soc_pct: float = Field(..., ge=0.0, le=100.0)
    configured_min_soc_pct: float = Field(..., ge=0.0, le=100.0)
    locked_unused_soc_pct: float = Field(..., ge=0.0, le=100.0)
    locked_capacity_kwh: float = Field(..., ge=0.0)

    # Daily & Monthly Energy Shift
    midday_grid_export_kwh_today: float = Field(..., ge=0.0)
    evening_peak_grid_import_kwh_today: float = Field(..., ge=0.0)
    evening_battery_discharge_kwh_today: float = Field(..., ge=0.0)
    shiftable_evening_energy_kwh_per_day: float = Field(
        ...,
        ge=0.0,
        description="How many kWh/day could be shifted from midday export to evening consumption by fixing the setting"
    )
    shiftable_evening_energy_kwh_per_month: float = Field(..., ge=0.0)

    # OPCOM PZU Arbitrage & Retail Impact
    avg_midday_pzu_ron_mwh: float = Field(..., ge=0.0)
    avg_evening_pzu_ron_mwh: float = Field(..., ge=0.0)
    pzu_spread_ron_mwh: float = Field(..., ge=0.0)
    supplier_daily_pzu_loss_ron: float = Field(
        ...,
        ge=0.0,
        description="Daily procurement loss suffered by the supplier under 1:1 netting when battery fails to discharge in the evening"
    )
    supplier_monthly_pzu_loss_ron: float = Field(..., ge=0.0)
    supplier_annual_pzu_loss_ron: float = Field(..., ge=0.0)
    customer_monthly_grid_tax_loss_ron: float = Field(
        ...,
        ge=0.0,
        description="Monthly non-compensable distribution/transport tariffs paid by customer on avoidable evening imports"
    )
    supplier_battery_bonus_monthly_ron: float = Field(
        ...,
        ge=0.0,
        description="Monthly bonus the supplier can offer the customer once evening delivery is verified"
    )
    eligible_for_supplier_bonus_now: bool = Field(default=False)
    evening_delivery_verified_today: bool = Field(default=False)
    evidence_status: str = "sufficient"


class BillingReconciliationVerdict(BaseModel):
    """
    Deterministic output of Engine 3 (sunproof/engine/billing.py).
    Answers: 'Is the prosumer invoice accurate against the smart meter and inverter, and how do we explain it?'
    """
    model_config = ConfigDict(extra="forbid")

    status: BillingVerdictStatus
    severity: SeverityLevel
    responsible_party: ResponsibleParty
    headline_ro: str
    call_center_script_ro: str
    customer_explanation_ro: str
    recommended_action_ro: str

    # 3-Way Reconciliation Numbers
    pvgis_expected_kwh: float = Field(..., ge=0.0)
    inverter_production_kwh: float = Field(..., ge=0.0)
    direct_self_consumption_kwh: float = Field(..., ge=0.0)
    self_consumption_ratio_pct: float = Field(..., ge=0.0, le=100.0)
    battery_net_buffered_kwh: float = Field(default=0.0)

    inverter_export_kwh: float = Field(..., ge=0.0)
    meter_export_kwh: float = Field(..., ge=0.0)
    billed_export_kwh: float = Field(..., ge=0.0)
    missing_unbilled_export_kwh: float = Field(..., ge=0.0)

    inverter_import_kwh: float = Field(..., ge=0.0)
    meter_import_kwh: float = Field(..., ge=0.0)
    billed_import_kwh: float = Field(..., ge=0.0)

    # Financial Reconciliation
    billed_payable_ron: float
    correct_payable_ron: float
    financial_discrepancy_ron: float = Field(
        ...,
        description="Difference between billed amount and mathematically verified amount (RON)"
    )
    self_consumption_savings_ron: float = Field(
        ...,
        ge=0.0,
        description="Money the customer already saved this month by consuming solar energy directly in the house"
    )
    anre_complaint_risk_high: bool = Field(default=False)
    evidence_status: str = "sufficient"


class VerifiedTextOutput(BaseModel):
    """
    Output of the AI Text Generator with Deterministic Number Verification Guardrail (sunproof/explainer.py).
    Guarantees that no hallucinated numbers ever reach the customer, operator, or distributor dossier.
    """
    model_config = ConfigDict(extra="forbid")

    document_type: str = Field(..., description="'distributor_complaint' | 'invoice_explanation' | 'battery_guide'")
    text_ro: str = Field(..., description="Final verified Romanian text")
    source: str = Field(..., description="'claude_verified' | 'deterministic_template'")
    guardrail_passed: bool = Field(..., description="True if all numbers in text matched deterministic facts")
    numbers_extracted_from_text: List[float] = Field(default_factory=list)
    unverified_numbers_caught: List[float] = Field(default_factory=list)
    facts_used: Dict[str, Union[float, int, str]] = Field(default_factory=dict)


# ============================================================================
# 5. COMPLETE HOUSEHOLD DIGITAL TWIN & PORTFOLIO AGGREGATION
# ============================================================================

class HouseholdScenario(BaseModel):
    """
    Complete dataset for a single prosumer installation, combining:
    - Technical metadata (POD, transformer ID, inverter brand & capacity, cable specs)
    - Minute-by-minute inverter & neighbor telemetry
    - 15-minute smart meter readings
    - 24-hour OPCOM PZU prices
    - Customer battery intent vs. actual inverter settings
    - Monthly summary & issued invoice
    """
    model_config = ConfigDict(extra="forbid")

    household_id: str = Field(..., description="Unique scenario ID, e.g. 'RO-TM-001'")
    scenario_badge_ro: str = Field(..., description="Short tag for the UI scenario selector")
    customer_name: str
    city: str
    county: str
    street_address: str
    pod_code: str = Field(..., description="Punct de Delimitare / POD code (RO00...)")
    distribution_operator: DistributionOperator
    transformer_id: str = Field(..., description="Low-voltage transformer station ID, e.g. 'PT-04 Dumbrăvița'")
    distance_from_transformer_m: int = Field(..., ge=5, le=2000)
    connection_phase: str = Field(default="L1 (Monofazat 230V)")
    neighborhood_id: Optional[str] = Field(default=None, description="Simulated LV network, e.g. 'NB-TM-DUMBRAVITA'")
    feeder_id: Optional[str] = Field(default=None, description="LV feeder (plecare) the POD is connected to")

    # Equipment metadata
    inverter_brand: InverterBrand
    inverter_model: str
    installed_pv_kw: float = Field(..., gt=0.0)
    configured_overvoltage_trip_v: float = Field(
        default=253.0,
        description="Overvoltage protection threshold currently set in the inverter (EN 50549 standard is 253.0V)"
    )
    internal_ac_cable_section_mm2: float = Field(
        default=6.0,
        description="Cross-section of AC cable between inverter and smart meter panel (mm²)"
    )
    internal_ac_cable_length_m: float = Field(
        default=12.0,
        description="Length of AC cable between inverter and smart meter panel (m)"
    )
    date_analyzed: str = Field(default="2026-08-18")

    # Sub-components
    battery_intent: CustomerBatteryIntent
    battery_config: InverterBatteryConfig
    monthly_summary: MonthlyEnergySummary
    invoice: ProsumerInvoice

    # Time series
    inverter_telemetry: List[InverterMinuteSample] = Field(default_factory=list)
    neighbors: List[NeighborNode] = Field(default_factory=list)
    smart_meter_15m: List[SmartMeterInterval15m] = Field(default_factory=list)
    opcom_pzu_hourly: List[OpcomHourlyPrice] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_time_series_non_empty(self) -> "HouseholdScenario":
        if not self.inverter_telemetry:
            raise ValueError(f"Scenario {self.household_id} must contain inverter_telemetry samples.")
        if not self.smart_meter_15m:
            raise ValueError(f"Scenario {self.household_id} must contain smart_meter_15m intervals.")
        if len(self.opcom_pzu_hourly) != 24:
            raise ValueError(f"Scenario {self.household_id} must contain exactly 24 hourly OPCOM PZU prices.")
        return self


class HouseholdCompleteAnalysis(BaseModel):
    """
    Unified analysis result for a single household returned by the SunProof engine.
    Combines all 3 deterministic verdicts, verified explanations, and financial KPIs.
    """
    model_config = ConfigDict(extra="forbid")

    household_id: str
    scenario_badge_ro: str
    customer_name: str
    city: str
    street_address: str
    pod_code: str
    distribution_operator: DistributionOperator
    transformer_id: str
    inverter_brand: InverterBrand
    inverter_model: str
    installed_pv_kw: float
    date_analyzed: str

    # The 3 core verdicts
    grid_verdict: GridFaultVerdict
    battery_verdict: BatteryOptimizationVerdict
    billing_verdict: BillingReconciliationVerdict

    # Overall triage priority
    overall_severity: SeverityLevel
    primary_responsible_party: ResponsibleParty
    one_line_triage_ro: str

    # Combined financial value
    total_supplier_monthly_benefit_ron: float = Field(
        ...,
        ge=0.0,
        description="Sum of avoided truck rolls + monthly PZU evening peak savings for the supplier"
    )
    total_customer_monthly_benefit_ron: float = Field(
        ...,
        ge=0.0,
        description="Sum of recovered solar production + avoided evening grid taxes + storage bonus + invoice correction"
    )

    # Deterministic fact dictionary for AI Guardrail verification
    deterministic_facts: Dict[str, Union[float, int, str]] = Field(default_factory=dict)

    # Pre-verified generated texts
    distributor_complaint_text: Optional[VerifiedTextOutput] = None
    invoice_explanation_text: Optional[VerifiedTextOutput] = None
    battery_guide_text: Optional[VerifiedTextOutput] = None


class PortfolioSummaryMetrics(BaseModel):
    """
    Aggregated KPIs across the supplier's entire monitored prosumer fleet,
    plus extrapolated impact for a 10,000-prosumer supplier portfolio.
    """
    model_config = ConfigDict(extra="forbid")

    monitored_households_count: int
    grid_fault_households_count: int
    local_fault_households_count: int
    misconfigured_Batteries_count: int = Field(
        ...,
        validation_alias=AliasChoices("misconfigured_batteries_count", "misconfigured_Batteries_count"),
    )
    invoice_issues_count: int

    # Sample fleet totals (RON/month)
    fleet_avoided_truck_rolls_ron: float
    fleet_monthly_pzu_savings_ron: float
    fleet_total_supplier_monthly_value_ron: float
    fleet_total_customer_monthly_value_ron: float
    fleet_anre_complaints_prevented: int

    # Extrapolation for a medium-large Romanian supplier (e.g. 25,000 prosumers)
    extrapolated_prosumers_count: int = 25000
    extrapolated_annual_supplier_savings_eur: float
    extrapolated_evening_peak_shifted_mwh_year: float

    @property
    def misconfigured_batteries_count(self) -> int:
        """Lowercase alias of `misconfigured_Batteries_count` (accepted on input too)."""
        return self.misconfigured_Batteries_count
