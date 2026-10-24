"""Step 2: the 3 engines + pipeline agree 100% with the injected ground truth on all 81 scenarios."""

import pytest

from sunproof.engine import analyze_household, compute_portfolio_metrics
from sunproof.models import (
    BatteryVerdictStatus,
    BillingVerdictStatus,
    GridFaultCause,
    HouseholdCompleteAnalysis,
    PortfolioSummaryMetrics,
)
from sunproof.scenarios import get_all_scenarios, get_ground_truth

SCENARIOS = get_all_scenarios()
IDS = [s.household_id for s in SCENARIOS]


@pytest.fixture(scope="module")
def analyses() -> dict[str, HouseholdCompleteAnalysis]:
    return {s.household_id: analyze_household(s) for s in SCENARIOS}


def test_fleet_size():
    assert len(SCENARIOS) == 81


@pytest.mark.parametrize("household_id", IDS)
def test_verdicts_match_ground_truth(analyses, household_id):
    analysis, truth = analyses[household_id], get_ground_truth(household_id)
    assert analysis.grid_verdict.cause == truth.grid_cause
    assert analysis.battery_verdict.status == truth.battery_status
    assert analysis.billing_verdict.status == truth.billing_status


def test_all_ground_truth_matches_100_percent(analyses):
    mismatches = []
    for hid, a in analyses.items():
        t = get_ground_truth(hid)
        got = (a.grid_verdict.cause, a.battery_verdict.status, a.billing_verdict.status)
        if got != (t.grid_cause, t.battery_status, t.billing_status):
            mismatches.append(hid)
    assert mismatches == []


@pytest.mark.parametrize("household_id", IDS)
def test_deterministic_facts_are_rounded_and_complete(analyses, household_id):
    a = analyses[household_id]
    facts = a.deterministic_facts
    for key, value in facts.items():
        assert isinstance(value, (int, float, str)), key
        if isinstance(value, float):
            assert value == round(value, 2), key
    assert facts["grid_cause"] == a.grid_verdict.cause.value
    assert facts["battery_status"] == a.battery_verdict.status.value
    assert facts["billing_status"] == a.billing_verdict.status.value
    assert facts["total_supplier_monthly_benefit_ron"] == round(a.total_supplier_monthly_benefit_ron, 2)
    assert facts["grid_max_meter_voltage_v"] == round(a.grid_verdict.max_meter_voltage_v, 2)
    assert facts["battery_shiftable_evening_energy_kwh_per_day"] == round(
        a.battery_verdict.shiftable_evening_energy_kwh_per_day, 2
    )
    assert facts["billing_financial_discrepancy_ron"] == round(a.billing_verdict.financial_discrepancy_ron, 2)
    # texts are filled later by the explainer
    assert a.distributor_complaint_text is None and a.invoice_explanation_text is None


@pytest.mark.parametrize("household_id", IDS)
def test_action_flags_follow_cause(analyses, household_id):
    grid = analyses[household_id].grid_verdict
    is_grid = grid.cause == GridFaultCause.GRID_OVERVOLTAGE
    is_local = grid.cause not in (GridFaultCause.NONE, GridFaultCause.GRID_OVERVOLTAGE)
    assert grid.requires_distributor_pdf_dossier == is_grid
    assert grid.requires_technician_telegram_alert == is_local
    assert grid.avoided_truck_roll_saving_ron == (450.0 if is_grid else 0.0)
    assert 0.0 <= grid.simultaneity_ratio <= 1.0


def test_analysis_is_deterministic():
    scenario = SCENARIOS[0]
    assert analyze_household(scenario).model_dump() == analyze_household(scenario).model_dump()


def test_portfolio_metrics(analyses):
    values = list(analyses.values())
    metrics = compute_portfolio_metrics(values)
    assert isinstance(metrics, PortfolioSummaryMetrics)
    truths = [get_ground_truth(hid) for hid in analyses]
    assert metrics.monitored_households_count == 81
    assert metrics.grid_fault_households_count == sum(t.grid_cause == GridFaultCause.GRID_OVERVOLTAGE for t in truths)
    assert metrics.local_fault_households_count == sum(
        t.grid_cause not in (GridFaultCause.NONE, GridFaultCause.GRID_OVERVOLTAGE) for t in truths
    )
    assert metrics.misconfigured_batteries_count == sum(
        t.battery_status in (BatteryVerdictStatus.MISCONFIGURED_MODE, BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE)
        for t in truths
    )
    assert metrics.invoice_issues_count == sum(
        t.billing_status != BillingVerdictStatus.INVOICE_VALID_EXPLAINED for t in truths
    )
    assert metrics.fleet_avoided_truck_rolls_ron == 450.0 * metrics.grid_fault_households_count
    assert metrics.fleet_monthly_pzu_savings_ron > 0
    assert metrics.extrapolated_prosumers_count == 25000
    assert metrics.extrapolated_annual_supplier_savings_eur > 0
    assert metrics.extrapolated_evening_peak_shifted_mwh_year > 0
