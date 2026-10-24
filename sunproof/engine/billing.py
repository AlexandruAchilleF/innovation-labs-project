"""Engine 3: prosumer invoice reconciliation (PVGIS vs inverter vs smart meter vs invoice).

Pure and deterministic: everything is derived from `scenario.monthly_summary` and `scenario.invoice`.

Payable under Law 160/2026 quantity compensation (verified to reproduce `invoice.total_payable_ron`
to < 1e-9 RON on every valid invoice of the fleet):
    payable = import_kwh * grid_tariffs_and_taxes_ron_kwh                  (never compensated)
            + max(0, import_kwh - export_kwh) * active_energy_supply_price  (only active energy is netted 1:1)
Surplus export becomes `carried_forward_export_credit_kwh` and does not reduce this month's RON.
The correct amount uses the smart-meter registers (1.8.0 import / 2.8.0 export) as the official truth.

Rule precedence (first match wins):
1. MISSING_EXPORT_INDEX       - export index flagged missing, or meter export not (fully) credited on the bill.
2. ESTIMATED_INDEX_OVERCHARGE - import estimated / billed import above the meter-verified import.
Unsupported regimes fail closed before calculation. After quantity-index checks,
AMOUNT_MISMATCH covers payable, compensation, net energy and carried credit;
only then are meter/inverter discrepancies and valid invoices classified.

Romanian texts only quote numbers that are fields of the verdict (2-decimal rounding, comma decimal,
no thousands separator) so the explainer's numeric guardrail can verify them.
"""

from __future__ import annotations

from sunproof.engine.billing_texts import _texts

from sunproof.models import (
    BillingReconciliationVerdict,
    BillingVerdictStatus,
    HouseholdScenario,
    ResponsibleParty,
    SeverityLevel,
    SettlementRegime,
)

KWH_TOLERANCE = 1.0  # kWh: below this, invoice vs meter quantities are considered equal (index rounding)
DISCREPANCY_REL = 0.10  # inverter vs meter relative tolerance (inverter CTs are ~1-3 % off)
DISCREPANCY_ABS_KWH = 20.0  # ... and absolute tolerance, both must be exceeded
MATERIAL_RON = 20.0  # financial discrepancy that justifies an ANRE complaint
CRITICAL_RON = 100.0  # billing error above this is CRITICAL, otherwise WARNING


def _r2(value: float) -> float:
    return round(float(value), 2)


def _payable(import_kwh: float, export_kwh: float, scenario: HouseholdScenario) -> float:
    inv = scenario.invoice
    net_kwh = max(0.0, import_kwh - export_kwh)
    return import_kwh * inv.grid_tariffs_and_taxes_ron_kwh + net_kwh * inv.active_energy_supply_price_ron_kwh


def _exceeds(a: float, b: float) -> bool:
    diff = abs(a - b)
    return diff > DISCREPANCY_ABS_KWH and diff > DISCREPANCY_REL * max(a, b)


def _classify(scenario: HouseholdScenario) -> BillingVerdictStatus:
    m, inv = scenario.monthly_summary, scenario.invoice
    if inv.settlement_regime != SettlementRegime.QUANTITY_COMPENSATION_UNDER_200KW:
        return BillingVerdictStatus.UNSUPPORTED_SETTLEMENT
    if inv.is_export_index_missing_on_bill or (
        m.meter_verified_export_kwh > 0 and inv.billed_export_kwh == 0
    ) or inv.billed_export_kwh < m.meter_verified_export_kwh - KWH_TOLERANCE:
        return BillingVerdictStatus.MISSING_EXPORT_INDEX
    if inv.is_import_estimated or inv.billed_import_kwh > m.meter_verified_import_kwh + KWH_TOLERANCE:
        return BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE
    expected_compensation = min(inv.billed_import_kwh, inv.billed_export_kwh)
    lines = ((inv.compensated_active_energy_kwh, expected_compensation),
             (inv.net_billed_active_energy_kwh, max(0, inv.billed_import_kwh-inv.billed_export_kwh)),
             (inv.carried_forward_export_credit_kwh, max(0, inv.billed_export_kwh-inv.billed_import_kwh)),
             (inv.billed_import_kwh, m.meter_verified_import_kwh),
             (inv.billed_export_kwh, m.meter_verified_export_kwh))
    if (any(abs(a-b) > KWH_TOLERANCE for a,b in lines)
            or abs(inv.total_payable_ron - _payable(m.meter_verified_import_kwh,
                                                   m.meter_verified_export_kwh, scenario)) > .05):
        return BillingVerdictStatus.AMOUNT_MISMATCH
    if _exceeds(m.inverter_reported_export_kwh, m.meter_verified_export_kwh) or _exceeds(
        m.inverter_reported_import_kwh, m.meter_verified_import_kwh
    ):
        return BillingVerdictStatus.METER_INVERTER_DISCREPANCY
    return BillingVerdictStatus.INVOICE_VALID_EXPLAINED



