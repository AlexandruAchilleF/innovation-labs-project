"""Deterministic Romanian text templates (SunProof).

Every number quoted here comes from `analysis.deterministic_facts` and is printed with `fmt_ro`
(Romanian format: `1.320,50`), so the templates always pass the numeric guardrail in `explainer.py`.
"""
from __future__ import annotations

from sunproof.models import HouseholdCompleteAnalysis

ID_FIELDS = ("customer_name", "city", "street_address", "pod_code", "transformer_id",
             "inverter_model", "date_analyzed")

def fmt_ro(x: float, decimals: int | None = None) -> str:
    """Romanian number format: fmt_ro(1320.5) -> '1.320,50'; integers without decimals."""
    x = float(x)
    if decimals is None:
        decimals = 0 if round(x, 2).is_integer() else 2
    s = f"{abs(x):,.{decimals}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return ("-" if x < 0 and s.strip("0,.") else "") + s


def analysis_facts(analysis: HouseholdCompleteAnalysis) -> dict:
    """Deterministic facts + identity strings (POD, address, model, ...) of the household."""
    facts = dict(analysis.deterministic_facts)
    for name in ID_FIELDS:
        facts.setdefault(name, str(getattr(analysis, name)))
    facts.setdefault("distribution_operator", analysis.distribution_operator.value)
    facts.setdefault("battery_model", analysis.battery_verdict.battery_model)
    return facts


_CAUSE_RO = {"GRID_OVERVOLTAGE": "supratensiune în rețeaua de distribuție (postul de transformare)",
             "LOCAL_OVERVOLTAGE_SENSITIVITY": "prag de declanșare setat greșit în invertor",
             "LOCAL_CABLE_IMPEDANCE": "cablu AC intern subdimensionat (cădere de tensiune mare)",
             "LOCAL_EQUIPMENT_FAULT": "defect local de echipament (invertor sau stringuri)",
             "NONE": "nu s-au constatat declanșări anormale"}
_MODE_RO = {"MAX_SELF_CONSUMPTION": "autoconsum maxim", "BACKUP_RESERVE": "rezervă de backup",
            "TIME_OF_USE": "programare orară (time-of-use)", "FORCED_CHARGE_FROM_GRID": "încărcare forțată din rețea",
            "NO_BATTERY": "fără baterie"}


def _distributor_template(a: HouseholdCompleteAnalysis, f: dict, n) -> str:
    g = a.grid_verdict
    cause = g.cause.value
    if cause not in _CAUSE_RO:
        return status_template(a, "distributor_complaint")
    head = (f"Către: {a.distribution_operator.value}\nSubiect: sesizare privind tensiunea în rețeaua de joasă "
            f"tensiune (EN 50549-1)\n\nClient: {a.customer_name}, {a.street_address}, {a.city}; cod POD "
            f"{a.pod_code}; post de transformare {a.transformer_id}, la {n('distance_from_transformer_m')} m "
            f"de PT. Invertor {a.inverter_model}, {n('installed_pv_kw')} kW. Ziua analizată: {a.date_analyzed}.\n")
    data = (f"• Maximul mediilor de tensiune la contor (intervale de cincisprezece minute): {n('grid_max_meter_voltage_v')} V; "
            f"la invertor: {n('grid_max_inverter_voltage_v')} V; limita EN 50549-1: {n('grid_en50549_legal_limit_v')} V.\n"
            f"• Creștere de tensiune pe cablul AC intern: {n('grid_voltage_rise_internal_cable_v')} V "
            f"(prag declanșare configurat: {n('grid_configured_trip_threshold_v')} V).\n"
            f"• Echipamente pe același post afectate simultan: {n('grid_neighbors_affected_simultaneously')} din "
            f"{n('grid_neighbors_total')} (raport de simultaneitate {n('grid_simultaneity_ratio')}).\n"
            f"• Deconectări: {n('grid_total_trip_minutes_today')} minute în {n('grid_events_count')} ferestre; "
            f"producție pierdută {n('grid_lost_production_today_kwh')} kWh azi, estimat "
            f"{n('grid_lost_production_month_est_kwh')} kWh/lună ({n('grid_lost_value_customer_month_ron')} RON/lună).\n")
    peaks = sorted(range(1, len(g.events) + 1), key=lambda i: -float(f.get(f"grid_event_{i}_peak_inverter_voltage_v", 0)))
    for i in sorted(peaks[:3]):
        k = f"grid_event_{i}_"
        if k + "start_time" in f:
            data += (f"• Fereastra {f[k + 'start_time']}–{f[k + 'end_time']}: contor {n(k + 'peak_meter_voltage_v')} V, "
                     f"invertor {n(k + 'peak_inverter_voltage_v')} V, echipamente declanșate {n(k + 'neighbors_tripped_count')}.\n")
    if cause == "GRID_OVERVOLTAGE":
        return head + "\nConstatări:\n" + data + (
            "\nCauza: tensiunea depășește limita direct la punctul de racordare, iar mai multe echipamente de pe același "
            "post sunt afectate în același timp; instalația interioară nu explică fenomenul.\nSolicităm: reglajul "
            "plotului transformatorului, echilibrarea fazelor, verificarea impedanței plecării, monitorizarea "
            "tensiunii timp de o săptămână și un răspuns în termenul din standardul de performanță ANRE "
            "(Ordinul ANRE nr. 46/2021). Document pregătit; sesizarea nu a fost trimisă.")
    concl = ("tensiunea a rămas în limite și invertorul nu s-a deconectat; nu există motiv de sesizare."
             if cause == "NONE" else "problema este locală, la instalația clientului; nu se solicită "
             "intervenția operatorului de distribuție.")
    return head + f"\nDiagnostic: {_CAUSE_RO.get(cause, cause)}.\n" + data + (
        f"\nConcluzie: {concl} Documentul are caracter informativ.")


