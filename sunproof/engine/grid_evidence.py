"""Time-aligned event evidence and weather-normalized production comparisons."""
from collections import Counter
from statistics import median

from sunproof.engine.telemetry import sample_durations
from sunproof.models import InverterStatus, OvervoltageEventWindow

TRIP = InverterStatus.TRIPPED_OVERVOLTAGE
DERATE = InverterStatus.DERATING


def peer_samples(scenario):
    """One peer observation per represented minute, with no gap interpolation."""
    peers = {}
    for n in scenario.neighbors:
        if n.neighbor_id in peers:
            continue
        durations, reason = sample_durations(n.telemetry)
        if reason in ("unordered_or_duplicate_minutes", "timestamp_minute_mismatch"):
            peers[n.neighbor_id] = {}
            continue
        # Isolated observations are usable only at their actual minute.
        if len(n.telemetry) == 1:
            durations = [1]
        peers[n.neighbor_id] = {m: s for s,d in zip(n.telemetry,durations)
                               for m in range(s.minute_of_day,s.minute_of_day+d)}
    return peers


def simultaneous(peers, minute):
    tripped, high = set(), set()
    for nid, samples in peers.items():
        s = samples.get(minute)
        if s is not None:
            if s.status == TRIP: tripped.add(nid)
            if s.ac_voltage_v >= 250: high.add(nid)
    return tripped, high


def event_evidence(tele, durations, meter, peers):
    """Return events, strongest actual simultaneous peer set, and per-trip evidence.

    Include at most 3 minutes before a trip (terminal voltage can drop after
    disconnection). Trip evidence tuples retain PCC, rise, peer ratio and terminal
    voltage at the SAME
    time. Neither different events nor different moments can manufacture cause.
    """
    events, strongest, trip_evidence = [], set(), []
    groups, group = [], []
    for i, (s,d) in enumerate(zip(tele,durations)):
        if s.status in (TRIP, DERATE) and d:
            if group and tele[group[-1]].minute_of_day+durations[group[-1]] != s.minute_of_day:
                groups.append(group); group = []
            group.append(i)
        elif group:
            groups.append(group); group = []
    if group: groups.append(group)
    for indexes in groups:
        best_tr, best_hi = set(), set()
        paired_rises, voltages = [], []
        context = set(indexes)
        for i in indexes:
            if tele[i].status == TRIP:
                context.update(k for k in range(max(0,i-3),i)
                               if 0 < tele[i].minute_of_day-tele[k].minute_of_day <= 3)
        for i in sorted(context):
            s = tele[i]
            for minute in range(s.minute_of_day, s.minute_of_day+durations[i]):
                tr, hi = simultaneous(peers, minute)
                if len(tr | hi) > len(strongest): strongest = tr | hi
                if len(tr) > len(best_tr): best_tr = tr
                if len(hi) > len(best_hi): best_hi = hi
                met = meter.get(minute//15)
                if met is not None:
                    voltages.append(met)
                    paired_rises.append(max(0, s.ac_voltage_v-met))
                if any(tele[k].status == TRIP and 0 <= tele[k].minute_of_day-minute <= 3 for k in indexes):
                    trip_evidence.append((met, max(0, s.ac_voltage_v-met) if met is not None else None,
                                          len(tr|hi)/len(peers) if peers else 0, s.ac_voltage_v))
        win = [tele[i] for i in indexes]
        codes = Counter(s.error_code for s in win if s.error_code)
        end = win[-1].minute_of_day+durations[indexes[-1]]
        events.append(OvervoltageEventWindow(
            start_time=win[0].timestamp, end_time=f"{end//60:02d}:{end%60:02d}",
            duration_minutes=sum(durations[i] for i in indexes),
            evidence_start_time=tele[min(context)].timestamp,
            peak_inverter_voltage_v=round(max(tele[i].ac_voltage_v for i in context),2),
            peak_meter_voltage_v=round(max(voltages,default=0),2),
            internal_cable_voltage_rise_v=round(max(paired_rises,default=0),2),
            neighbors_tripped_count=len(best_tr), neighbors_over_250v_count=len(best_hi),
            lost_energy_kwh=round(sum(max(0,tele[i].pvgis_expected_kw-tele[i].pv_power_kw)*durations[i]/60
                                      for i in indexes),2),
            error_code=codes.most_common(1)[0][0] if codes else None))
    return events, strongest, trip_evidence


def production_evidence(tele, durations, peers):
    day = [(s,d) for s,d in zip(tele,durations)
           if s.pvgis_expected_kw > 0 and s.status not in (TRIP,DERATE)]
    expected = sum(s.pvgis_expected_kw*d for s,d in day)
    ratio = sum(s.pv_power_kw*d for s,d in day)/expected if expected else 1
    peer_ratios = []
    for samples in peers.values():
        actual = reference = coverage = 0
        for s,d in day:
            for m in range(s.minute_of_day,s.minute_of_day+d):
                n = samples.get(m)
                if n is not None and n.expected_kw > 0 and n.status == InverterStatus.NORMAL:
                    actual += n.pv_power_kw; reference += n.expected_kw; coverage += 1
        if reference and coverage >= 120:
            peer_ratios.append(actual/reference)
    weather_ratio = median(peer_ratios) if len(peer_ratios) >= 2 else None
    offline = any(s.status == InverterStatus.OFFLINE for s,d in day)
    explicit_fault = any(s.error_code and any(code in s.error_code.lower() for code in (
        "device fault", "inverter fault", "string fault")) for s,d in day)
    return ratio, weather_ratio, offline, explicit_fault
