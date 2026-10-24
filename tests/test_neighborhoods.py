"""
Physics, determinism and diagnosis tests for the simulated LV neighborhoods (sunproof/grid.py,
sunproof/neighborhoods.py) and the fleet built from them.
"""

from collections import Counter

import pytest

from sunproof.grid import EN50549_OVERVOLTAGE_TRIP_V, simulate_neighborhood
from sunproof.models import (
    BatteryVerdictStatus,
    BillingVerdictStatus,
    GridFaultCause,
    GridPhase,
    GridStressCause,
    InstallationFault,
    InverterStatus,
)
from sunproof.neighborhoods import _IdAllocator, _build_neighborhood, _plans, get_neighborhood_specs
from sunproof.scenarios import (
    _simulations,
    get_all_neighborhood_analyses,
    get_all_scenarios,
    get_ground_truth,
    get_neighborhood_analysis,
    get_scenario_by_id,
    simulate_neighborhood_what_if,
    simulate_scenario_with_battery_override,
)

STRESSED = ["NB-TM-DUMBRAVITA", "NB-TM-GIROC", "NB-CJ-FLORESTI", "NB-IF-BRAGADIRU"]
HEALTHY = ["NB-IF-CORBEANCA", "NB-CJ-ZORILOR", "NB-BV-RACADAU", "NB-B-AVIATIEI"]


def test_catalog_has_eight_neighborhoods_covering_every_stress_cause():
    specs = get_neighborhood_specs()
    assert set(specs) == set(STRESSED + HEALTHY)
    assert {nb.designed_stress_cause for nb in specs.values()} == set(GridStressCause)
    assert sum(len(nb.houses) for nb in specs.values()) >= 200
    for nb in specs.values():
        feeder_ids = {f.feeder_id for f in nb.feeders}
        assert len({h.house_id for h in nb.houses}) == len(nb.houses)
        for h in nb.houses:
            assert h.feeder_id in feeder_ids
            feeder = next(f for f in nb.feeders if f.feeder_id == h.feeder_id)
            assert h.distance_from_transformer_m <= feeder.length_m
            if h.installed_pv_kw > 0:
                assert h.inverter_brand is not None and h.inverter_model
        assert sum(1 for h in nb.houses if h.monitored) >= 3


def test_catalog_generation_is_deterministic():
    ids = _IdAllocator()
    rebuilt = {p.neighborhood_id: _build_neighborhood(p, ids) for p in _plans(ids)}
    cached = get_neighborhood_specs()
    for nb_id, nb in rebuilt.items():
        assert nb.model_dump() == cached[nb_id].model_dump()


@pytest.mark.parametrize("nb_id", STRESSED + HEALTHY)
def test_every_house_obeys_power_balance_and_voltage_bounds(nb_id):
    sim = _simulations()[nb_id]
    for trace in sim.traces.values():
        for m in range(1440):
            net_left = trace.pv_kw[m] - trace.load_kw[m] - trace.battery_kw[m]
            net_right = trace.export_kw[m] - trace.import_kw[m]
            assert abs(net_left - net_right) < 0.015
            assert 185.0 < trace.pcc_voltage_v[m] < 264.5  # below the 1.15·Un instantaneous stage
            assert trace.pv_kw[m] <= trace.expected_kw[m] + 1e-9
            if trace.status[m] == InverterStatus.TRIPPED_OVERVOLTAGE:
                assert trace.pv_kw[m] == 0.0 and trace.battery_kw[m] == 0.0


