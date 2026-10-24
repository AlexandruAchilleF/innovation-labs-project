"""Engine 3 (billing reconciliation) validated against injected ground truth for all 81 scenarios."""

import re

import pytest

from sunproof.engine.billing import analyze_billing_reconciliation
from sunproof.models import BillingVerdictStatus, ResponsibleParty, SeverityLevel
from sunproof.scenarios import get_all_scenarios, get_ground_truth, get_scenario_by_id

SCENARIOS = get_all_scenarios()
IDS = [s.household_id for s in SCENARIOS]
VERDICTS = {s.household_id: analyze_billing_reconciliation(s) for s in SCENARIOS}


@pytest.mark.parametrize("household_id", IDS)
def test_status_matches_ground_truth(household_id):
    assert VERDICTS[household_id].status == get_ground_truth(household_id).billing_status


@pytest.mark.parametrize("household_id", IDS)
def test_invariants(household_id):
    v = VERDICTS[household_id]
    assert 0.0 <= v.self_consumption_ratio_pct <= 100.0
    assert v.financial_discrepancy_ron == pytest.approx(v.billed_payable_ron - v.correct_payable_ron, abs=0.011)
    if v.status == BillingVerdictStatus.INVOICE_VALID_EXPLAINED:
        assert abs(v.financial_discrepancy_ron) < 0.05
        assert v.severity == SeverityLevel.INFO and v.responsible_party == ResponsibleParty.NONE
        assert not v.anre_complaint_risk_high
    if v.status == BillingVerdictStatus.MISSING_EXPORT_INDEX:
        assert v.missing_unbilled_export_kwh > 0 and v.anre_complaint_risk_high
        assert v.financial_discrepancy_ron > 0
    if v.status == BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE:
        assert v.billed_import_kwh > v.meter_import_kwh and v.financial_discrepancy_ron > 0


@pytest.mark.parametrize("household_id", IDS)
def test_text_numbers_are_verdict_values(household_id):
    v = VERDICTS[household_id]
    allowed = {round(float(x), 2) for x in v.model_dump().values()
               if isinstance(x, (int, float)) and not isinstance(x, bool)}
    for text in (v.headline_ro, v.call_center_script_ro, v.customer_explanation_ro, v.recommended_action_ro):
        for token in re.findall(r"\d+(?:,\d+)?", text):
            assert round(float(token.replace(",", ".")), 2) in allowed, (token, text)


def test_status_distribution():
    counts = {}
    for v in VERDICTS.values():
        counts[v.status] = counts.get(v.status, 0) + 1
    assert counts == {
        BillingVerdictStatus.INVOICE_VALID_EXPLAINED: 76,
        BillingVerdictStatus.MISSING_EXPORT_INDEX: 4,
        BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE: 1,
    }


def test_story_missing_export_index_numbers():
    v = analyze_billing_reconciliation(get_scenario_by_id("RO-BV-004"))
    assert v.missing_unbilled_export_kwh == 640.0
    assert v.billed_payable_ron == 598.0
    assert v.correct_payable_ron == pytest.approx(285.2)
    assert v.financial_discrepancy_ron == pytest.approx(312.8)
    assert v.severity == SeverityLevel.CRITICAL and v.responsible_party == ResponsibleParty.SUPPLIER_BILLING


def test_story_valid_invoice_explains_self_consumption():
    v = analyze_billing_reconciliation(get_scenario_by_id("RO-B-005"))
    assert v.status == BillingVerdictStatus.INVOICE_VALID_EXPLAINED
    assert (v.inverter_production_kwh, v.direct_self_consumption_kwh, v.billed_export_kwh) == (780.0, 470.0, 310.0)
    assert v.correct_payable_ron == pytest.approx(v.billed_payable_ron) == pytest.approx(210.8)
    for number in ("780", "470", "310", "210,80"):
        assert number in v.customer_explanation_ro


def test_meter_inverter_discrepancy_rule():
    s = get_scenario_by_id("RO-TM-006")
    summary = s.monthly_summary.model_copy(update={"inverter_reported_export_kwh": s.monthly_summary.meter_verified_export_kwh * 1.3})
    v = analyze_billing_reconciliation(s.model_copy(update={"monthly_summary": summary}))
    assert v.status == BillingVerdictStatus.METER_INVERTER_DISCREPANCY
    assert v.responsible_party == ResponsibleParty.INSTALLER_TECHNICIAN and v.severity == SeverityLevel.WARNING


def test_deterministic():
    s = get_scenario_by_id("RO-CJ-061")
    assert analyze_billing_reconciliation(s) == analyze_billing_reconciliation(s)
