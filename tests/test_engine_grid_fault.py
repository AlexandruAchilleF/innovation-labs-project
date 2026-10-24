"""Engine 1 (grid vs local fault) validated against injected ground truth for all scenarios."""

import pytest

from sunproof.engine.grid_fault import analyze_grid_fault
from sunproof.models import GridFaultCause, ResponsibleParty, SeverityLevel
from sunproof.scenarios import get_all_scenarios, get_ground_truth, get_scenario_by_id

SCENARIOS = get_all_scenarios()
IDS = [s.household_id for s in SCENARIOS]
LOCAL = {GridFaultCause.LOCAL_OVERVOLTAGE_SENSITIVITY, GridFaultCause.LOCAL_CABLE_IMPEDANCE,
         GridFaultCause.LOCAL_EQUIPMENT_FAULT}


@pytest.fixture(scope="module")
def verdicts():
    return {s.household_id: analyze_grid_fault(s) for s in SCENARIOS}


@pytest.mark.parametrize("hid", IDS)
def test_cause_matches_ground_truth(verdicts, hid):
    assert verdicts[hid].cause == get_ground_truth(hid).grid_cause


@pytest.mark.parametrize("hid", IDS)
def test_invariants(verdicts, hid):
    v = verdicts[hid]
    s = get_scenario_by_id(hid)
    assert v.requires_distributor_pdf_dossier == (v.cause == GridFaultCause.GRID_OVERVOLTAGE)
    assert v.requires_technician_telegram_alert == (v.cause in LOCAL)
    assert 0.0 <= v.simultaneity_ratio <= 1.0
    assert v.neighbors_total == len(s.neighbors)
    assert v.neighbors_affected_simultaneously == len(v.affected_neighbor_ids) <= v.neighbors_total
    assert sum(e.duration_minutes for e in v.events) == v.total_trip_minutes_today + v.total_derating_minutes_today
    assert v.configured_trip_threshold_v == s.configured_overvoltage_trip_v
    assert v.en50549_legal_limit_v == 253.0
    assert v.voltage_rise_internal_cable_v >= 0.0
    if v.cause == GridFaultCause.NONE:
        assert v.severity == SeverityLevel.OK and v.responsible_party == ResponsibleParty.NONE
        # Protective derating still loses production without constituting a defect.
        assert v.lost_production_today_kwh == pytest.approx(sum(e.lost_energy_kwh for e in v.events), abs=.03)
    elif v.cause == GridFaultCause.GRID_OVERVOLTAGE:
        assert v.responsible_party == ResponsibleParty.DISTRIBUTOR
        assert v.avoided_truck_roll_saving_ron == 450.0
        assert v.total_trip_minutes_today > 0
    else:
        assert v.responsible_party == ResponsibleParty.INSTALLER_TECHNICIAN
        assert v.avoided_truck_roll_saving_ron == 0.0
        assert v.severity in (SeverityLevel.WARNING, SeverityLevel.CRITICAL)
    for text in (v.headline_ro, v.explanation_ro, v.technical_proof_summary_ro,
                 v.recommended_action_supplier_ro, v.recommended_action_customer_ro):
        assert text.strip()


def test_story_numbers():
    grid = analyze_grid_fault(get_scenario_by_id("RO-TM-001"))
    assert grid.simultaneity_ratio >= 0.5 and grid.max_meter_voltage_v > 250.0
    assert grid.lost_production_month_est_kwh > 0 and grid.lost_value_customer_month_ron > 0
    local = analyze_grid_fault(get_scenario_by_id("RO-IF-002"))
    assert local.neighbors_affected_simultaneously == 0
    assert local.configured_trip_threshold_v < local.en50549_legal_limit_v
    assert all(e.error_code for e in local.events)


def test_deterministic():
    s = get_scenario_by_id("RO-CJ-055")
    assert analyze_grid_fault(s) == analyze_grid_fault(s)
