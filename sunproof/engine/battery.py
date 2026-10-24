"""Battery optimization engine: is the battery locked out of the expensive evening PZU peak?

Deterministic rules (precedence top-down, validated 81/81 against ground truth):
  1. ``not battery_config.has_battery``                                   -> NO_BATTERY
  2. configured BACKUP_RESERVE while the customer wants MAX_SELF_CONSUMPTION -> MISCONFIGURED_MODE
  3. configured_min_soc_pct - desired_min_soc_pct >= 20 pp                 -> MISCONFIGURED_SOC_RESERVE
  4. state_of_health_pct < 80 %                                            -> UNDERPERFORMING_CAPACITY
  5. otherwise                                                             -> OPTIMAL

Energy windows (per-minute telemetry, kWh = kW / 60):
  midday = 10:00-16:00 (minutes 600-959), evening peak = 18:00-22:00 (minutes 1080-1319).
Shiftable evening energy (misconfigured only) = increase of evening battery discharge when the
scenario is re-simulated with the customer's intended mode/SoC (``simulate_scenario_with_battery_override``);
it equals the evening grid import avoided. Per month = per day x ``days_in_month``.
PZU: midday = mean of SOLAR_DIP hours, evening = mean of EVENING_PEAK hours (fallback to the windows above).
Annual supplier loss = daily loss x 365 (extrapolation of the analyzed August day; upper bound).
"""

from __future__ import annotations

from sunproof.models import (
    BatteryMode,
    BatteryOptimizationVerdict,
    BatteryVerdictStatus,
    HouseholdScenario,
    InverterMinuteSample,
    OpcomHourlyPrice,
    PriceZone,
    ResponsibleParty,
    SeverityLevel,
)

MIDDAY_MINUTES = range(600, 960)  # 10:00-16:00
EVENING_MINUTES = range(1080, 1320)  # 18:00-22:00
MIDDAY_HOURS = range(10, 16)
EVENING_HOURS = range(18, 22)
SOC_RESERVE_MISCONFIG_PP = 20.0  # configured - desired min SoC (percentage points)
UNDERPERFORMING_SOH_PCT = 80.0  # below this the usable capacity is considered degraded
EVENING_DELIVERY_MIN_KWH = 0.5  # evening discharge above this counts as verified delivery
SUPPLIER_STORAGE_BONUS_MONTHLY_RON = 50.0  # supplier bonus for verified evening storage delivery
CRITICAL_SUPPLIER_MONTHLY_LOSS_RON = 200.0  # misconfig escalates to CRITICAL above this loss
DAYS_PER_YEAR = 365


def _r(x: float) -> float:
    return round(float(x), 2)


def _pct(x: float) -> str:
    """SoC percentages as integers when whole (keeps text numbers equal to verdict values)."""
    return str(int(x)) if float(x).is_integer() else f"{x:.2f}"


def _window_kwh(samples: list[InverterMinuteSample], minutes: range, attr: str, sign: float = 1.0) -> float:
    total = 0.0
    for s in samples:
        if s.minute_of_day in minutes:
            v = sign * getattr(s, attr)
            if v > 0:
                total += v
    return total / 60.0


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


def _classify(scenario: HouseholdScenario) -> BatteryVerdictStatus:
    cfg, intent = scenario.battery_config, scenario.battery_intent
    if not cfg.has_battery:
        return BatteryVerdictStatus.NO_BATTERY
    if cfg.configured_mode == BatteryMode.BACKUP_RESERVE and intent.desired_mode == BatteryMode.MAX_SELF_CONSUMPTION:
        return BatteryVerdictStatus.MISCONFIGURED_MODE
    if cfg.configured_min_soc_pct - intent.desired_min_soc_pct >= SOC_RESERVE_MISCONFIG_PP:
        return BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE
    if cfg.state_of_health_pct < UNDERPERFORMING_SOH_PCT:
        return BatteryVerdictStatus.UNDERPERFORMING_CAPACITY
    return BatteryVerdictStatus.OPTIMAL


def _shiftable_kwh_per_day(scenario: HouseholdScenario, evening_discharge_now: float) -> float:
    """Extra evening discharge if the battery ran with the customer's intended settings."""
    from sunproof.scenarios import simulate_scenario_with_battery_override

    intent = scenario.battery_intent
    fixed = simulate_scenario_with_battery_override(
        scenario.household_id, intent.desired_min_soc_pct, intent.desired_mode
    )
    _, _, evening_discharge_fixed = _energy_profile(fixed)
    return max(0.0, evening_discharge_fixed - evening_discharge_now)