def _invoice_template(a: HouseholdCompleteAnalysis, f: dict, n) -> str:
    st = a.billing_verdict.status.value
    if st not in {"INVOICE_VALID_EXPLAINED", "MISSING_EXPORT_INDEX", "ESTIMATED_INDEX_OVERCHARGE",
                  "METER_INVERTER_DISCREPANCY"} or getattr(a.billing_verdict, "reconciliation_supported", True) is False:
        return status_template(a, "invoice_explanation")
    verdict = {"INVOICE_VALID_EXPLAINED": "Factura este corectă; mai jos explicăm de unde vin cifrele.",
               "MISSING_EXPORT_INDEX": f"Pe factură lipsește indexul de export: {n('billing_missing_unbilled_export_kwh')} "
                                       "kWh injectați nu au fost compensați.",
               "ESTIMATED_INDEX_OVERCHARGE": "Consumul din rețea a fost facturat pe index estimat, mai mare decât "
                                             "citirea reală a contorului.",
               "METER_INVERTER_DISCREPANCY": "Există o diferență semnificativă între invertor și contorul inteligent; "
                                             "contorul este cel care se facturează."}.get(st, a.billing_verdict.headline_ro)
    txt = (f"Explicația facturii {f.get('invoice_number', '')} — {a.customer_name}\n\n{verdict}\n\n"
           f"• Producție panouri (invertor): {n('billing_inverter_production_kwh')} kWh; estimare PVGIS: "
           f"{n('billing_pvgis_expected_kwh')} kWh.\n"
           f"• Consumat direct în casă: {n('billing_direct_self_consumption_kwh')} kWh "
           f"({n('billing_self_consumption_ratio_pct')}% din producție) — această energie nu apare pe factură.\n"
           f"• Energie injectată: invertor {n('billing_inverter_export_kwh')} kWh, contor "
           f"{n('billing_meter_export_kwh')} kWh, facturat {n('billing_billed_export_kwh')} kWh.\n"
           f"• Energie luată din rețea: invertor {n('billing_inverter_import_kwh')} kWh, contor "
           f"{n('billing_meter_import_kwh')} kWh, facturat {n('billing_billed_import_kwh')} kWh.\n"
           "• Conform Legea 160/2026, energia injectată se compensează cantitativ unu la unu cu cea consumată din rețea; "
           f"tarifele de rețea și taxele ({n('grid_tariffs_and_taxes_ron_kwh')} RON/kWh) se plătesc în continuare.\n"
           f"• Total facturat: {n('billing_billed_payable_ron')} RON; valoare corectă calculată: "
           f"{n('billing_correct_payable_ron')} RON; diferență: {n('billing_financial_discrepancy_ron')} RON.\n"
           f"• Economie lunară din autoconsum: {n('billing_self_consumption_savings_ron')} RON.")
    if st != "INVOICE_VALID_EXPLAINED":
        txt += f"\n\nCe facem: {a.billing_verdict.recommended_action_ro}"
    return txt


