"""Battery intent checks and conservative opportunity bounds from supplied data.

Shiftability is limited by observed solar surplus (90% efficiency), released
reserve/capacity, observed evening import/load and configured power. It is an
indicative daily opportunity, extrapolated using days_in_month, not a simulated
counterfactual or guaranteed saving. No demo registry or simulator is consulted.
"""

from __future__ import annotations

from sunproof.engine.battery_texts import _texts
from sunproof.engine.telemetry import sample_durations, window_kwh

from sunproof.models import (
    BatteryMode,
    BatteryOptimizationVerdict,
    BatteryVerdictStatus,
    HouseholdScenario,
    InverterStatus,
    OpcomHourlyPrice,
    PriceZone,
    ResponsibleParty,
    SeverityLevel,
)

MIDDAY_MINUTES = range(600, 960)  # 10:00-16:00
EVENING_MINUTES = range(1080, 1320)  # 18:00-22:00
MIDDAY_HOURS = range(10, 16)
EVENING_HOURS = range(18, 22)
UNDERPERFORMING_SOH_PCT = 80.0  # below this the usable capacity is considered degraded
EVENING_DELIVERY_MIN_KWH = 0.5  # evening discharge above this counts as verified delivery
SUPPLIER_STORAGE_BONUS_MONTHLY_RON = 50.0  # supplier bonus for verified evening storage delivery
CRITICAL_SUPPLIER_MONTHLY_LOSS_RON = 200.0  # misconfig escalates to CRITICAL above this loss
DAYS_PER_YEAR = 365


def _r(x: float) -> float:
    return round(float(x), 2)


_window_kwh = window_kwh


def _energy_profile(scenario: HouseholdScenario) -> tuple[float, float, float]:
    """(midday export, evening import, evening battery discharge) in kWh for the analyzed day."""
    t = scenario.inverter_telemetry
    return (
        _window_kwh(t, MIDDAY_MINUTES, "grid_export_kw"),
        _window_kwh(t, EVENING_MINUTES, "grid_import_kw"),
        _window_kwh(t, EVENING_MINUTES, "battery_power_kw", sign=-1.0),
    )


def _avg_price(prices: list[OpcomHourlyPrice], zone: PriceZone, hours: range) -> float:
    sel = [p.pzu_price_ron_mwh for p in prices if p.zone == zone] or [
        p.pzu_price_ron_mwh for p in prices if p.hour in hours
    ]
    return sum(sel) / len(sel) if sel else 0.0


def _telemetry_quality(scenario):
    quality = sample_durations(scenario.inverter_telemetry)[1]
    if quality == "sufficient" and any(s.status == InverterStatus.OFFLINE for s in scenario.inverter_telemetry):
        return "offline_telemetry"
    return quality


def _classify(scenario: HouseholdScenario) -> BatteryVerdictStatus:
    cfg, intent = scenario.battery_config, scenario.battery_intent
    if not cfg.has_battery:
        return BatteryVerdictStatus.NO_BATTERY
    if not intent.evening_discharge_allowed and (
        cfg.configured_mode not in (BatteryMode.BACKUP_RESERVE, BatteryMode.NO_BATTERY)
        or _energy_profile(scenario)[2] > 0.01
    ):
        return BatteryVerdictStatus.MISCONFIGURED_DISCHARGE_POLICY
    if cfg.configured_mode != intent.desired_mode:
        return BatteryVerdictStatus.MISCONFIGURED_MODE
    if abs(cfg.configured_min_soc_pct - intent.desired_min_soc_pct) > .01:
        return BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE
    if cfg.state_of_health_pct < UNDERPERFORMING_SOH_PCT:
        return BatteryVerdictStatus.UNDERPERFORMING_CAPACITY
    if _telemetry_quality(scenario) != "sufficient":
        return BatteryVerdictStatus.INSUFFICIENT_DATA
    return BatteryVerdictStatus.OPTIMAL


def _shiftable_kwh_per_day(scenario: HouseholdScenario, evening_discharge_now: float) -> float:
    """Conservative telemetry-derived upper bound on additional evening delivery."""
    cfg, intent = scenario.battery_config, scenario.battery_intent
    if not intent.evening_discharge_allowed or cfg.usable_capacity_kwh <= 0:
        return 0.0
    if (_telemetry_quality(scenario) != "sufficient"
            or intent.desired_mode not in (BatteryMode.MAX_SELF_CONSUMPTION, BatteryMode.TIME_OF_USE)):
        return 0.0
    midday_surplus, evening_import, _ = _energy_profile(scenario)
    available = cfg.usable_capacity_kwh * cfg.state_of_health_pct / 100
    if cfg.configured_mode == intent.desired_mode:
        released = available * max(0, cfg.configured_min_soc_pct-intent.desired_min_soc_pct)/100
    else:
        released = max(0, available*(1-intent.desired_min_soc_pct/100)-evening_discharge_now)
    durations, _ = sample_durations(scenario.inverter_telemetry)
    power_bound = sum(min(s.grid_import_kw, s.house_load_kw, cfg.max_charge_discharge_kw)*
                      max(0, min(s.minute_of_day+d, 1320)-max(s.minute_of_day, 1080))/60
                      for s,d in zip(scenario.inverter_telemetry,durations))
    charging_bound = sum(min(s.grid_export_kw, cfg.max_charge_discharge_kw)*
                         max(0, min(s.minute_of_day+d, 960)-max(s.minute_of_day, 600))/60
                         for s,d in zip(scenario.inverter_telemetry,durations))
    # Fixed efficiency allowance, not a simulator prediction or guarantee.
    return max(0.0, min(midday_surplus*.9, charging_bound*.9, released*.9, evening_import, power_bound))