def test_voltage_rises_along_the_overloaded_feeder():
    nb = get_neighborhood_specs()["NB-TM-DUMBRAVITA"]
    sim = _simulations()["NB-TM-DUMBRAVITA"]
    f1 = sorted((h for h in nb.houses if h.feeder_id == "PT04-F1" and h.phase == GridPhase.THREE_PHASE),
                key=lambda h: h.distance_from_transformer_m)
    peaks = [max(sim.traces[h.house_id].pcc_voltage_v) for h in f1]
    assert peaks[-1] - peaks[0] > 10.0
    first_half = [sim.traces[h.house_id].trip_events for h in f1[: len(f1) // 3]]
    last_third = [sim.traces[h.house_id].trip_events for h in f1[-(len(f1) // 3):]]
    assert sum(first_half) == 0 and all(t > 0 for t in last_third)


def test_healthy_neighborhoods_have_no_grid_caused_trips():
    for nb_id in HEALTHY:
        analysis = get_neighborhood_analysis(nb_id)
        assert analysis.max_voltage_v < 245.0
        assert analysis.minutes_above_253v == 0
        assert all(h.truth_grid_cause != GridFaultCause.GRID_OVERVOLTAGE for h in analysis.houses)
        assert analysis.recommended_distributor_action_ro.startswith("Nicio intervenție")


def test_stressed_neighborhoods_show_their_designed_failure():
    dumbravita = get_neighborhood_analysis("NB-TM-DUMBRAVITA")
    assert dumbravita.houses_tripped >= 6 and dumbravita.minutes_above_253v >= 30

    giroc = get_neighborhood_analysis("NB-TM-GIROC")
    v = giroc.peak_phase_voltage_v
    assert v["L1"] >= EN50549_OVERVOLTAGE_TRIP_V and v["L1"] - max(v["L2"], v["L3"]) >= 5.0
    assert giroc.phase_installed_pv_kw["L1"] > 3 * giroc.phase_installed_pv_kw["L2"]

    floresti = get_neighborhood_analysis("NB-CJ-FLORESTI")
    assert max(s.busbar_voltage_v for s in floresti.transformer_timeseries) >= 243.0
    assert floresti.houses_tripped >= 5

    bragadiru = get_neighborhood_analysis("NB-IF-BRAGADIRU")
    assert bragadiru.peak_reverse_loading_pct > 100.0
    assert bragadiru.houses_tripped == 0  # thermal problem, not a voltage one


@pytest.mark.parametrize(
    "nb_id, kwargs",
    [
        ("NB-TM-DUMBRAVITA", {"feeder_cable_upgrades": {"PT04-F1": "ACYABY_3x240", "PT04-F2": "ACYABY_3x240"}}),
        ("NB-TM-GIROC", {"rebalance_phases": True}),
        ("NB-CJ-FLORESTI", {"tap_setting_pct": 0.0}),
    ],
)
def test_recommended_distributor_fix_resolves_overvoltage(nb_id, kwargs):
    before = get_neighborhood_analysis(nb_id)
    after = simulate_neighborhood_what_if(nb_id, **kwargs)
    assert before.houses_tripped > 0
    assert after.houses_tripped == 0 and after.minutes_above_253v == 0
    assert after.min_voltage_v >= 207.0  # EN 50160 lower limit still respected in the evening
    assert after.what_if_label_ro
    assert "rezolvă problema" in before.recommended_distributor_action_ro


def test_tap_change_alone_does_not_fix_a_weak_feeder():
    after = simulate_neighborhood_what_if("NB-TM-DUMBRAVITA", tap_setting_pct=0.0)
    assert after.houses_tripped > 0 or after.min_voltage_v < 207.0


def test_bigger_transformer_removes_reverse_overload():
    after = simulate_neighborhood_what_if("NB-IF-BRAGADIRU", transformer_kva=400.0)
    assert after.peak_reverse_loading_pct < 60.0


def test_passing_cloud_is_not_a_fault():
    nb = get_neighborhood_specs()["NB-BV-RACADAU"]
    sim = _simulations()["NB-BV-RACADAU"]
    minute = 15 * 60 + 35
    for h in nb.houses:
        if h.installed_pv_kw <= 0 or h.fault != InstallationFault.NONE:
            continue
        tr = sim.traces[h.house_id]
        assert tr.status[minute] == InverterStatus.NORMAL
        assert tr.pv_kw[minute] < 0.5 * tr.expected_kw[minute]
        assert tr.trip_events == 0


def test_volt_watt_inverters_curtail_instead_of_tripping_somewhere():
    statuses = Counter(
        s
        for nb_id in STRESSED
        for tr in _simulations()[nb_id].traces.values() if tr.house.volt_watt_enabled
        for s in tr.status
    )
    assert statuses[InverterStatus.DERATING] > 30


def test_ground_truth_mix_and_consistency():
    truths = [get_ground_truth(s.household_id) for s in get_all_scenarios()]
    grid = Counter(t.grid_cause for t in truths)
    engine_only = {GridFaultCause.INSUFFICIENT_DATA, GridFaultCause.MONITORING_UNCERTAIN}
    assert set(grid) == set(GridFaultCause) - engine_only
    assert grid[GridFaultCause.GRID_OVERVOLTAGE] >= 8
    battery = Counter(t.battery_status for t in truths)
    assert battery[BatteryVerdictStatus.MISCONFIGURED_MODE] >= 3
    assert battery[BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE] >= 3
    billing = Counter(t.billing_status for t in truths)
    assert billing[BillingVerdictStatus.MISSING_EXPORT_INDEX] >= 3
    assert billing[BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE] >= 1

    assert get_ground_truth("RO-TM-001").grid_cause == GridFaultCause.GRID_OVERVOLTAGE
    assert get_ground_truth("RO-TM-001").battery_status == BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE
    assert get_ground_truth("RO-IF-002").grid_cause == GridFaultCause.LOCAL_OVERVOLTAGE_SENSITIVITY
    assert get_ground_truth("RO-CJ-003").battery_status == BatteryVerdictStatus.MISCONFIGURED_MODE
    assert get_ground_truth("RO-BV-004").billing_status == BillingVerdictStatus.MISSING_EXPORT_INDEX
    t5 = get_ground_truth("RO-B-005")
    assert (t5.grid_cause, t5.battery_status, t5.billing_status) == (
        GridFaultCause.NONE, BatteryVerdictStatus.OPTIMAL, BillingVerdictStatus.INVOICE_VALID_EXPLAINED)


def test_local_faults_trip_alone_while_grid_faults_trip_with_neighbors():
    for s in get_all_scenarios():
        truth = get_ground_truth(s.household_id)
        own = {m.minute_of_day for m in s.inverter_telemetry if m.status == InverterStatus.TRIPPED_OVERVOLTAGE}
        together = [
            n for n in s.neighbors
            if own & {x.minute_of_day for x in n.telemetry if x.status == InverterStatus.TRIPPED_OVERVOLTAGE}
        ]
        if truth.grid_cause in (GridFaultCause.LOCAL_OVERVOLTAGE_SENSITIVITY, GridFaultCause.LOCAL_CABLE_IMPEDANCE):
            assert own and not together
            assert max(m.meter_voltage_avg_v for m in s.smart_meter_15m) < 240.0
        if truth.grid_cause == GridFaultCause.LOCAL_EQUIPMENT_FAULT:
            assert sum(m.pv_power_kw for m in s.inverter_telemetry) < 0.9 * sum(
                m.pvgis_expected_kw for m in s.inverter_telemetry)


def test_generated_bills_follow_the_compensation_formula():
    for s in get_all_scenarios()[5:]:
        ms, inv = s.monthly_summary, s.invoice
        assert ms.inverter_direct_self_consumption_kwh + ms.inverter_reported_export_kwh == ms.inverter_total_production_kwh
        assert ms.meter_current_export_index - ms.meter_previous_export_index == ms.meter_verified_export_kwh
        assert ms.meter_current_import_index - ms.meter_previous_import_index == ms.meter_verified_import_kwh
        expected_total = round(
            inv.net_billed_active_energy_kwh * inv.active_energy_supply_price_ron_kwh
            + inv.billed_import_kwh * inv.grid_tariffs_and_taxes_ron_kwh, 2)
        assert inv.total_payable_ron == expected_total
        assert inv.compensated_Active_energy_kwh == min(inv.billed_import_kwh, inv.billed_export_kwh)
        if inv.is_export_index_missing_on_bill:
            assert inv.billed_export_kwh == 0.0 and ms.meter_verified_export_kwh > 0.0
        elif not inv.is_import_estimated:
            assert inv.billed_import_kwh == ms.meter_verified_import_kwh
            assert inv.billed_export_kwh == ms.meter_verified_export_kwh


def test_battery_override_on_generated_household_is_coupled_and_isolated():
    misconfigured = [
        s.household_id for s in get_all_scenarios()[5:]
        if get_ground_truth(s.household_id).battery_status == BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE
    ]
    assert misconfigured
    hid = misconfigured[0]
    before = get_scenario_by_id(hid)
    after = simulate_scenario_with_battery_override(hid, new_min_soc_pct=20.0)
    evening = lambda sc: sum(max(0.0, -m.battery_power_kw) for m in sc.inverter_telemetry if 1080 <= m.minute_of_day < 1320)
    assert evening(after) > evening(before) + 120.0  # > 2 kWh more evening discharge
    assert get_scenario_by_id(hid).battery_config.configured_min_soc_pct == before.battery_config.configured_min_soc_pct


def test_every_analysis_has_complete_series_and_text():
    for a in get_all_neighborhood_analyses():
        assert len(a.transformer_timeseries) == 1440
        assert len(a.voltage_profile_at_peak) == a.houses_total
        assert all(len(h.pcc_voltage_15m) == 96 and len(h.worst_status_15m) == 96 for h in a.houses)
        assert a.headline_ro and a.explanation_ro and a.recommended_distributor_action_ro
        assert a.monitored_households == len(a.monitored_household_ids)