def _battery_template(a: HouseholdCompleteAnalysis, f: dict, n) -> str:
    b, st = a.battery_verdict, a.battery_verdict.status.value
    if st not in {"NO_BATTERY", "OPTIMAL", "MISCONFIGURED_SOC_RESERVE", "MISCONFIGURED_MODE",
                  "UNDERPERFORMING_CAPACITY"} or (st == "MISCONFIGURED_SOC_RESERVE" and
                                                b.configured_min_soc_pct < b.desired_min_soc_pct):
        return status_template(a, "battery_guide")
    value = (f"• Prețul PZU: {n('battery_avg_midday_pzu_ron_mwh')} RON/MWh în orele de vârf ale producției solare față de "
             f"{n('battery_avg_evening_pzu_ron_mwh')} RON/MWh seara (diferență {n('battery_pzu_spread_ron_mwh')} RON/MWh).\n"
             f"• Azi: {n('battery_midday_grid_export_kwh_today')} kWh exportați în orele de vârf ale producției solare și "
             f"{n('battery_evening_peak_grid_import_kwh_today')} kWh luați din rețea la vârful de seară.\n")
    if st == "NO_BATTERY":
        return ("Ghid baterie — nu aveți baterie instalată.\n\n" + value +
                "• O baterie ar stoca surplusul din orele de vârf ale producției solare și l-ar folosi seara, când energia este scumpă. "
                "Discutați cu furnizorul despre bonusul pentru stocare.")
    cfg = (f"Ghid configurare baterie: {b.battery_model}\n\nSituație: {b.headline_ro}\n"
           f"• Capacitate utilă: {n('battery_usable_capacity_kwh')} kWh.\n"
           f"• Mod dorit: {_MODE_RO.get(str(f.get('battery_desired_mode')), '-')}; mod configurat: "
           f"{_MODE_RO.get(str(f.get('battery_configured_mode')), '-')}.\n"
           f"• SoC minim dorit: {n('battery_desired_min_soc_pct')}%; configurat: {n('battery_configured_min_soc_pct')}%.\n")
    if st == "OPTIMAL":
        return cfg + value + (f"• Bateria a livrat azi seara {n('battery_evening_battery_discharge_kwh_today')} kWh. "
                              "Configurarea este corectă; nu este nevoie de nicio modificare.")
    steps = "".join(f"• {s}\n" for s in b.step_by_step_fix_ro)
    return cfg + (f"• Capacitate blocată: {n('battery_locked_unused_soc_pct')}% = {n('battery_locked_capacity_kwh')} kWh "
                  "care nu se folosesc seara.\n") + value + (
        f"• Pierdere lunară: {n('battery_customer_monthly_grid_tax_loss_ron')} RON pentru dumneavoastră și "
        f"{n('battery_supplier_monthly_pzu_loss_ron')} RON pentru furnizor; bonus de stocare potențial, supus eligibilității după "
        f"corectare: {n('battery_supplier_battery_bonus_monthly_ron')} RON/lună.\n\nPași de urmat:\n") + steps


def build_template_text(analysis: HouseholdCompleteAnalysis, doc_type: str) -> str:
    """Deterministic Romanian template that quotes only numbers from `analysis.deterministic_facts`."""
    f = analysis.deterministic_facts
    def n(key):
        # Missing values are unknown, never an invented zero measurement.
        return fmt_ro(float(f[key]))
    builders = {"distributor_complaint": _distributor_template, "invoice_explanation": _invoice_template,
                "battery_guide": _battery_template}
    if doc_type not in builders:
        raise ValueError(f"doc_type necunoscut: {doc_type}")
    try:
        return builders[doc_type](analysis, f, n).strip()
    except (KeyError, TypeError, ValueError):
        return status_template(analysis, doc_type)


def status_template(a: HouseholdCompleteAnalysis, doc_type: str) -> str:
    """Truthful, quantity-free fallback for unsupported/new/incomplete verdicts."""
    verdict = {"distributor_complaint": a.grid_verdict, "invoice_explanation": a.billing_verdict,
               "battery_guide": a.battery_verdict}[doc_type]
    status = verdict.cause.value if doc_type == "distributor_complaint" else verdict.status.value
    descriptions = {
        "INSUFFICIENT_DATA": "Date insuficiente. Completați măsurătorile înainte de stabilirea concluziei.",
        "MONITORING_UNCERTAIN": "Monitorizare incertă. Verificați calitatea și acoperirea măsurătorilor.",
        "UNSUPPORTED_SETTLEMENT_REGIME": "Regim de decontare nesuportat; suma corectă nu este calculată.",
        "INVOICE_AMOUNT_MISMATCH": "Suma facturată diferă de calcul; este necesară verificarea facturii.",
        "MISCONFIGURED_DISCHARGE_POLICY": "Politica de descărcare diferă de intenția clientului. Verificați permisiunile de descărcare.",
        "MISCONFIGURED_SOC_RESERVE": "Rezerva configurată diferă de cea dorită. Verificați setarea rezervei.",
    }
    return (f"Stare: {status}. " + descriptions.get(status, "Consultați verdictul și verificați datele disponibile.") +
            " Document informativ pregătit; nu confirmă trimiterea unei sesizări.")
