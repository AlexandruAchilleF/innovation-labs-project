"""Grid/local triage from aligned trip evidence, supported intervals and peer PV.

PCC readings are 15-minute averages, not instantaneous terminal measurements.
Daily voltage maxima remain descriptive; classification uses contemporaneous
trip evidence only. PVGIS deficits alone do not prove an equipment fault.
"""
from sunproof.engine.grid_evidence import event_evidence, peer_samples, production_evidence
from sunproof.engine.grid_texts import _texts
from sunproof.engine.telemetry import sample_durations
from sunproof.models import (
    GridFaultCause, GridFaultVerdict, HouseholdScenario, InverterStatus,
    ResponsibleParty, SeverityLevel,
)

EN50549_LIMIT_V = 253.0
TRUCK_ROLL_RON = 450.0


def _r(x):
    return round(float(x), 2)


def analyze_grid_fault(scenario: HouseholdScenario) -> GridFaultVerdict:
    tele = scenario.inverter_telemetry
    durations, quality = sample_durations(tele)
    meter = {m.interval_index: m.meter_voltage_avg_v for m in scenario.smart_meter_15m}
    if len(meter) != len(scenario.smart_meter_15m): quality = "duplicate_meter_intervals"
    peers = peer_samples(scenario)
    events, affected, trip_evidence = event_evidence(tele,durations,meter,peers)
    trip_min = sum(d for s,d in zip(tele,durations) if s.status == InverterStatus.TRIPPED_OVERVOLTAGE)
    derate_min = sum(d for s,d in zip(tele,durations) if s.status == InverterStatus.DERATING)
    max_inv = max((s.ac_voltage_v for s in tele), default=0)
    max_met = max(meter.values(), default=0)
    rises = [max(0,s.ac_voltage_v-meter[s.minute_of_day//15]) for s in tele if s.minute_of_day//15 in meter]
    rise = max(rises,default=0)
    n_total = len({n.neighbor_id for n in scenario.neighbors})
    ratio = len(affected)/n_total if n_total else 0
    threshold = scenario.configured_overvoltage_trip_v
    expected = sum(s.pvgis_expected_kw*d/60 for s,d in zip(tele,durations))
    actual = sum(s.pv_power_kw*d/60 for s,d in zip(tele,durations))
    daylight = sum(d for s,d in zip(tele,durations) if s.pvgis_expected_kw > 0)
    prod_ratio, weather, offline, explicit_fault = production_evidence(tele,durations,peers)
    G = GridFaultCause
    if quality != "sufficient" or daylight < 120 or any(met is None for met,_,_,_ in trip_evidence):
        cause = G.INSUFFICIENT_DATA
        if quality == "sufficient": quality = "missing_daylight_or_event_meter"
    elif trip_min:
        # Each tuple combines only simultaneously available evidence.
        if any(met >= 252 or r >= .5 or (met >= 248 and r >= .25)
               or (threshold >= EN50549_LIMIT_V and inv >= EN50549_LIMIT_V and r >= .25)
               for met,_,r,inv in trip_evidence):
            cause = G.GRID_OVERVOLTAGE
        elif threshold < EN50549_LIMIT_V:
            cause = G.LOCAL_OVERVOLTAGE_SENSITIVITY
        elif any(rise >= 8 for _,rise,_,_ in trip_evidence):
            cause = G.LOCAL_CABLE_IMPEDANCE
        else:
            cause = G.LOCAL_EQUIPMENT_FAULT
    elif explicit_fault:
        cause = G.LOCAL_EQUIPMENT_FAULT
    elif offline:
        cause = G.MONITORING_UNCERTAIN
    elif prod_ratio < .9 and weather is None:
        cause = G.INSUFFICIENT_DATA
        quality = "missing_comparable_peer_production"
    elif prod_ratio < .9 and prod_ratio < weather*.9:
        cause = G.LOCAL_EQUIPMENT_FAULT
    else:
        cause = G.NONE

    uncertain = cause in (G.INSUFFICIENT_DATA,G.MONITORING_UNCERTAIN)
    if cause == G.MONITORING_UNCERTAIN: quality = "offline_without_fault_evidence"
    lost_today = sum(max(0,s.pvgis_expected_kw-s.pv_power_kw)*d/60 for s,d in zip(tele,durations)
                     if s.status in (InverterStatus.TRIPPED_OVERVOLTAGE,InverterStatus.DERATING)
                     or cause == G.LOCAL_EQUIPMENT_FAULT)
    if uncertain: lost_today = 0
    ms = scenario.monthly_summary
    days_eq = ms.pvgis_expected_production_kwh / expected if expected > 0.01 else 0
    month_gap = ms.pvgis_expected_production_kwh - ms.inverter_total_production_kwh
    lost_month = _r(min(lost_today * days_eq, month_gap) if month_gap > 0 else lost_today * days_eq)
    lost_ron = _r(lost_month * scenario.invoice.total_retail_import_price_ron_kwh)
    if uncertain:
        severity, party = SeverityLevel.INFO, ResponsibleParty.NONE
    elif cause == G.NONE:
        severity, party = SeverityLevel.OK, ResponsibleParty.NONE
    elif cause == G.GRID_OVERVOLTAGE:
        severity = SeverityLevel.CRITICAL if trip_min >= 30 else SeverityLevel.WARNING
        party = ResponsibleParty.DISTRIBUTOR
    else:
        severity = SeverityLevel.CRITICAL if trip_min >= 30 or (not trip_min and prod_ratio < .6) else SeverityLevel.WARNING
        party = ResponsibleParty.INSTALLER_TECHNICIAN
    facts = dict(trip=trip_min,derate=derate_min,inv=_r(max_inv),
                 met=max((e.peak_meter_voltage_v for e in events), default=_r(max_met)),rise=_r(rise),thr=_r(threshold),
                 aff=len(affected),tot=n_total,exp=_r(expected),act=_r(actual),lost=_r(lost_today),
                 lost_m=lost_month,ron=lost_ron,n_ev=len(events))
    texts = _texts(cause,facts,scenario.distribution_operator.value)
    return GridFaultVerdict(
        cause=cause,severity=severity,responsible_party=party,**texts,
        evidence_status="insufficient" if uncertain else "sufficient",evidence_reason=quality,
        events=events,total_trip_minutes_today=trip_min,total_derating_minutes_today=derate_min,
        max_inverter_voltage_v=_r(max_inv),max_meter_voltage_v=_r(max_met),voltage_rise_internal_cable_v=_r(rise),
        en50549_legal_limit_v=EN50549_LIMIT_V,configured_trip_threshold_v=_r(threshold),
        neighbors_total=n_total,neighbors_affected_simultaneously=len(affected),simultaneity_ratio=_r(ratio),
        affected_neighbor_ids=sorted(affected),pvgis_expected_today_kwh=_r(expected),actual_produced_today_kwh=_r(actual),
        lost_production_today_kwh=_r(lost_today),lost_production_month_est_kwh=lost_month,
        lost_value_customer_month_ron=lost_ron,
        avoided_truck_roll_saving_ron=TRUCK_ROLL_RON if cause == G.GRID_OVERVOLTAGE else 0,
        avoided_visit_saving_ron=TRUCK_ROLL_RON if cause == G.GRID_OVERVOLTAGE else 0,
        requires_distributor_pdf_dossier=cause == G.GRID_OVERVOLTAGE,
        requires_technician_telegram_alert=party == ResponsibleParty.INSTALLER_TECHNICIAN,
    )
