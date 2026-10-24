"""Helpers for the SunProof HTTP API: in-process caches, light summaries and downsampled chart series.

Data comes only from `sunproof.scenarios` (public facade) + `sunproof.engine`; texts from `sunproof.explainer`.
Heavy 1-min telemetry is never returned raw: it is aggregated into 5-minute buckets (288 points/day).
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from sunproof.engine import analyze_household, analyze_portfolio
from sunproof.explainer import explain_household
from sunproof.models import (
    BatteryMode,
    HouseholdCompleteAnalysis,
    HouseholdScenario,
    InverterStatus,
    NeighborhoodGridAnalysis,
    PortfolioSummaryMetrics,
)
from sunproof.scenarios import get_all_scenarios, get_scenario_by_id

BUCKET_MIN = 5
HALLUCINATED_SENTENCE_RO = " În plus, vă garantăm o compensație suplimentară de 999 RON pe lună."
_NEIGHBORHOOD_HEAVY = {"transformer_timeseries", "houses", "voltage_profile_at_peak"}

_RAW: Dict[str, HouseholdCompleteAnalysis] = {}
_EXPLAINED: Dict[str, HouseholdCompleteAnalysis] = {}
_PORTFOLIO: Optional[PortfolioSummaryMetrics] = None


def use_llm() -> bool:
    return os.environ.get("SUNPROOF_USE_LLM", "0").strip().lower() in {"1", "true", "yes"}


def dump(model: Any) -> Any:
    return model.model_dump(mode="json") if model is not None else None


# ---------------------------------------------------------------- analyses (cached)
def raw_analysis(household_id: str) -> HouseholdCompleteAnalysis:
    """Engine output without texts (KeyError if the household is unknown)."""
    if household_id not in _RAW:
        _RAW[household_id] = analyze_household(get_scenario_by_id(household_id))
    return _RAW[household_id]


def explained(scenario: HouseholdScenario, analysis: HouseholdCompleteAnalysis) -> HouseholdCompleteAnalysis:
    return explain_household(scenario, analysis, use_llm=use_llm())


def explained_analysis(household_id: str) -> HouseholdCompleteAnalysis:
    """Engine output with the 3 verified texts filled (cached)."""
    if household_id not in _EXPLAINED:
        _EXPLAINED[household_id] = explained(get_scenario_by_id(household_id), raw_analysis(household_id))
    return _EXPLAINED[household_id]


def portfolio_metrics() -> PortfolioSummaryMetrics:
    global _PORTFOLIO
    if _PORTFOLIO is None:
        _PORTFOLIO = analyze_portfolio([raw_analysis(s.household_id) for s in get_all_scenarios()])
    return _PORTFOLIO


def household_summary(scenario: HouseholdScenario, a: HouseholdCompleteAnalysis) -> Dict[str, Any]:
    return {
        "household_id": scenario.household_id, "customer_name": scenario.customer_name,
        "city": scenario.city, "county": scenario.county, "scenario_badge_ro": scenario.scenario_badge_ro,
        "neighborhood_id": scenario.neighborhood_id, "transformer_id": scenario.transformer_id,
        "inverter_brand": scenario.inverter_brand.value, "installed_pv_kw": scenario.installed_pv_kw,
        "overall_severity": a.overall_severity.value,
        "primary_responsible_party": a.primary_responsible_party.value,
        "one_line_triage_ro": a.one_line_triage_ro,
        "grid_cause": a.grid_verdict.cause.value, "battery_status": a.battery_verdict.status.value,
        "billing_status": a.billing_verdict.status.value,
        "total_supplier_monthly_benefit_ron": a.total_supplier_monthly_benefit_ron,
        "total_customer_monthly_benefit_ron": a.total_customer_monthly_benefit_ron,
    }


def all_household_summaries() -> List[Dict[str, Any]]:
    return [household_summary(s, raw_analysis(s.household_id)) for s in get_all_scenarios()]


def scenario_light(scenario: HouseholdScenario) -> Dict[str, Any]:
    """Scenario dump without the per-minute telemetry (counts are added instead)."""
    data = scenario.model_dump(mode="json", exclude={
        "inverter_telemetry": True, "smart_meter_15m": True, "neighbors": {"__all__": {"telemetry"}}})
    data["inverter_samples_count"] = len(scenario.inverter_telemetry)
    data["smart_meter_intervals_count"] = len(scenario.smart_meter_15m)
    data["neighbors_count"] = len(scenario.neighbors)
    return data


# ---------------------------------------------------------------- downsampling
def _buckets(samples: list) -> List[list]:
    groups: Dict[int, list] = {}
    for s in samples:
        groups.setdefault(s.minute_of_day // BUCKET_MIN, []).append(s)
    return [groups[k] for k in sorted(groups)]


def _worst_status(group: list) -> str:
    statuses = {s.status for s in group}
    for st in (InverterStatus.TRIPPED_OVERVOLTAGE, InverterStatus.OFFLINE, InverterStatus.DERATING):
        if st in statuses:
            return st.value
    return group[0].status.value


def _mean(group: list, attr: str) -> float:
    return round(sum(getattr(s, attr) for s in group) / len(group), 3)


def _time(minute: int) -> str:
    return f"{minute // 60:02d}:{minute % 60:02d}"


def inverter_series(scenario: HouseholdScenario) -> List[Dict[str, Any]]:
    out = []
    for g in _buckets(scenario.inverter_telemetry):
        m = g[0].minute_of_day
        out.append({
            "minute_of_day": m, "time": _time(m),
            "ac_voltage_v": round(max(s.ac_voltage_v for s in g), 2),
            **{k: _mean(g, k) for k in ("pv_power_kw", "pvgis_expected_kw", "house_load_kw",
                                        "battery_power_kw", "grid_import_kw", "grid_export_kw")},
            "battery_soc_pct": round(g[-1].battery_soc_pct, 2),
            "status": _worst_status(g),
        })
    return out


def battery_series(scenario: HouseholdScenario) -> List[Dict[str, Any]]:
    keys = ("minute_of_day", "time", "battery_power_kw", "battery_soc_pct", "grid_import_kw", "grid_export_kw")
    return [{k: p[k] for k in keys} for p in inverter_series(scenario)]


def household_timeseries(scenario: HouseholdScenario) -> Dict[str, Any]:
    neighbors = []
    for n in scenario.neighbors:
        neighbors.append({
            "neighbor_id": n.neighbor_id, "label": n.anonymized_label,
            "distance_from_transformer_m": n.distance_from_transformer_m, "phase": n.phase,
            "voltage_max_5min": [round(max(s.ac_voltage_v for s in g), 2) for g in _buckets(n.telemetry)],
            "tripped_minutes": sum(1 for s in n.telemetry if s.status == InverterStatus.TRIPPED_OVERVOLTAGE),
        })
    return {
        "household_id": scenario.household_id, "bucket_minutes": BUCKET_MIN,
        "minutes": inverter_series(scenario),
        "meter_voltage_15m": [round(i.meter_voltage_avg_v, 2) for i in scenario.smart_meter_15m],
        "neighbors": neighbors,
        "pzu": [{"hour": p.hour, "interval_label": p.interval_label, "pzu_price_ron_mwh": p.pzu_price_ron_mwh,
                 "pzu_price_ron_kwh": p.pzu_price_ron_kwh, "zone": p.zone.value} for p in scenario.opcom_pzu_hourly],
    }


# ---------------------------------------------------------------- battery what-if
def parse_battery_mode(value: Optional[str]) -> Optional[BatteryMode]:
    if value is None or value == "":
        return None
    try:
        return BatteryMode[value]
    except KeyError:
        return BatteryMode(value)  # ValueError if invalid


_DELTA_KEYS = ("locked_capacity_kwh", "evening_battery_discharge_kwh_today", "evening_peak_grid_import_kwh_today",
               "supplier_monthly_pzu_loss_ron")


def battery_delta(before: HouseholdCompleteAnalysis, after: HouseholdCompleteAnalysis) -> Dict[str, Any]:
    delta: Dict[str, Any] = {}
    for k in _DELTA_KEYS:
        b, a = getattr(before.battery_verdict, k), getattr(after.battery_verdict, k)
        delta[k] = {"before": b, "after": a, "change": round(a - b, 3)}
    b, a = before.total_supplier_monthly_benefit_ron, after.total_supplier_monthly_benefit_ron
    delta["total_supplier_monthly_benefit_ron"] = {"before": b, "after": a, "change": round(a - b, 3)}
    delta["battery_status"] = {"before": before.battery_verdict.status.value,
                               "after": after.battery_verdict.status.value}
    return delta


# ---------------------------------------------------------------- neighborhoods
def neighborhood_summary(nga: NeighborhoodGridAnalysis) -> Dict[str, Any]:
    data = nga.model_dump(mode="json", exclude=_NEIGHBORHOOD_HEAVY)
    data["houses_count"] = len(nga.houses)
    data["feeders_count"] = len(nga.feeders)
    data["timeseries_points"] = len(nga.transformer_timeseries)
    return data


def neighborhood_detail(nga: NeighborhoodGridAnalysis, full: bool = False) -> Dict[str, Any]:
    data = nga.model_dump(mode="json")
    if not full:
        data["transformer_timeseries"] = [
            p for p in data["transformer_timeseries"] if p["minute_of_day"] % BUCKET_MIN == 0]
    return data


def redact(obj: Any, secret: Optional[str]) -> Any:
    """Removes a secret (bot token) from any string inside a JSON-like structure."""
    if not secret:
        return obj
    if isinstance(obj, str):
        return obj.replace(secret, "***")
    if isinstance(obj, dict):
        return {k: redact(v, secret) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [redact(v, secret) for v in obj]
    return obj
