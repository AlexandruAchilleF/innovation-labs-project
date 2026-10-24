"""Engine 1: was the midday inverter trip caused by the grid or by the local installation?

Pure and deterministic. Decision order (thresholds below are physical, not tuned per household):
1. Inverter trips (TRIPPED_OVERVOLTAGE minutes) exist:
   a. GRID_OVERVOLTAGE if the utility meter (point of connection) itself is at the limit
      (>= 252 V), or >= 50 % of the transformer's neighbours rise >= 250 V / trip in the same window,
      or the meter is near the limit (>= 248 V) AND >= 25 % of neighbours corroborate it.
   b. LOCAL_OVERVOLTAGE_SENSITIVITY if the configured U> threshold is below the 253 V legal limit.
   c. LOCAL_CABLE_IMPEDANCE if the inverter-to-meter voltage rise is >= 8 V (undersized/long AC cable).
   d. Otherwise GRID_OVERVOLTAGE if the meter is >= 248 V, else LOCAL_EQUIPMENT_FAULT.
2. No trips: LOCAL_EQUIPMENT_FAULT if daylight production (outside derating windows) is < 90 % of
   PVGIS or the inverter is OFFLINE in daylight (string fault, soiling, device fault); else NONE.
   Derating alone is normal Volt-Watt behaviour and does not create a fault.

Monthly loss estimate: today's loss x (monthly PVGIS kWh / today's PVGIS kWh), i.e. the number of
"today-equivalent" production days in the month (falls back to `days_in_month`), capped by the month's
recorded shortfall (PVGIS - inverter total) when that is positive. NONE -> no attributable loss.
"""

from collections import Counter

from sunproof.models import (
    GridFaultCause, GridFaultVerdict, HouseholdScenario, InverterStatus, OvervoltageEventWindow,
    ResponsibleParty, SeverityLevel,
)

EN50549_LIMIT_V = 253.0
GRID_METER_HARD_V = 252.0      # meter at the limit: the grid itself is overvoltage
GRID_METER_SOFT_V = 248.0      # meter near the limit: grid if neighbours corroborate
GRID_RATIO_HARD = 0.5
GRID_RATIO_SOFT = 0.25
NEIGHBOR_HIGH_V = 250.0
NEIGHBOR_MARGIN_MIN = 3
CABLE_RISE_LOCAL_V = 8.0
PRODUCTION_RATIO_MIN = 0.90    # normal installations are >= 0.95 of PVGIS on a clear day
SEVERE_RATIO = 0.60
CRITICAL_TRIP_MIN = 30
TRUCK_ROLL_RON = 450.0

_TRIP, _DERATE = InverterStatus.TRIPPED_OVERVOLTAGE, InverterStatus.DERATING


def _r(x: float) -> float:
    return round(float(x), 2)


def _f(x: float) -> str:  # same 2-decimal rendering as the verdict fields (guardrail-friendly)
    return f"{x:.2f}"


def _hhmm(minute: int) -> str:
    minute = min(max(minute, 0), 1439)
    return f"{minute // 60:02d}:{minute % 60:02d}"


def _windows(tele) -> list[tuple[int, int]]:
    """Index ranges [i, j] of continuous TRIPPED/DERATING samples."""
    out, start = [], None
    for i, s in enumerate(tele):
        bad = s.status in (_TRIP, _DERATE)
        if bad and start is None:
            start = i
        elif not bad and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(tele) - 1))
    return out


def _neighbor_minutes(scenario: HouseholdScenario) -> dict[str, tuple[set[int], set[int]]]:
    """neighbor_id -> (tripped minutes, minutes >= 250 V)."""
    return {n.neighbor_id: ({t.minute_of_day for t in n.telemetry if t.status == _TRIP},
                            {t.minute_of_day for t in n.telemetry if t.ac_voltage_v >= NEIGHBOR_HIGH_V})
            for n in scenario.neighbors}


def _hits(minutes: set[int], lo: int, hi: int) -> bool:
    return any(lo <= m <= hi for m in minutes)


