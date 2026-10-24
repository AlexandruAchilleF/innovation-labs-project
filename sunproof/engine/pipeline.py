"""Combines the 3 deterministic engines into one household analysis + fleet KPIs.

`deterministic_facts` is the guardrail source of truth: every number a generated text may quote
must appear here (floats rounded to 2 decimals, enums as their string value).
"""

from enum import Enum
from typing import Dict, List, Union

from pydantic import BaseModel

from sunproof.engine.battery import analyze_battery_optimization
from sunproof.engine.billing import analyze_billing_reconciliation
from sunproof.engine.grid_fault import analyze_grid_fault
from sunproof.models import (
    BatteryVerdictStatus,
    BillingVerdictStatus,
    GridFaultCause,
    HouseholdCompleteAnalysis,
    HouseholdScenario,
    PortfolioSummaryMetrics,
    ResponsibleParty,
    SeverityLevel,
)

Fact = Union[float, int, str]

EXTRAPOLATED_PROSUMERS = 25000
EUR_RON_RATE = 5.10  # approx. BNR reference rate, 2026
_SEVERITY_RANK = {SeverityLevel.OK: 0, SeverityLevel.INFO: 1, SeverityLevel.WARNING: 2, SeverityLevel.CRITICAL: 3}
_LOCAL_CAUSES = {
    GridFaultCause.LOCAL_OVERVOLTAGE_SENSITIVITY,
    GridFaultCause.LOCAL_CABLE_IMPEDANCE,
    GridFaultCause.LOCAL_EQUIPMENT_FAULT,
}
_MISCONFIGURED = {BatteryVerdictStatus.MISCONFIGURED_MODE, BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE}

_GRID_TRIAGE_RO = {
    GridFaultCause.GRID_OVERVOLTAGE: "supratensiune în rețea (dosar către distribuitor)",
    GridFaultCause.LOCAL_OVERVOLTAGE_SENSITIVITY: "prag de declanșare greșit la invertor (tehnician)",
    GridFaultCause.LOCAL_CABLE_IMPEDANCE: "cablu AC intern subdimensionat (tehnician)",
    GridFaultCause.LOCAL_EQUIPMENT_FAULT: "producție căzută, defect local (tehnician)",
}
_BATTERY_TRIAGE_RO = {
    BatteryVerdictStatus.MISCONFIGURED_MODE: "baterie în mod rezervă, blocată la vârful de seară",
    BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE: "rezervă SoC prea mare, baterie blocată seara",
    BatteryVerdictStatus.UNDERPERFORMING_CAPACITY: "baterie cu capacitate degradată",
}
_BILLING_TRIAGE_RO = {
    BillingVerdictStatus.MISSING_EXPORT_INDEX: "index de export lipsă pe factură",
    BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE: "factură pe index estimat, supraîncărcată",
    BillingVerdictStatus.METER_INVERTER_DISCREPANCY: "discrepanță contor vs. invertor",
}


def _r2(value: float) -> float:
    return round(float(value), 2)


def _flatten(prefix: str, model: BaseModel, facts: Dict[str, Fact]) -> None:
    """Copy every scalar field of a verdict into `facts` (texts and nested lists skipped)."""
    for name, value in model.model_dump().items():
        key = f"{prefix}_{name}"
        if isinstance(value, bool):
            facts[key] = int(value)
        elif isinstance(value, Enum):
            facts[key] = value.value
        elif isinstance(value, int):
            facts[key] = value
        elif isinstance(value, float):
            facts[key] = _r2(value)


def _build_facts(scenario: HouseholdScenario, analysis_parts: dict) -> Dict[str, Fact]:
    grid, battery, billing = analysis_parts["grid"], analysis_parts["battery"], analysis_parts["billing"]
    facts: Dict[str, Fact] = {
        "household_id": scenario.household_id,
        "installed_pv_kw": _r2(scenario.installed_pv_kw),
        "distance_from_transformer_m": scenario.distance_from_transformer_m,
        "internal_ac_cable_section_mm2": _r2(scenario.internal_ac_cable_section_mm2),
        "internal_ac_cable_length_m": _r2(scenario.internal_ac_cable_length_m),
        "days_in_month": scenario.monthly_summary.days_in_month,
        "invoice_number": scenario.invoice.invoice_number,
        "total_retail_import_price_ron_kwh": _r2(scenario.invoice.total_retail_import_price_ron_kwh),
        "grid_tariffs_and_taxes_ron_kwh": _r2(scenario.invoice.grid_tariffs_and_taxes_ron_kwh),
    }
    _flatten("grid", grid, facts)
    facts["grid_events_count"] = len(grid.events)
    for i, event in enumerate(grid.events, start=1):
        _flatten(f"grid_event_{i}", event, facts)
        facts[f"grid_event_{i}_start_time"] = event.start_time
        facts[f"grid_event_{i}_end_time"] = event.end_time
    _flatten("battery", battery, facts)
    _flatten("billing", billing, facts)
    return facts


