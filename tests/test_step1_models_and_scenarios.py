"""
Unit and physical-consistency tests for Step 1 (sunproof/models.py & sunproof/scenarios.py).
"""

import pytest

from sunproof.models import (
    BatteryMode,
    InverterStatus,
    PriceZone,
)
from sunproof.scenarios import (
    STORY_HOUSEHOLD_IDS,
    build_opcom_pzu_august_curve,
    get_all_scenarios,
    get_scenario_by_id,
    simulate_scenario_with_battery_override,
)


def _tripped_minutes(telemetry):
    return {m.minute_of_day for m in telemetry if m.status == InverterStatus.TRIPPED_OVERVOLTAGE}


def test_opcom_pzu_curve_structure_and_spread():
    prices = build_opcom_pzu_august_curve()
    assert len(prices) == 24

    midday_prices = [p.pzu_price_ron_mwh for p in prices if p.zone == PriceZone.SOLAR_DIP]
    evening_prices = [p.pzu_price_ron_mwh for p in prices if p.zone == PriceZone.EVENING_PEAK]

    assert len(midday_prices) >= 4
    assert len(evening_prices) >= 4
    avg_midday = sum(midday_prices) / len(midday_prices)
    avg_evening = sum(evening_prices) / len(evening_prices)

    # Midday solar dip should be cheap (<150 RON/MWh) and evening peak expensive (>900 RON/MWh)
    assert avg_midday < 150.0
    assert avg_evening > 900.0
    assert (avg_evening - avg_midday) > 750.0


def test_all_scenarios_load_and_obey_physics():
    scenarios = get_all_scenarios()
    assert len(scenarios) >= 60

    # The 5 curated demo stories come first, in presentation order
    assert [s.household_id for s in scenarios[:5]] == STORY_HOUSEHOLD_IDS == [
        "RO-TM-001", "RO-IF-002", "RO-CJ-003", "RO-BV-004", "RO-B-005",
    ]
    assert len({s.household_id for s in scenarios}) == len(scenarios)

    dt_hours = 1.0 / 60.0

    for scenario in scenarios:
        assert len(scenario.inverter_telemetry) == 1440
        assert len(scenario.smart_meter_15m) == 96
        assert len(scenario.opcom_pzu_hourly) == 24
        assert len(scenario.neighbors) >= 2
        assert scenario.neighborhood_id is not None and scenario.feeder_id is not None

        # Verify every single minute obeys Kirchhoff / energy conservation:
        # pv_kw - load_kw - battery_power_kw == grid_export_kw - grid_import_kw
        for sample in scenario.inverter_telemetry:
            net_left = sample.pv_power_kw - sample.house_load_kw - sample.battery_power_kw
            net_right = sample.grid_export_kw - sample.grid_import_kw
            assert abs(net_left - net_right) < 0.015, (
                f"Power balance violated in {scenario.household_id} at {sample.timestamp}: "
                f"{net_left} vs {net_right}"
            )

        # Verify 15-minute smart meter intervals equal the time-integral of 1-minute grid flows
        total_inv_import_kwh = sum(s.grid_import_kw for s in scenario.inverter_telemetry) * dt_hours
        total_inv_export_kwh = sum(s.grid_export_kw for s in scenario.inverter_telemetry) * dt_hours

        total_meter_import_kwh = sum(m.active_import_kwh for m in scenario.smart_meter_15m)
        total_meter_export_kwh = sum(m.active_export_kwh for m in scenario.smart_meter_15m)

        assert abs(total_inv_import_kwh - total_meter_import_kwh) < 0.05
        assert abs(total_inv_export_kwh - total_meter_export_kwh) < 0.05

        # Neighbors are other households on the same transformer, never the household itself
        assert all(n.neighbor_id.startswith(scenario.transformer_id.split(" ")[0].replace("-", ""))
                   for n in scenario.neighbors)
        assert all(scenario.customer_name not in n.anonymized_label for n in scenario.neighbors)