def analyze_grid_fault(scenario: HouseholdScenario) -> GridFaultVerdict:
    tele = scenario.inverter_telemetry
    meter_v = {m.interval_index: m.meter_voltage_avg_v for m in scenario.smart_meter_15m}
    nb_min = _neighbor_minutes(scenario)
    affected: set[str] = set()
    events: list[OvervoltageEventWindow] = []
    in_event: set[int] = set()

    for i, j in _windows(tele):
        win = tele[i:j + 1]
        lo, hi = win[0].minute_of_day, win[-1].minute_of_day
        in_event.update(range(i, j + 1))
        peak_inv = max(s.ac_voltage_v for s in win)
        peak_met = max(meter_v.get(s.minute_of_day // 15, 0.0) for s in win)
        a, b = lo - NEIGHBOR_MARGIN_MIN, hi + NEIGHBOR_MARGIN_MIN
        tripped = {nid for nid, (tr, _) in nb_min.items() if _hits(tr, a, b)}
        high = {nid for nid, (_, hv) in nb_min.items() if _hits(hv, a, b)}
        affected |= tripped | high
        codes = Counter(s.error_code for s in win if s.error_code)
        events.append(OvervoltageEventWindow(
            start_time=_hhmm(lo), end_time=_hhmm(hi + 1), duration_minutes=j - i + 1,
            peak_inverter_voltage_v=_r(peak_inv), peak_meter_voltage_v=_r(peak_met),
            internal_cable_voltage_rise_v=_r(max(0.0, peak_inv - peak_met)),
            neighbors_tripped_count=len(tripped), neighbors_over_250v_count=len(high),
            lost_energy_kwh=_r(max(0.0, sum(s.pvgis_expected_kw - s.pv_power_kw for s in win) / 60)),
            error_code=codes.most_common(1)[0][0] if codes else None,
        ))

    trip_min = sum(s.status == _TRIP for s in tele)
    derate_min = sum(s.status == _DERATE for s in tele)
    max_inv = max((s.ac_voltage_v for s in tele), default=0.0)
    max_met = max(meter_v.values(), default=0.0)
    rise = max(0.0, max_inv - max_met) if max_inv > 0 else 0.0
    n_total = len(scenario.neighbors)
    ratio = len(affected) / n_total if n_total else 0.0
    threshold = scenario.configured_overvoltage_trip_v

    expected = sum(s.pvgis_expected_kw for s in tele) / 60
    actual = sum(s.pv_power_kw for s in tele) / 60
    day = [s for k, s in enumerate(tele) if s.pvgis_expected_kw > 0 and k not in in_event]
    day_exp = sum(s.pvgis_expected_kw for s in day)
    prod_ratio = sum(s.pv_power_kw for s in day) / day_exp if day_exp > 0 else 1.0
    offline_day = sum(s.status == InverterStatus.OFFLINE for s in day)

    G = GridFaultCause
    if trip_min > 0:
        if (max_met >= GRID_METER_HARD_V or ratio >= GRID_RATIO_HARD
                or (max_met >= GRID_METER_SOFT_V and ratio >= GRID_RATIO_SOFT)):
            cause = G.GRID_OVERVOLTAGE
        elif threshold < EN50549_LIMIT_V:
            cause = G.LOCAL_OVERVOLTAGE_SENSITIVITY
        elif rise >= CABLE_RISE_LOCAL_V:
            cause = G.LOCAL_CABLE_IMPEDANCE
        else:
            cause = G.GRID_OVERVOLTAGE if max_met >= GRID_METER_SOFT_V else G.LOCAL_EQUIPMENT_FAULT
    elif prod_ratio < PRODUCTION_RATIO_MIN or offline_day > 0:
        cause = G.LOCAL_EQUIPMENT_FAULT
    else:
        cause = G.NONE

    lost_today = 0.0 if cause == G.NONE else sum(max(0.0, s.pvgis_expected_kw - s.pv_power_kw) for s in tele) / 60
    ms = scenario.monthly_summary
    days_eq = ms.pvgis_expected_production_kwh / expected if expected > 0 else ms.days_in_month
    month_gap = ms.pvgis_expected_production_kwh - ms.inverter_total_production_kwh
    lost_month = _r(min(lost_today * days_eq, month_gap) if month_gap > 0 else lost_today * days_eq)
    lost_ron = _r(lost_month * scenario.invoice.total_retail_import_price_ron_kwh)

    if cause == G.NONE:
        severity, party = SeverityLevel.OK, ResponsibleParty.NONE
    elif cause == G.GRID_OVERVOLTAGE:
        severity = SeverityLevel.CRITICAL if trip_min >= CRITICAL_TRIP_MIN else SeverityLevel.WARNING
        party = ResponsibleParty.DISTRIBUTOR
    else:
        party = ResponsibleParty.INSTALLER_TECHNICIAN
        severe = trip_min >= CRITICAL_TRIP_MIN or (trip_min == 0 and prod_ratio < SEVERE_RATIO)
        severity = SeverityLevel.CRITICAL if severe else SeverityLevel.WARNING

    facts = dict(
        trip=trip_min, derate=derate_min, inv=_r(max_inv), met=_r(max_met), rise=_r(rise), thr=_r(threshold),
        aff=len(affected), tot=n_total, exp=_r(expected), act=_r(actual), lost=_r(lost_today),
        lost_m=lost_month, ron=lost_ron, n_ev=len(events),
    )
    texts = _texts(cause, facts, scenario.distribution_operator.value)
    return GridFaultVerdict(
        cause=cause, severity=severity, responsible_party=party, **texts,
        events=events, total_trip_minutes_today=trip_min, total_derating_minutes_today=derate_min,
        max_inverter_voltage_v=_r(max_inv), max_meter_voltage_v=_r(max_met), voltage_rise_internal_cable_v=_r(rise),
        en50549_legal_limit_v=EN50549_LIMIT_V, configured_trip_threshold_v=_r(threshold),
        neighbors_total=n_total, neighbors_affected_simultaneously=len(affected), simultaneity_ratio=_r(ratio),
        affected_neighbor_ids=sorted(affected),
        pvgis_expected_today_kwh=_r(expected), actual_produced_today_kwh=_r(actual),
        lost_production_today_kwh=_r(lost_today), lost_production_month_est_kwh=lost_month,
        lost_value_customer_month_ron=lost_ron,
        avoided_truck_roll_saving_ron=TRUCK_ROLL_RON if cause == G.GRID_OVERVOLTAGE else 0.0,
        requires_distributor_pdf_dossier=cause == G.GRID_OVERVOLTAGE,
        requires_technician_telegram_alert=cause not in (G.NONE, G.GRID_OVERVOLTAGE),
    )


def _texts(cause: GridFaultCause, f: dict, operator: str) -> dict[str, str]:
    """Romanian texts; every number quoted is a verdict field (2 decimals or integer)."""
    G = GridFaultCause
    proof = (
        f"Opriri pentru supratensiune: {f['trip']} minute, limitare de putere: {f['derate']} minute "
        f"({f['n_ev']} ferestre). Tensiune maximă la invertor: {_f(f['inv'])} V; la contorul inteligent: "
        f"{_f(f['met'])} V; creștere pe cablul intern: {_f(f['rise'])} V. Prag configurat: {_f(f['thr'])} V "
        f"(limita legală: {_f(EN50549_LIMIT_V)} V). Vecini afectați simultan: {f['aff']} din {f['tot']}. "
        f"Producție azi: {_f(f['act'])} kWh față de {_f(f['exp'])} kWh estimat PVGIS."
    )
    loss = (f"Pierderea estimată este de {_f(f['lost'])} kWh azi, adică aproximativ {_f(f['lost_m'])} kWh "
            f"și {_f(f['ron'])} RON pe lună.")
    if cause == G.GRID_OVERVOLTAGE:
        return dict(
            headline_ro=f"Rețeaua a oprit invertorul: supratensiune pe postul de transformare ({f['aff']} din {f['tot']} vecini afectați)",
            explanation_ro=(f"Tensiunea a ajuns la {_f(f['met'])} V chiar la contor, iar {f['aff']} din {f['tot']} vecini "
                            f"de pe același transformator au fost afectați în aceleași minute. Instalația dumneavoastră "
                            f"funcționează corect; problema este în rețeaua de distribuție. {loss}"),
            technical_proof_summary_ro=proof,
            recommended_action_supplier_ro=(f"Nu trimiteți echipă la client. Generați dosarul PDF și depuneți reclamația "
                                            f"la operatorul de distribuție ({operator}) pentru reglarea tensiunii pe post."),
            recommended_action_customer_ro=("Nu este nimic de reparat la instalația dumneavoastră. Am trimis dovezile "
                                            "către distribuitor și vă ținem la curent."),
        )
    if cause == G.LOCAL_OVERVOLTAGE_SENSITIVITY:
        return dict(
            headline_ro=f"Invertorul se oprește prea devreme: prag setat la {_f(f['thr'])} V în loc de {_f(EN50549_LIMIT_V)} V",
            explanation_ro=(f"Invertorul s-a oprit la {_f(f['inv'])} V, sub limita legală de {_f(EN50549_LIMIT_V)} V, "
                            f"iar niciun vecin nu a fost afectat ({f['aff']} din {f['tot']}). Pragul de protecție este "
                            f"configurat greșit (cod de țară incorect). {loss}"),
            technical_proof_summary_ro=proof,
            recommended_action_supplier_ro=(f"Trimiteți alertă tehnicianului instalator: setarea pragului de supratensiune "
                                            f"la {_f(EN50549_LIMIT_V)} V și verificarea codului de rețea România."),
            recommended_action_customer_ro=("Problema este o setare a invertorului, nu rețeaua. Tehnicianul o poate "
                                            "corecta de la distanță sau printr-o vizită scurtă."),
        )
    if cause == G.LOCAL_CABLE_IMPEDANCE:
        return dict(
            headline_ro=f"Cablul dintre invertor și contor este subdimensionat: creștere de {_f(f['rise'])} V",
            explanation_ro=(f"La contor tensiunea a fost normală ({_f(f['met'])} V), dar la bornele invertorului a urcat "
                            f"la {_f(f['inv'])} V din cauza căderii de tensiune pe cablul intern. Vecinii nu au fost "
                            f"afectați ({f['aff']} din {f['tot']}). {loss}"),
            technical_proof_summary_ro=proof,
            recommended_action_supplier_ro=("Trimiteți alertă tehnicianului instalator: înlocuirea cablului AC cu o "
                                            "secțiune mai mare sau scurtarea traseului până la tabloul contorului."),
            recommended_action_customer_ro=("Rețeaua este în regulă; cablul instalației trebuie înlocuit de "
                                            "instalator pentru a opri deconectările."),
        )
    if cause == G.LOCAL_EQUIPMENT_FAULT:
        return dict(
            headline_ro=f"Producție prăbușită la tensiune normală: {_f(f['act'])} kWh din {_f(f['exp'])} kWh așteptați",
            explanation_ro=(f"Tensiunea a fost normală (maxim {_f(f['met'])} V la contor), dar panourile au produs doar "
                            f"{_f(f['act'])} kWh față de {_f(f['exp'])} kWh estimat PVGIS. Cauza probabilă este un defect "
                            f"de echipament: invertor oprit, string întrerupt sau panouri murdare/degradate. {loss}"),
            technical_proof_summary_ro=proof,
            recommended_action_supplier_ro=("Trimiteți alertă tehnicianului instalator: verificarea invertorului, "
                                            "a stringurilor și a stării panourilor."),
            recommended_action_customer_ro=("Instalația produce mai puțin decât ar trebui. Un tehnician vă va contacta "
                                            "pentru verificare."),
        )
    return dict(
        headline_ro="Fără opriri din cauza rețelei sau a instalației",
        explanation_ro=(f"Invertorul a funcționat normal: {_f(f['act'])} kWh produși față de {_f(f['exp'])} kWh estimat "
                        f"PVGIS, cu tensiune maximă de {_f(f['met'])} V la contor."),
        technical_proof_summary_ro=proof,
        recommended_action_supplier_ro="Nicio acțiune necesară.",
        recommended_action_customer_ro="Nicio acțiune necesară; instalația funcționează corect.",
    )