def analyze_household(scenario: HouseholdScenario) -> HouseholdCompleteAnalysis:
    """Run the 3 engines and combine them into one triaged, fact-backed analysis."""
    grid = analyze_grid_fault(scenario)
    battery = analyze_battery_optimization(scenario)
    billing = analyze_billing_reconciliation(scenario)

    # Most severe verdict wins; ties resolved in the order grid -> billing -> battery.
    ranked = sorted(
        [(grid.severity, grid.responsible_party, 0), (billing.severity, billing.responsible_party, 1),
         (battery.severity, battery.responsible_party, 2)],
        key=lambda item: (-_SEVERITY_RANK[item[0]], item[2]),
    )
    overall_severity = ranked[0][0]
    primary_party = next((party for _, party, _ in ranked if party != ResponsibleParty.NONE), ResponsibleParty.NONE)
    if _SEVERITY_RANK[overall_severity] <= _SEVERITY_RANK[SeverityLevel.INFO] and ranked[0][1] == ResponsibleParty.NONE:
        primary_party = ResponsibleParty.NONE

    supplier_benefit = _r2(grid.avoided_truck_roll_saving_ron + battery.supplier_monthly_pzu_loss_ron)
    customer_benefit = _r2(
        grid.lost_value_customer_month_ron
        + battery.customer_monthly_grid_tax_loss_ron
        + (battery.supplier_battery_bonus_monthly_ron if battery.status in _MISCONFIGURED else 0.0)
        + max(0.0, billing.financial_discrepancy_ron)
    )

    issues = [
        _GRID_TRIAGE_RO.get(grid.cause),
        _BATTERY_TRIAGE_RO.get(battery.status),
        _BILLING_TRIAGE_RO.get(billing.status),
    ]
    issues = [text for text in issues if text]
    if issues:
        joined = "; ".join(issues)
        triage = joined[0].upper() + joined[1:] + f". Valoare lunară recuperabilă: {supplier_benefit:.2f} RON furnizor, {customer_benefit:.2f} RON client."
    else:
        triage = "Fără probleme: instalația, bateria și factura sunt în regulă."

    facts = _build_facts(scenario, {"grid": grid, "battery": battery, "billing": billing})
    facts.update(
        overall_severity=overall_severity.value,
        primary_responsible_party=primary_party.value,
        total_supplier_monthly_benefit_ron=supplier_benefit,
        total_customer_monthly_benefit_ron=customer_benefit,
    )

    return HouseholdCompleteAnalysis(
        household_id=scenario.household_id,
        scenario_badge_ro=scenario.scenario_badge_ro,
        customer_name=scenario.customer_name,
        city=scenario.city,
        street_address=scenario.street_address,
        pod_code=scenario.pod_code,
        distribution_operator=scenario.distribution_operator,
        transformer_id=scenario.transformer_id,
        inverter_brand=scenario.inverter_brand,
        inverter_model=scenario.inverter_model,
        installed_pv_kw=scenario.installed_pv_kw,
        date_analyzed=scenario.date_analyzed,
        grid_verdict=grid,
        battery_verdict=battery,
        billing_verdict=billing,
        overall_severity=overall_severity,
        primary_responsible_party=primary_party,
        one_line_triage_ro=triage,
        total_supplier_monthly_benefit_ron=supplier_benefit,
        total_customer_monthly_benefit_ron=customer_benefit,
        deterministic_facts=facts,
    )


def compute_portfolio_metrics(analyses: List[HouseholdCompleteAnalysis]) -> PortfolioSummaryMetrics:
    """Fleet KPIs over the monitored sample + linear extrapolation to 25,000 prosumers."""
    count = len(analyses)
    scale = EXTRAPOLATED_PROSUMERS / count if count else 0.0
    supplier_month = sum(a.total_supplier_monthly_benefit_ron for a in analyses)
    shifted_kwh_day = sum(a.battery_verdict.shiftable_evening_energy_kwh_per_day for a in analyses)
    return PortfolioSummaryMetrics(
        monitored_households_count=count,
        grid_fault_households_count=sum(a.grid_verdict.cause == GridFaultCause.GRID_OVERVOLTAGE for a in analyses),
        local_fault_households_count=sum(a.grid_verdict.cause in _LOCAL_CAUSES for a in analyses),
        misconfigured_batteries_count=sum(a.battery_verdict.status in _MISCONFIGURED for a in analyses),
        invoice_issues_count=sum(
            a.billing_verdict.status != BillingVerdictStatus.INVOICE_VALID_EXPLAINED for a in analyses
        ),
        fleet_avoided_truck_rolls_ron=_r2(sum(a.grid_verdict.avoided_truck_roll_saving_ron for a in analyses)),
        fleet_monthly_pzu_savings_ron=_r2(sum(a.battery_verdict.supplier_monthly_pzu_loss_ron for a in analyses)),
        fleet_total_supplier_monthly_value_ron=_r2(supplier_month),
        fleet_total_customer_monthly_value_ron=_r2(sum(a.total_customer_monthly_benefit_ron for a in analyses)),
        fleet_anre_complaints_prevented=sum(a.billing_verdict.anre_complaint_risk_high for a in analyses),
        extrapolated_prosumers_count=EXTRAPOLATED_PROSUMERS,
        extrapolated_annual_supplier_savings_eur=_r2(supplier_month * 12 * scale / EUR_RON_RATE),
        extrapolated_evening_peak_shifted_mwh_year=_r2(shifted_kwh_day * 365 * scale / 1000),
    )