def analyze_billing_reconciliation(scenario: HouseholdScenario) -> BillingReconciliationVerdict:
    """Reconcile PVGIS, inverter, smart meter and invoice for one prosumer month."""
    m, inv = scenario.monthly_summary, scenario.invoice
    status = _classify(scenario)

    production = m.inverter_total_production_kwh
    ratio = 100.0 * m.inverter_direct_self_consumption_kwh / production if production > 0 else 0.0
    supported = status != BillingVerdictStatus.UNSUPPORTED_SETTLEMENT
    correct = _payable(m.meter_verified_import_kwh, m.meter_verified_export_kwh, scenario)
    n = {
        "prod": production,
        "self": m.inverter_direct_self_consumption_kwh,
        "ratio": min(100.0, max(0.0, ratio)),
        # Battery energy delivered back to the house (behind the meter); part of direct self-consumption.
        "batt": m.inverter_battery_discharged_kwh,
        "inv_exp": m.inverter_reported_export_kwh,
        "m_exp": m.meter_verified_export_kwh,
        "b_exp": inv.billed_export_kwh,
        "missing": max(0.0, m.meter_verified_export_kwh - inv.billed_export_kwh),
        "inv_imp": m.inverter_reported_import_kwh,
        "m_imp": m.meter_verified_import_kwh,
        "b_imp": inv.billed_import_kwh,
        "billed": inv.total_payable_ron,
        "correct": correct,
        "savings": m.inverter_direct_self_consumption_kwh * inv.total_retail_import_price_ron_kwh,
    }
    n = {k: _r2(v) for k, v in n.items()}
    n["disc"] = _r2(n["billed"] - n["correct"])

    if status in (BillingVerdictStatus.MISSING_EXPORT_INDEX, BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE, BillingVerdictStatus.AMOUNT_MISMATCH):
        # The supplier issues the invoice and is the customer's single contractual counterparty,
        # so it owns the correction even when the missing/estimated reading came from the distributor.
        severity = SeverityLevel.CRITICAL if abs(n["disc"]) >= CRITICAL_RON else SeverityLevel.WARNING
        responsible = ResponsibleParty.SUPPLIER_BILLING
        anre_risk = abs(n["disc"]) >= MATERIAL_RON
    elif status == BillingVerdictStatus.METER_INVERTER_DISCREPANCY:
        severity, responsible, anre_risk = SeverityLevel.WARNING, ResponsibleParty.INSTALLER_TECHNICIAN, False
    elif status == BillingVerdictStatus.UNSUPPORTED_SETTLEMENT:
        severity, responsible, anre_risk = SeverityLevel.WARNING, ResponsibleParty.SUPPLIER_BILLING, False
    else:
        severity, responsible, anre_risk = SeverityLevel.INFO, ResponsibleParty.NONE, False

    t = _texts(status, n)
    return BillingReconciliationVerdict(
        status=status,
        severity=severity,
        responsible_party=responsible,
        headline_ro=t["headline"],
        call_center_script_ro=t["script"],
        customer_explanation_ro=t["explanation"],
        recommended_action_ro=t["action"],
        pvgis_expected_kwh=_r2(m.pvgis_expected_production_kwh),
        inverter_production_kwh=n["prod"],
        direct_self_consumption_kwh=n["self"],
        self_consumption_ratio_pct=n["ratio"],
        battery_net_buffered_kwh=n["batt"],
        inverter_export_kwh=n["inv_exp"],
        meter_export_kwh=n["m_exp"],
        billed_export_kwh=n["b_exp"],
        missing_unbilled_export_kwh=n["missing"],
        inverter_import_kwh=n["inv_imp"],
        meter_import_kwh=n["m_imp"],
        billed_import_kwh=n["b_imp"],
        billed_payable_ron=n["billed"],
        reconciliation_supported=supported,
        evidence_status="sufficient" if supported else "unsupported",
        correct_payable_ron=n["correct"] if supported else None,
        financial_discrepancy_ron=n["disc"] if supported else None,
        self_consumption_savings_ron=n["savings"],
        anre_complaint_risk_high=anre_risk,
    )


# Alias matching the name used in the contracts cheatsheet roadmap.
reconcile_billing = analyze_billing_reconciliation