def analyze_battery_optimization(scenario: HouseholdScenario) -> BatteryOptimizationVerdict:
    """Compare battery intent vs inverter config and quantify the evening PZU value locked away."""
    cfg, intent = scenario.battery_config, scenario.battery_intent
    status = _classify(scenario)
    has_battery = status != BatteryVerdictStatus.NO_BATTERY
    misconfigured = status in (
        BatteryVerdictStatus.MISCONFIGURED_MODE,
        BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE,
    )

    midday_export, evening_import, evening_discharge = _energy_profile(scenario)
    mid_pzu = _avg_price(scenario.opcom_pzu_hourly, PriceZone.SOLAR_DIP, MIDDAY_HOURS)
    eve_pzu = _avg_price(scenario.opcom_pzu_hourly, PriceZone.EVENING_PEAK, EVENING_HOURS)
    spread = max(0.0, eve_pzu - mid_pzu)

    usable = cfg.usable_capacity_kwh if has_battery else 0.0
    locked_pct = max(0.0, cfg.configured_min_soc_pct - intent.desired_min_soc_pct) if has_battery else 0.0
    shift_day = _r(_shiftable_kwh_per_day(scenario, evening_discharge)) if misconfigured else 0.0
    days = scenario.monthly_summary.days_in_month
    shift_month = _r(shift_day * days)
    daily_loss = _r(shift_day * spread / 1000.0)
    bonus = SUPPLIER_STORAGE_BONUS_MONTHLY_RON if has_battery and intent.wants_supplier_storage_bonus else 0.0
    quality = _telemetry_quality(scenario)
    verified = has_battery and quality == "sufficient" and evening_discharge > EVENING_DELIVERY_MIN_KWH

    v = dict(
        evidence_status=quality,
        has_battery=has_battery,
        battery_model=cfg.battery_brand_model,
        usable_capacity_kwh=_r(usable),
        desired_mode=intent.desired_mode,
        configured_mode=cfg.configured_mode,
        desired_min_soc_pct=_r(intent.desired_min_soc_pct),
        configured_min_soc_pct=_r(cfg.configured_min_soc_pct),
        locked_unused_soc_pct=_r(locked_pct),
        locked_capacity_kwh=_r(locked_pct / 100.0 * usable),
        midday_grid_export_kwh_today=_r(midday_export),
        evening_peak_grid_import_kwh_today=_r(evening_import),
        evening_battery_discharge_kwh_today=_r(evening_discharge),
        shiftable_evening_energy_kwh_per_day=shift_day,
        shiftable_evening_energy_kwh_per_month=shift_month,
        avg_midday_pzu_ron_mwh=_r(mid_pzu),
        avg_evening_pzu_ron_mwh=_r(eve_pzu),
        pzu_spread_ron_mwh=_r(spread),
        supplier_daily_pzu_loss_ron=daily_loss,
        supplier_monthly_pzu_loss_ron=_r(daily_loss * days),
        supplier_annual_pzu_loss_ron=_r(daily_loss * DAYS_PER_YEAR),
        customer_monthly_grid_tax_loss_ron=_r(shift_month * scenario.invoice.grid_tariffs_and_taxes_ron_kwh),
        supplier_battery_bonus_monthly_ron=_r(bonus),
        eligible_for_supplier_bonus_now=status == BatteryVerdictStatus.OPTIMAL and intent.evening_discharge_allowed and verified and bonus > 0,
        evening_delivery_verified_today=verified,
    )

    if misconfigured:
        critical = v["supplier_monthly_pzu_loss_ron"] >= CRITICAL_SUPPLIER_MONTHLY_LOSS_RON
        severity = SeverityLevel.CRITICAL if critical else SeverityLevel.WARNING
        responsible = ResponsibleParty.CUSTOMER_SETTINGS
    elif status == BatteryVerdictStatus.MISCONFIGURED_DISCHARGE_POLICY:
        severity, responsible = SeverityLevel.WARNING, ResponsibleParty.CUSTOMER_SETTINGS
    elif status == BatteryVerdictStatus.INSUFFICIENT_DATA:
        severity, responsible = SeverityLevel.INFO, ResponsibleParty.NONE
    elif status == BatteryVerdictStatus.UNDERPERFORMING_CAPACITY:
        severity, responsible = SeverityLevel.WARNING, ResponsibleParty.INSTALLER_TECHNICIAN
    elif status == BatteryVerdictStatus.NO_BATTERY:
        severity, responsible = SeverityLevel.OK, ResponsibleParty.NONE
    else:
        severity, responsible = SeverityLevel.OK, ResponsibleParty.NONE

    headline, explanation, steps = _texts(status, v, scenario)
    return BatteryOptimizationVerdict(
        status=status,
        severity=severity,
        responsible_party=responsible,
        headline_ro=headline,
        explanation_ro=explanation,
        step_by_step_fix_ro=steps,
        **v,
    )


# Roadmap name in the contracts cheatsheet.
analyze_battery = analyze_battery_optimization
