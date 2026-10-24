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
3. METER_INVERTER_DISCREPANCY - inverter vs meter differ by > 10 % AND > 20 kWh (fleet noise is <= 2.3 % / 6 kWh).
4. INVOICE_VALID_EXPLAINED    - invoice correct; explain self-consumption vs export.

Romanian texts only quote numbers that are fields of the verdict (2-decimal rounding, comma decimal,
no thousands separator) so the explainer's numeric guardrail can verify them.
"""

from __future__ import annotations

from sunproof.models import (
    BillingReconciliationVerdict,
    BillingVerdictStatus,
    HouseholdScenario,
    ResponsibleParty,
    SeverityLevel,
)

KWH_TOLERANCE = 1.0  # kWh: below this, invoice vs meter quantities are considered equal (index rounding)
DISCREPANCY_REL = 0.10  # inverter vs meter relative tolerance (inverter CTs are ~1-3 % off)
DISCREPANCY_ABS_KWH = 20.0  # ... and absolute tolerance, both must be exceeded
MATERIAL_RON = 20.0  # financial discrepancy that justifies an ANRE complaint
CRITICAL_RON = 100.0  # billing error above this is CRITICAL, otherwise WARNING


def _r2(value: float) -> float:
    return round(float(value), 2)


def _fmt(value: float) -> str:
    """Romanian number format matching the 2-decimal verdict value: 1320 / 210,80."""
    value = _r2(value)
    if value == int(value):
        return str(int(value))
    return f"{value:.2f}".replace(".", ",")


def _payable(import_kwh: float, export_kwh: float, scenario: HouseholdScenario) -> float:
    inv = scenario.invoice
    net_kwh = max(0.0, import_kwh - export_kwh)
    return import_kwh * inv.grid_tariffs_and_taxes_ron_kwh + net_kwh * inv.active_energy_supply_price_ron_kwh


def _exceeds(a: float, b: float) -> bool:
    diff = abs(a - b)
    return diff > DISCREPANCY_ABS_KWH and diff > DISCREPANCY_REL * max(a, b)


def _classify(scenario: HouseholdScenario) -> BillingVerdictStatus:
    m, inv = scenario.monthly_summary, scenario.invoice
    if inv.is_export_index_missing_on_bill or (
        m.meter_verified_export_kwh > 0 and inv.billed_export_kwh == 0
    ) or inv.billed_export_kwh < m.meter_verified_export_kwh - KWH_TOLERANCE:
        return BillingVerdictStatus.MISSING_EXPORT_INDEX
    if inv.is_import_estimated or inv.billed_import_kwh > m.meter_verified_import_kwh + KWH_TOLERANCE:
        return BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE
    if _exceeds(m.inverter_reported_export_kwh, m.meter_verified_export_kwh) or _exceeds(
        m.inverter_reported_import_kwh, m.meter_verified_import_kwh
    ):
        return BillingVerdictStatus.METER_INVERTER_DISCREPANCY
    return BillingVerdictStatus.INVOICE_VALID_EXPLAINED


def _texts(status: BillingVerdictStatus, n: dict[str, float]) -> dict[str, str]:
    """Romanian headline / call-center script / customer explanation / recommended action."""
    f = {k: _fmt(v) for k, v in n.items()}
    walk = (
        f"Luna aceasta panourile au produs {f['prod']} kWh. Din aceștia, {f['self']} kWh "
        f"({f['ratio']}%) au fost consumați direct în casă, fără să treacă prin contorul rețelei"
        + (f", inclusiv {f['batt']} kWh stocați în baterie și folosiți seara" if n["batt"] > 0 else "")
        + f". Doar surplusul de {f['inv_exp']} kWh a plecat în rețea; contorul inteligent "
        f"(registrul de export) a măsurat oficial {f['m_exp']} kWh injectați. "
    )
    savings = (
        f"Energia consumată direct v-a economisit deja {f['savings']} RON, bani pe care nu îi mai "
        "vedeți pe factură tocmai pentru că nu ați cumpărat-o din rețea."
    )
    if status == BillingVerdictStatus.MISSING_EXPORT_INDEX:
        return {
            "headline": f"Factura nu recunoaște {f['missing']} kWh injectați: plată în plus de {f['disc']} RON",
            "script": (
                f"Aveți dreptate să verificați. Contorul a înregistrat {f['m_exp']} kWh injectați în rețea, "
                f"dar pe factură apar doar {f['b_exp']} kWh, deci indexul de export lipsește. Suma corectă "
                f"este {f['correct']} RON, nu {f['billed']} RON. Deschidem acum o cerere de refacturare."
            ),
            "explanation": walk + (
                f"Factura a recunoscut însă doar {f['b_exp']} kWh exportați, așa că cei {f['m_imp']} kWh "
                f"importați nu au fost compensați kWh pentru kWh cu energia injectată. Ați fost facturat cu "
                f"{f['billed']} RON, iar suma corectă este {f['correct']} RON (diferență {f['disc']} RON). "
            ) + savings,
            "action": (
                "Furnizorul trebuie să preia indexul real de export de la distribuitor, să storneze factura "
                f"și să reemită factura cu {f['m_exp']} kWh compensați; diferența de {f['disc']} RON se "
                "restituie sau se compensează pe factura următoare. Dacă nu se rezolvă, reclamație la ANRE."
            ),
        }
    if status == BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE:
        return {
            "headline": f"Import facturat pe estimare: {f['b_imp']} kWh în loc de {f['m_imp']} kWh, {f['disc']} RON în plus",
            "script": (
                f"Factura folosește un index de consum estimat: {f['b_imp']} kWh facturați, dar contorul "
                f"inteligent a măsurat {f['m_imp']} kWh. Suma corectă este {f['correct']} RON în loc de "
                f"{f['billed']} RON. Solicităm regularizarea pe baza citirii reale."
            ),
            "explanation": walk + (
                f"Din rețea ați consumat de fapt {f['m_imp']} kWh, însă factura a folosit o estimare de "
                f"{f['b_imp']} kWh. Recalculată pe indexul real, factura este {f['correct']} RON, nu "
                f"{f['billed']} RON (diferență {f['disc']} RON). "
            ) + savings,
            "action": (
                "Furnizorul (care a emis factura) trebuie să ceară distribuitorului citirea reală a "
                f"contorului inteligent și să regularizeze factura cu {f['disc']} RON în favoarea clientului."
            ),
        }
    if status == BillingVerdictStatus.METER_INVERTER_DISCREPANCY:
        return {
            "headline": "Invertorul și contorul inteligent raportează cantități diferite",
            "script": (
                f"Invertorul raportează {f['inv_exp']} kWh exportați și {f['inv_imp']} kWh importați, "
                f"iar contorul oficial {f['m_exp']} kWh și {f['m_imp']} kWh. Factura respectă contorul; "
                "trimitem un tehnician să verifice senzorul de măsură al invertorului."
            ),
            "explanation": walk + (
                f"Aplicația invertorului arată însă alte valori ({f['inv_exp']} kWh export, {f['inv_imp']} kWh "
                f"import). Factura se bazează legal pe contor: {f['billed']} RON. "
            ) + savings,
            "action": (
                "Instalatorul verifică senzorul de curent (CT/smart meter) al invertorului, cablarea și "
                "configurarea; dacă diferența persistă, se solicită distribuitorului verificarea contorului."
            ),
        }
    return {
        "headline": f"Factura este corectă: {f['b_exp']} kWh injectați, restul de {f['self']} kWh i-ați consumat direct",
        "script": (
            f"Factura este corectă. Panourile au produs {f['prod']} kWh, dar {f['self']} kWh au fost "
            f"consumați direct în casă și nu ajung la contor; doar {f['m_exp']} kWh au fost injectați, "
            f"exact cât apare pe factură. De plată: {f['billed']} RON."
        ),
        "explanation": walk + (
            f"Aceasta este exact cantitatea recunoscută pe factură ({f['b_exp']} kWh). Din rețea ați "
            f"consumat {f['m_imp']} kWh"
            + (
                ", toți compensați kWh pentru kWh cu energia injectată; surplusul rămâne credit pentru "
                "lunile următoare. Suma de "
                if n["m_exp"] >= n["m_imp"] else
                f", din care {f['m_exp']} kWh au fost compensați kWh pentru kWh cu energia injectată, iar "
                "diferența neacoperită se plătește la prețul energiei. Suma de "
            )
            + f"{f['billed']} RON include tarifele de rețea și taxele, care prin lege nu se compensează. "
        ) + savings,
        "action": (
            "Nicio corecție necesară. Explicați clientului diferența dintre producția totală a panourilor "
            "și energia injectată în rețea; pentru a reduce importul, mutați consumul mare la prânz."
        ),
    }


def analyze_billing_reconciliation(scenario: HouseholdScenario) -> BillingReconciliationVerdict:
    """Reconcile PVGIS, inverter, smart meter and invoice for one prosumer month."""
    m, inv = scenario.monthly_summary, scenario.invoice
    status = _classify(scenario)

    production = m.inverter_total_production_kwh
    ratio = 100.0 * m.inverter_direct_self_consumption_kwh / production if production > 0 else 0.0
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

    if status in (BillingVerdictStatus.MISSING_EXPORT_INDEX, BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE):
        # The supplier issues the invoice and is the customer's single contractual counterparty,
        # so it owns the correction even when the missing/estimated reading came from the distributor.
        severity = SeverityLevel.CRITICAL if abs(n["disc"]) >= CRITICAL_RON else SeverityLevel.WARNING
        responsible = ResponsibleParty.SUPPLIER_BILLING
        anre_risk = abs(n["disc"]) >= MATERIAL_RON
    elif status == BillingVerdictStatus.METER_INVERTER_DISCREPANCY:
        severity, responsible, anre_risk = SeverityLevel.WARNING, ResponsibleParty.INSTALLER_TECHNICIAN, False
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
        correct_payable_ron=n["correct"],
        financial_discrepancy_ron=n["disc"],
        self_consumption_savings_ron=n["savings"],
        anre_complaint_risk_high=anre_risk,
    )


# Alias matching the name used in the contracts cheatsheet roadmap.
reconcile_billing = analyze_billing_reconciliation