def _texts(status: BatteryVerdictStatus, v: dict, scenario: HouseholdScenario) -> tuple[str, str, list[str]]:
    cfg = scenario.battery_config
    path = cfg.app_setting_path_ro or "aplicația invertorului → setări baterie"
    loss = (
        f"Se pierd {v['shiftable_evening_energy_kwh_per_day']:.2f} kWh/zi "
        f"({v['shiftable_evening_energy_kwh_per_month']:.2f} kWh/lună) care ar fi putut acoperi consumul de seară: "
        f"clientul plătește în plus {v['customer_monthly_grid_tax_loss_ron']:.2f} RON/lună tarife de rețea și taxe, "
        f"iar furnizorul pierde {v['supplier_monthly_pzu_loss_ron']:.2f} RON/lună din diferența de preț PZU "
        f"de {v['pzu_spread_ron_mwh']:.2f} RON/MWh."
    )
    if status == BatteryVerdictStatus.NO_BATTERY:
        return (
            "Fără baterie instalată",
            "Gospodăria nu are baterie; surplusul de la amiază este injectat în rețea, iar consumul de seară "
            "vine din rețea. Nu există setări de baterie de verificat.",
            [],
        )
    if status == BatteryVerdictStatus.MISCONFIGURED_MODE:
        return (
            f"Bateria e blocată în modul rezervă ({_pct(v['configured_min_soc_pct'])}%) și nu se descarcă seara",
            f"Clientul vrea autoconsum maxim, dar invertorul este setat pe rezervă de avarie: "
            f"{v['locked_capacity_kwh']:.2f} kWh din {v['usable_capacity_kwh']:.2f} kWh stau blocați. {loss}",
            [
                f"Deschideți: {path}.",
                "Schimbați modul bateriei din rezervă de avarie în autoconsum maxim.",
                f"Setați SoC minim la {_pct(v['desired_min_soc_pct'])}% (cât a cerut clientul).",
                "Salvați și verificați a doua zi că bateria se descarcă la vârful de seară.",
            ],
        )
    if status == BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE:
        return (
            f"Rezervă SoC prea mare: {_pct(v['configured_min_soc_pct'])}% în loc de {_pct(v['desired_min_soc_pct'])}%",
            f"Modul de lucru este corect, dar SoC minim ține {_pct(v['locked_unused_soc_pct'])}% din baterie "
            f"({v['locked_capacity_kwh']:.2f} kWh) nefolosit. {loss}",
            [
                f"Deschideți: {path}.",
                f"Coborâți SoC minim de la {_pct(v['configured_min_soc_pct'])}% la {_pct(v['desired_min_soc_pct'])}%.",
                "Salvați și verificați a doua zi că bateria se descarcă la vârful de seară.",
            ],
        )
    if status == BatteryVerdictStatus.UNDERPERFORMING_CAPACITY:
        return (
            "Capacitatea bateriei este degradată",
            f"Setările corespund dorinței clientului, dar bateria livrează doar "
            f"{v['evening_battery_discharge_kwh_today']:.2f} kWh seara din {v['usable_capacity_kwh']:.2f} kWh utilizabili.",
            ["Cereți instalatorului un test de capacitate și verificarea garanției bateriei."],
        )
    delivered = (
        f"Seara bateria a livrat {v['evening_battery_discharge_kwh_today']:.2f} kWh, "
        f"iar din rețea s-au importat doar {v['evening_peak_grid_import_kwh_today']:.2f} kWh."
    )
    return (
        "Bateria este configurată corect",
        f"Modul și SoC minim ({_pct(v['configured_min_soc_pct'])}%) corespund dorinței clientului. {delivered}",
        [],
    )


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
    verified = has_battery and evening_discharge > EVENING_DELIVERY_MIN_KWH

    v = dict(
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
        eligible_for_supplier_bonus_now=status == BatteryVerdictStatus.OPTIMAL and verified and bonus > 0,
        evening_delivery_verified_today=verified,
    )

    if misconfigured:
        critical = v["supplier_monthly_pzu_loss_ron"] >= CRITICAL_SUPPLIER_MONTHLY_LOSS_RON
        severity = SeverityLevel.CRITICAL if critical else SeverityLevel.WARNING
        responsible = ResponsibleParty.CUSTOMER_SETTINGS
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