def test_scenario_1_grid_overvoltage_with_neighbors_and_locked_battery():
    s1 = get_scenario_by_id("RO-TM-001")
    own_trips = _tripped_minutes(s1.inverter_telemetry)
    assert len(own_trips) >= 45
    assert max(m.ac_voltage_v for m in s1.inverter_telemetry) >= 253.0
    # Street voltage itself is elevated (unlike a local fault)
    assert max(m.meter_voltage_avg_v for m in s1.smart_meter_15m) >= 245.0

    # At least 3 neighbors on the same feeder trip in the same minutes as the household
    same_feeder_tripped_together = [
        n for n in s1.neighbors
        if n.feeder_id == s1.feeder_id and len(own_trips & _tripped_minutes(n.telemetry)) >= 10
    ]
    assert len(same_feeder_tripped_together) >= 3

    # Neighbors close to the transformer stay online: voltage rise grows with distance
    near_pt = [n for n in s1.neighbors if n.distance_from_transformer_m < 250]
    assert near_pt and all(not _tripped_minutes(n.telemetry) for n in near_pt)

    # Check battery misconfiguration (wanted 20%, configured 80%)
    assert s1.battery_intent.desired_min_soc_pct == 20.0
    assert s1.battery_config.configured_min_soc_pct == 80.0
    assert min(m.battery_soc_pct for m in s1.inverter_telemetry) >= 79.9


def test_scenario_2_local_installation_fault_vs_healthy_neighbors():
    s2 = get_scenario_by_id("RO-IF-002")
    tripped_minutes = _tripped_minutes(s2.inverter_telemetry)
    assert len(tripped_minutes) >= 20

    # Street voltage at smart meter PCC is healthy (<238V), while inverter terminal exceeds 245V
    max_meter_v = max(m.meter_voltage_avg_v for m in s2.smart_meter_15m)
    max_inv_v = max(m.ac_voltage_v for m in s2.inverter_telemetry)
    assert max_meter_v < 238.0
    assert max_inv_v >= 245.0
    assert (max_inv_v - max_meter_v) >= 8.0  # High internal cable voltage rise!

    # Zero neighbors tripped on PT-11
    for n in s2.neighbors:
        assert all(ns.status != InverterStatus.TRIPPED_OVERVOLTAGE for ns in n.telemetry)


def test_scenario_3_what_if_battery_override_unlocks_evening_discharge():
    s3_before = get_scenario_by_id("RO-CJ-003")
    dt_hours = 1.0 / 60.0

    # Evening peak window: 18:00 (1080) to 22:00 (1320)
    evening_import_before = sum(
        s.grid_import_kw * dt_hours
        for s in s3_before.inverter_telemetry
        if 18 * 60 <= s.minute_of_day < 22 * 60
    )
    evening_discharge_before = sum(
        max(0.0, -s.battery_power_kw) * dt_hours
        for s in s3_before.inverter_telemetry
        if 18 * 60 <= s.minute_of_day < 22 * 60
    )
    assert evening_discharge_before == 0.0
    assert evening_import_before > 7.0

    # Now simulate changing the setting from 85% BACKUP_RESERVE to 15% MAX_SELF_CONSUMPTION
    s3_after = simulate_scenario_with_battery_override(
        "RO-CJ-003",
        new_min_soc_pct=15.0,
        new_mode=BatteryMode.MAX_SELF_CONSUMPTION,
    )
    evening_import_after = sum(
        s.grid_import_kw * dt_hours
        for s in s3_after.inverter_telemetry
        if 18 * 60 <= s.minute_of_day < 22 * 60
    )
    evening_discharge_after = sum(
        max(0.0, -s.battery_power_kw) * dt_hours
        for s in s3_after.inverter_telemetry
        if 18 * 60 <= s.minute_of_day < 22 * 60
    )

    assert evening_discharge_after > 6.5
    assert evening_import_after < 0.5
    # The cached original must stay untouched
    assert get_scenario_by_id("RO-CJ-003").battery_config.configured_mode == BatteryMode.BACKUP_RESERVE


def test_scenario_4_and_5_billing_cases():
    s4 = get_scenario_by_id("RO-BV-004")
    assert s4.invoice.is_export_index_missing_on_bill is True
    assert s4.invoice.billed_export_kwh == 0.0
    assert s4.monthly_summary.meter_verified_export_kwh == 640.0

    s5 = get_scenario_by_id("RO-B-005")
    assert s5.invoice.is_export_index_missing_on_bill is False
    assert s5.invoice.billed_export_kwh == s5.monthly_summary.meter_verified_export_kwh == 310.0
    for s in (get_scenario_by_id(hid) for hid in STORY_HOUSEHOLD_IDS):
        assert (
            s.monthly_summary.inverter_direct_self_consumption_kwh
            + s.monthly_summary.inverter_reported_export_kwh
            == s.monthly_summary.inverter_total_production_kwh
        )
