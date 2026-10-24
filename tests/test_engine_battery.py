"""Battery optimization engine validated against ground truth for all 81 scenarios."""

import pytest

from sunproof.engine.battery import analyze_battery_optimization
from sunproof.models import BatteryVerdictStatus, ResponsibleParty, SeverityLevel
from sunproof.scenarios import get_all_scenarios, get_ground_truth

SCENARIOS = get_all_scenarios()
IDS = [s.household_id for s in SCENARIOS]
MISCONFIGURED = {BatteryVerdictStatus.MISCONFIGURED_MODE, BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE}


@pytest.fixture(scope="module")
def verdicts():
    return {s.household_id: (s, analyze_battery_optimization(s)) for s in SCENARIOS}


def test_status_distribution(verdicts):
    counts: dict[BatteryVerdictStatus, int] = {}
    for _, v in verdicts.values():
        counts[v.status] = counts.get(v.status, 0) + 1
    assert counts == {
        BatteryVerdictStatus.NO_BATTERY: 49,
        BatteryVerdictStatus.OPTIMAL: 25,
        BatteryVerdictStatus.MISCONFIGURED_MODE: 4,
        BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE: 3,
    }


@pytest.mark.parametrize("household_id", IDS)
def test_status_matches_ground_truth(verdicts, household_id):
    scenario, v = verdicts[household_id]
    assert v.status == get_ground_truth(household_id).battery_status
    days = scenario.monthly_summary.days_in_month
    assert v.shiftable_evening_energy_kwh_per_month == pytest.approx(v.shiftable_evening_energy_kwh_per_day * days, abs=0.01)
    assert v.supplier_monthly_pzu_loss_ron == pytest.approx(v.supplier_daily_pzu_loss_ron * days, abs=0.01)
    assert v.pzu_spread_ron_mwh == pytest.approx(v.avg_evening_pzu_ron_mwh - v.avg_midday_pzu_ron_mwh, abs=0.01)
    assert v.headline_ro and v.explanation_ro

    if v.status in MISCONFIGURED:
        assert v.shiftable_evening_energy_kwh_per_day > 0
        assert v.supplier_daily_pzu_loss_ron > 0 and v.supplier_monthly_pzu_loss_ron > 0
        assert v.customer_monthly_grid_tax_loss_ron > 0
        assert v.locked_capacity_kwh > 0 and v.locked_unused_soc_pct >= 20
        assert v.severity in (SeverityLevel.WARNING, SeverityLevel.CRITICAL)
        assert v.responsible_party == ResponsibleParty.CUSTOMER_SETTINGS
        assert len(v.step_by_step_fix_ro) >= 3
        assert not v.eligible_for_supplier_bonus_now
    else:
        assert v.shiftable_evening_energy_kwh_per_day == 0
        assert v.supplier_monthly_pzu_loss_ron == 0 and v.customer_monthly_grid_tax_loss_ron == 0
        assert v.severity == SeverityLevel.OK and v.responsible_party == ResponsibleParty.NONE

    if v.status == BatteryVerdictStatus.NO_BATTERY:
        assert not v.has_battery
        assert v.usable_capacity_kwh == 0 and v.locked_capacity_kwh == 0 and v.locked_unused_soc_pct == 0
        assert v.evening_battery_discharge_kwh_today == 0
        assert v.supplier_daily_pzu_loss_ron == 0 and v.supplier_annual_pzu_loss_ron == 0
        assert v.supplier_battery_bonus_monthly_ron == 0
        assert not v.eligible_for_supplier_bonus_now and not v.evening_delivery_verified_today

    if v.status == BatteryVerdictStatus.OPTIMAL:
        assert v.evening_delivery_verified_today
        assert v.eligible_for_supplier_bonus_now == (v.supplier_battery_bonus_monthly_ron > 0)


def test_story_numbers(verdicts):
    _, tm = verdicts["RO-TM-001"]  # SoC reserve 80% instead of 20% on a 10 kWh battery
    assert tm.locked_capacity_kwh == 6.0
    # Conservative telemetry bound replaces the demo simulator counterfactual (5.41).
    assert 0 < tm.shiftable_evening_energy_kwh_per_day <= min(
        tm.locked_capacity_kwh*.9, tm.midday_grid_export_kwh_today*.9,
        tm.evening_peak_grid_import_kwh_today) + .01
    _, cj = verdicts["RO-CJ-003"]  # 15 kWh battery stuck in backup mode
    assert cj.status == BatteryVerdictStatus.MISCONFIGURED_MODE
    assert cj.evening_battery_discharge_kwh_today == 0
    assert 0 < cj.shiftable_evening_energy_kwh_per_day <= min(
        cj.usable_capacity_kwh*(1-cj.desired_min_soc_pct/100)*.9,
        cj.midday_grid_export_kwh_today*.9, cj.evening_peak_grid_import_kwh_today) + .01
    assert cj.supplier_monthly_pzu_loss_ron > tm.supplier_monthly_pzu_loss_ron


def test_text_numbers_come_from_verdict(verdicts):
    """Every number quoted in the explanation must be a verdict value (guardrail-friendly)."""
    import re

    for _, v in verdicts.values():
        allowed = {f"{x:.2f}" for x in v.model_dump().values() if isinstance(x, float)}
        allowed |= {str(int(x)) for x in v.model_dump().values() if isinstance(x, float) and x.is_integer()}
        for num in re.findall(r"\d+(?:\.\d+)?", v.explanation_ro + " " + v.headline_ro):
            assert num in allowed, (v.status, num)
