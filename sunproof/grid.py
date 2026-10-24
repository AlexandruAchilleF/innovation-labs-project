"""
Low-voltage distribution grid simulator (digital twin of a street) for SunProof.

One simulation = one transformer station (PT 20/0.4 kV) + its radial feeders + every house connected
to them, minute by minute for a whole day. Nothing about the grid outcome is scripted:
inverter trips emerge from the physics.

Physics per minute
------------------
1. Each house decides its injection: clear-sky PV (PVGIS-shaped, per orientation and longitude) limited by
   the inverter state (tripped / reconnect ramp 10% Pn/min / Volt-Watt), battery dispatch, household load.
2. Phase currents (phasors, load convention) are summed downstream along every feeder.
3. Voltages are swept from the transformer: E·(1+tap)·MV(t) - Z_trafo·I_total, then for every cable segment
   V_phase -= Z_seg·I_down and V_neutral += Z_n·ΣI_down. Single-phase injection therefore raises its own
   phase through the phase AND neutral conductor (loop impedance) - the reason phase imbalance hurts.
4. Inverter terminal voltage = PCC (smart meter) voltage + I_inverter·R_internal_cable.
5. Protection: U >= trip threshold -> disconnect (EN 50549-1: 1.1·Un = 253V). Reconnection only after the
   voltage stays below threshold - 2V for `reconnect_delay_min`, then the output ramps at 10% Pn/min.
   The resulting trip -> voltage drop -> reconnect -> trip cycle is exactly what prosumers see at noon.

Every minute of every house strictly satisfies
    P_pv - P_load - P_batt == P_export - P_import
"""

from __future__ import annotations

import cmath
import math
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from sunproof.models import (
    BatteryMode,
    FeederDaySummary,
    GridFaultCause,
    GridHouse,
    GridPhase,
    HouseDaySummary,
    InstallationFault,
    InverterBatteryConfig,
    InverterBrand,
    InverterStatus,
    Neighborhood,
    NeighborhoodGridAnalysis,
    PanelOrientation,
    TransformerMinuteSample,
    VoltageProfilePoint,
)


# ============================================================================
# 1. CONSTANTS (EN 50160 / EN 50549-1 / typical Romanian LV equipment)
# ============================================================================

V_NOMINAL_LN_V = 230.0
V_NOMINAL_LL_V = 400.0
EN50549_OVERVOLTAGE_TRIP_V = 253.0  # 1.10 · Un
EN50160_MIN_VOLTAGE_V = 207.0  # 0.90 · Un
VOLT_WATT_START_V = 248.0
VOLT_WATT_STOP_V = 253.0
RECONNECT_HYSTERESIS_V = 2.0
RECONNECT_RAMP_FRACTION_PER_MIN = 0.10  # EN 50549-1: max 10% Pn/min after reconnection
RHO_CU_OHM_MM2_PER_M = 0.0178

# Service drop (branșament) NFA2X 16 mm² Al
SERVICE_DROP_R_OHM_PER_KM = 1.91
SERVICE_DROP_X_OHM_PER_KM = 0.09

# Solar geometry for 18 August (EEST), referenced to Bucharest; other cities shift with longitude
SUNRISE_MIN = 6 * 60 + 15
SUNSET_MIN = 20 * 60 + 15
REFERENCE_LONGITUDE_DEG = 26.1
PV_PEAK_AC_FACTOR = 0.86  # hot August day, cell temperature ~52°C

STRING_FAULT_FACTOR = 0.50
SOILING_FACTOR = 0.82

_PHASES: Tuple[str, str, str] = ("L1", "L2", "L3")
_ROTATION = {
    "L1": complex(1.0, 0.0),
    "L2": cmath.exp(-2j * math.pi / 3.0),
    "L3": cmath.exp(2j * math.pi / 3.0),
}

_TRIP_CODES: Dict[InverterBrand, str] = {
    InverterBrand.HUAWEI: "2034 - Grid Overvoltage",
    InverterBrand.FRONIUS: "102 - AC voltage too high",
    InverterBrand.GROWATT: "300 - AC V Outrange",
    InverterBrand.SMA: "301 - Grid fault (overvoltage)",
    InverterBrand.SOLAREDGE: "Grid overvoltage (U>)",
    InverterBrand.DEYE: "Grid overvoltage (U>)",
    InverterBrand.VICTRON: "Grid overvoltage (U>)",
}
DEVICE_FAULT_CODE = "Device fault - inverter oprit (necesită intervenție)"


def minute_to_hhmm(minute_of_day: int) -> str:
    return f"{minute_of_day // 60:02d}:{minute_of_day % 60:02d}"


def overvoltage_error_code(brand: Optional[InverterBrand]) -> str:
    if brand is None:
        return "Grid overvoltage (U>)"
    return _TRIP_CODES.get(brand, "Grid overvoltage (U>)")


def solar_shift_minutes(longitude_deg: float) -> int:
    """Solar noon moves 4 minutes later for every degree west of Bucharest."""
    return int(round((REFERENCE_LONGITUDE_DEG - longitude_deg) * 4.0))


# ============================================================================
# 2. PRODUCTION & CONSUMPTION PROFILES
# ============================================================================

def clear_sky_pv_kw(
    minute_of_day: int,
    installed_kw: float,
    solar_shift_min: int = 0,
    orientation: PanelOrientation = PanelOrientation.SOUTH,
) -> float:
    """
    PVGIS-shaped clear-sky AC output for an August day in Romania.
    East/West arrays peak earlier/later and lower; East-West is flatter.
    """
    if installed_kw <= 0.0:
        return 0.0
    m = minute_of_day - solar_shift_min
    if m <= SUNRISE_MIN or m >= SUNSET_MIN:
        return 0.0

    u = (m - SUNRISE_MIN) / (SUNSET_MIN - SUNRISE_MIN)
    bell = math.sin(math.pi * u) ** 1.65
    east_gain = 0.88 * (1.0 + 0.38 * math.cos(math.pi * u))
    west_gain = 0.88 * (1.0 - 0.38 * math.cos(math.pi * u))
    if orientation == PanelOrientation.EAST:
        gain = east_gain
    elif orientation == PanelOrientation.WEST:
        gain = west_gain
    elif orientation == PanelOrientation.EAST_WEST:
        gain = 0.5 * (east_gain + west_gain)
    else:
        gain = 1.0

    # Deterministic small ripple so it looks like real sensor telemetry (same sky for the whole street)
    ripple = 1.0 - 0.025 * math.sin(minute_of_day * 0.17) ** 2
    return round(max(0.0, installed_kw * PV_PEAK_AC_FACTOR * bell * gain * ripple), 3)


@dataclass
class _LoadShape:
    base_kw: float
    evening_peak_kw: float
    morning_peak_kw: float
    midday_kw: float
    ac_kw: float
    ev_kw: float
    shift_min: int
    noise: Tuple[float, float, float, float]  # (f1, p1, f2, p2)
    appliance_events: List[Tuple[int, int, float]]  # (start, end, kW)


def _build_load_shape(house: GridHouse) -> _LoadShape:
    if house.load_noise_seed == 0:
        noise = (0.31, 0.0, 0.13, 0.0)
        events: List[Tuple[int, int, float]] = []
    else:
        rng = random.Random(f"load-{house.load_noise_seed}")
        noise = (rng.uniform(0.21, 0.37), rng.uniform(0.0, 6.28), rng.uniform(0.09, 0.17), rng.uniform(0.0, 6.28))
        events = []
        # Washing machine / oven / kettle bursts typical in StoreNet traces
        for _ in range(rng.randint(2, 4)):
            start = rng.randint(7 * 60, 22 * 60)
            events.append((start, start + rng.randint(4, 40), rng.uniform(0.8, 2.0)))
    return _LoadShape(
        base_kw=house.base_load_kw,
        evening_peak_kw=house.evening_peak_kw,
        morning_peak_kw=house.morning_peak_kw,
        midday_kw=house.midday_load_kw,
        ac_kw=house.ac_cooling_kw,
        ev_kw=house.ev_charger_kw,
        shift_min=house.load_time_shift_min,
        noise=noise,
        appliance_events=events,
    )


def household_load_kw(minute_of_day: int, shape: _LoadShape) -> float:
    """
    Residential consumption curve (StoreNet / OPSD pattern):
    base load, morning routine (~07:45), midday cooking (~13:00), evening family peak (~20:00),
    optional afternoon AC (heat wave) and evening EV charging.
    """
    h = (minute_of_day - shape.shift_min) / 60.0
    load = shape.base_kw
    load += shape.morning_peak_kw * math.exp(-((h - 7.75) / 0.65) ** 2)
    load += shape.midday_kw * math.exp(-((h - 13.0) / 1.1) ** 2)
    load += shape.evening_peak_kw * math.exp(-((h - 20.1) / 1.65) ** 2)
    if shape.ac_kw > 0.0:
        load += shape.ac_kw * math.exp(-((h - 15.5) / 2.0) ** 4)
    if shape.ev_kw > 0.0 and 19 * 60 + 10 <= minute_of_day - shape.shift_min < 20 * 60 + 25:
        load += shape.ev_kw
    for start, end, kw in shape.appliance_events:
        if start <= minute_of_day < end:
            load += kw
    f1, p1, f2, p2 = shape.noise
    load += 0.08 * math.sin(minute_of_day * f1 + p1) + 0.05 * math.cos(minute_of_day * f2 + p2)
    return round(max(0.22, load), 3)


# ============================================================================
# 3. BATTERY DISPATCH (SHARED WITH THE WHAT-IF SIMULATOR)
# ============================================================================

def initial_battery_soc_pct(cfg: InverterBatteryConfig) -> float:
    """Start of day SoC: evening discharge leaves the battery at its reserve (BACKUP mode sits high)."""
    if not cfg.has_battery or cfg.usable_capacity_kwh <= 0.0:
        return 0.0
    soc = max(cfg.configured_min_soc_pct, 22.0)
    if cfg.configured_mode == BatteryMode.BACKUP_RESERVE:
        soc = max(cfg.configured_min_soc_pct, 85.0)
    return soc


def dispatch_battery(
    pv_kw: float,
    load_kw: float,
    soc_pct: float,
    cfg: InverterBatteryConfig,
) -> Tuple[float, float]:
    """
    One minute of BMS dispatch. Returns (battery_power_kw, new_soc_pct);
    battery_power_kw: + charging from PV surplus, - discharging to cover the house.
    """
    if not cfg.has_battery or cfg.usable_capacity_kwh <= 0.0:
        return 0.0, soc_pct

    dt_hours = 1.0 / 60.0
    cap_kwh = cfg.usable_capacity_kwh
    max_kw = cfg.max_charge_discharge_kw
    min_soc = cfg.configured_min_soc_pct
    surplus_kw = pv_kw - load_kw

    if surplus_kw > 0.0 and soc_pct < 100.0:
        charge_kw = min(surplus_kw, max_kw, ((100.0 - soc_pct) / 100.0) * cap_kwh / dt_hours)
        batt_kw = round(max(0.0, charge_kw), 3)
        soc_pct = min(100.0, soc_pct + (batt_kw * dt_hours * 0.96 / cap_kwh) * 100.0)
        return batt_kw, soc_pct

    if surplus_kw < 0.0:
        can_discharge = cfg.configured_mode != BatteryMode.BACKUP_RESERVE and soc_pct > min_soc + 0.05
        if can_discharge:
            available_kwh = ((soc_pct - min_soc) / 100.0) * cap_kwh
            discharge_kw = min(-surplus_kw, max_kw, available_kwh / dt_hours)
            batt_kw = -round(max(0.0, discharge_kw), 3)
            soc_pct = max(min_soc, soc_pct - (abs(batt_kw) * dt_hours / (cap_kwh * 0.96)) * 100.0)
            return batt_kw, soc_pct

    return 0.0, soc_pct


# ============================================================================
# 4. SIMULATION STATE & TRACES
# ============================================================================

@dataclass
class HouseTrace:
    """Minute-by-minute physical truth for one house (plain lists: fast, no validation in the hot loop)."""
    house: GridHouse
    pv_kw: List[float] = field(default_factory=list)
    expected_kw: List[float] = field(default_factory=list)
    load_kw: List[float] = field(default_factory=list)
    battery_kw: List[float] = field(default_factory=list)
    soc_pct: List[float] = field(default_factory=list)
    import_kw: List[float] = field(default_factory=list)
    export_kw: List[float] = field(default_factory=list)
    pcc_voltage_v: List[float] = field(default_factory=list)
    inverter_voltage_v: List[float] = field(default_factory=list)
    status: List[InverterStatus] = field(default_factory=list)
    error_code: List[Optional[str]] = field(default_factory=list)
    trip_events: int = 0
    first_trip_minute: Optional[int] = None


@dataclass
class _InverterState:
    tripped: bool = False
    ok_minutes: int = 0
    ramp_fraction: float = 1.0
    volt_watt_fraction: float = 1.0
    soc_pct: float = 0.0
    prev_pcc_v: float = V_NOMINAL_LN_V


@dataclass
class _FeederMinute:
    head_current_a: float
    max_pcc_v: float
    max_phase_v: Tuple[float, float, float]  # highest phase-neutral voltage along the feeder, per phase


@dataclass
class NeighborhoodSimulation:
    neighborhood: Neighborhood
    traces: Dict[str, HouseTrace]
    transformer: List[TransformerMinuteSample]
    feeder_minutes: Dict[str, List[_FeederMinute]]


def _internal_cable_resistance_ohm(house: GridHouse) -> float:
    """R = ρ·L/S per conductor; single-phase loop = phase + neutral (2·L)."""
    one_way = RHO_CU_OHM_MM2_PER_M * house.internal_ac_cable_length_m / max(1.5, house.internal_ac_cable_section_mm2)
    return one_way if house.phase == GridPhase.THREE_PHASE else 2.0 * one_way


def _transformer_impedance_ohm(nb: Neighborhood) -> complex:
    t = nb.transformer
    z_base = V_NOMINAL_LL_V ** 2 / (t.rated_kva * 1000.0)
    z_abs = (t.short_circuit_impedance_pct / 100.0) * z_base
    r = z_abs / math.sqrt(1.0 + t.x_over_r ** 2)
    return complex(r, r * t.x_over_r)


def _mv_voltage_factor(minute: int, nb: Neighborhood) -> float:
    """20 kV feeder voltage seen at the PT primary: rises at noon (regional PV), dips at the evening peak."""
    h = minute / 60.0
    t = nb.transformer
    noon = (t.mv_noon_rise_pct / 100.0) * math.exp(-((h - 13.2) / 2.1) ** 2)
    evening = (t.mv_evening_dip_pct / 100.0) * math.exp(-((h - 20.3) / 1.6) ** 2)
    return 1.0 + noon - evening


# ============================================================================
# 5. THE SIMULATOR
# ============================================================================

def simulate_neighborhood(nb: Neighborhood) -> NeighborhoodSimulation:
    """Runs the coupled 1-minute power-flow + inverter-protection + battery simulation for a whole PT."""
    shift = solar_shift_minutes(nb.longitude)
    z_tr = _transformer_impedance_ohm(nb)
    tap = 1.0 + nb.transformer.tap_setting_pct / 100.0
    rated_kva = nb.transformer.rated_kva

    houses = nb.houses
    n_houses = len(houses)
    idx_of = {h.house_id: i for i, h in enumerate(houses)}

    feeder_cables = {f.feeder_id: f.cable for f in nb.feeders}
    feeder_order: Dict[str, List[int]] = {f.feeder_id: [] for f in nb.feeders}
    for i, h in enumerate(houses):
        if h.feeder_id not in feeder_order:
            raise ValueError(f"House {h.house_id} references unknown feeder {h.feeder_id}")
        feeder_order[h.feeder_id].append(i)
    for fid in feeder_order:
        feeder_order[fid].sort(key=lambda i: houses[i].distance_from_transformer_m)

    # Precompute segment impedances per feeder
    segments: Dict[str, List[Tuple[int, complex, complex]]] = {}
    for f in nb.feeders:
        cable = feeder_cables[f.feeder_id]
        prev_d = 0
        segs = []
        for i in feeder_order[f.feeder_id]:
            d = houses[i].distance_from_transformer_m
            if d > f.length_m:
                raise ValueError(f"House {houses[i].house_id} at {d} m is beyond feeder {f.feeder_id} ({f.length_m} m)")
            length_km = max(0, d - prev_d) / 1000.0
            z_phase = complex(cable.r_phase_ohm_per_km, cable.x_phase_ohm_per_km) * length_km
            z_neutral = complex(cable.r_neutral_ohm_per_km, cable.x_phase_ohm_per_km) * length_km
            segs.append((i, z_phase, z_neutral))
            prev_d = d
        segments[f.feeder_id] = segs

    z_drop = [
        complex(SERVICE_DROP_R_OHM_PER_KM, SERVICE_DROP_X_OHM_PER_KM) * (h.service_drop_length_m / 1000.0)
        for h in houses
    ]
    r_internal = [_internal_cable_resistance_ohm(h) for h in houses]
    load_shapes = [_build_load_shape(h) for h in houses]
    phase_idx = [None if h.phase == GridPhase.THREE_PHASE else _PHASES.index(h.phase.value) for h in houses]
    trip_code = [overvoltage_error_code(h.inverter_brand) for h in houses]
    health = []
    for h in houses:
        if h.fault == InstallationFault.STRING_FAULT:
            health.append(STRING_FAULT_FACTOR)
        elif h.fault == InstallationFault.SOILING_DEGRADATION:
            health.append(SOILING_FACTOR)
        else:
            health.append(1.0)

    states = [_InverterState(soc_pct=initial_battery_soc_pct(h.battery_config)) for h in houses]
    traces = {h.house_id: HouseTrace(house=h) for h in houses}
    trace_list = [traces[h.house_id] for h in houses]
    transformer_samples: List[TransformerMinuteSample] = []
    feeder_minutes: Dict[str, List[_FeederMinute]] = {f.feeder_id: [] for f in nb.feeders}

    cloud_events = [(c.start_minute, c.end_minute, c.irradiance_factor) for c in nb.cloud_events]

    # Per-minute scratch buffers
    net_kw = [0.0] * n_houses
    inv_kw = [0.0] * n_houses
    status_now: List[InverterStatus] = [InverterStatus.STANDBY_NIGHT] * n_houses
    house_currents: List[Tuple[complex, complex, complex]] = [(0j, 0j, 0j)] * n_houses
    pcc_v = [V_NOMINAL_LN_V] * n_houses

    for minute in range(1440):
        cloud = 1.0
        for start, end, factor in cloud_events:
            if start <= minute <= end:
                cloud = min(cloud, factor)

        total_pv_kw = 0.0
        # ---- 1. Each house decides its power ----
        for i, h in enumerate(houses):
            st = states[i]
            tr = trace_list[i]
            expected = clear_sky_pv_kw(minute, h.installed_pv_kw, shift, h.orientation)
            available = round(expected * health[i] * cloud, 3)
            load = household_load_kw(minute, load_shapes[i])
            error: Optional[str] = None
            battery_allowed = True

            if h.installed_pv_kw <= 0.0:
                status = InverterStatus.STANDBY_NIGHT
                pv = 0.0
                battery_allowed = False
            elif h.fault == InstallationFault.INVERTER_DEVICE_FAULT:
                status = InverterStatus.OFFLINE
                pv = 0.0
                error = DEVICE_FAULT_CODE
                battery_allowed = False  # hybrid inverter down -> battery unreachable
            elif expected <= 0.0:
                status = InverterStatus.STANDBY_NIGHT
                pv = 0.0
                st.tripped = False
                st.ok_minutes = 0
                st.ramp_fraction = 1.0
                st.volt_watt_fraction = 1.0
            elif st.tripped:
                status = InverterStatus.TRIPPED_OVERVOLTAGE
                pv = 0.0
                error = trip_code[i]
                battery_allowed = False  # disconnected from grid, no backup island
            else:
                st.ramp_fraction = min(1.0, st.ramp_fraction + RECONNECT_RAMP_FRACTION_PER_MIN)
                cap_kw = st.ramp_fraction * h.installed_pv_kw
                pv = min(available, cap_kw)
                status = InverterStatus.NORMAL
                if h.volt_watt_enabled:
                    vw_cap_kw = st.volt_watt_fraction * h.installed_pv_kw
                    if vw_cap_kw < pv - 0.02:
                        pv = vw_cap_kw
                        status = InverterStatus.DERATING
                pv = round(max(0.0, pv), 3)

            if battery_allowed:
                batt, st.soc_pct = dispatch_battery(pv, load, st.soc_pct, h.battery_config)
            else:
                batt = 0.0

            net = pv - load - batt
            if net >= 0.0:
                exp_kw, imp_kw = round(net, 3), 0.0
            else:
                exp_kw, imp_kw = 0.0, round(-net, 3)

            net_kw[i] = exp_kw - imp_kw
            inv_kw[i] = pv - batt
            status_now[i] = status
            total_pv_kw += pv

            tr.pv_kw.append(pv)
            tr.expected_kw.append(expected)
            tr.load_kw.append(load)
            tr.battery_kw.append(batt)
            tr.soc_pct.append(round(st.soc_pct, 2))
            tr.import_kw.append(imp_kw)
            tr.export_kw.append(exp_kw)
            tr.status.append(status)
            tr.error_code.append(error)

            # Phase currents in load convention (+ = consumption); injection is negative
            v_ref = max(200.0, st.prev_pcc_v)
            if phase_idx[i] is None:
                i_mag = -(net_kw[i] * 1000.0 / 3.0) / v_ref
                house_currents[i] = (
                    i_mag * _ROTATION["L1"], i_mag * _ROTATION["L2"], i_mag * _ROTATION["L3"]
                )
            else:
                p = phase_idx[i]
                i_mag = -(net_kw[i] * 1000.0) / v_ref
                c = [0j, 0j, 0j]
                c[p] = i_mag * _ROTATION[_PHASES[p]]
                house_currents[i] = (c[0], c[1], c[2])

        # ---- 2. Downstream current sums per feeder ----
        down: Dict[str, List[Tuple[complex, complex, complex]]] = {}
        total_i = [0j, 0j, 0j]
        for fid, segs in segments.items():
            acc = [0j, 0j, 0j]
            rev: List[Tuple[complex, complex, complex]] = []
            for i, _, _ in reversed(segs):
                c = house_currents[i]
                acc[0] += c[0]
                acc[1] += c[1]
                acc[2] += c[2]
                rev.append((acc[0], acc[1], acc[2]))
            rev.reverse()
            down[fid] = rev
            if rev:
                total_i[0] += rev[0][0]
                total_i[1] += rev[0][1]
                total_i[2] += rev[0][2]

        # ---- 3. Voltage sweep from the transformer ----
        e_mag = V_NOMINAL_LN_V * tap * _mv_voltage_factor(minute, nb)
        v_bus = [e_mag * _ROTATION[p] - z_tr * total_i[k] for k, p in enumerate(_PHASES)]

        for fid, segs in segments.items():
            v = list(v_bus)
            n_pot = 0j
            fmax = 0.0
            ph_max = [abs(v_bus[0]), abs(v_bus[1]), abs(v_bus[2])]
            for (i, z_ph, z_n), d_cur in zip(segs, down[fid]):
                v[0] -= z_ph * d_cur[0]
                v[1] -= z_ph * d_cur[1]
                v[2] -= z_ph * d_cur[2]
                n_pot += z_n * (d_cur[0] + d_cur[1] + d_cur[2])
                for k in range(3):
                    vk = abs(v[k] - n_pot)
                    if vk > ph_max[k]:
                        ph_max[k] = vk
                c = house_currents[i]
                zd = z_drop[i]
                n_house = n_pot + zd * (c[0] + c[1] + c[2])
                if phase_idx[i] is None:
                    vh = max(abs(v[k] - zd * c[k] - n_house) for k in range(3))
                else:
                    k = phase_idx[i]
                    vh = abs(v[k] - zd * c[k] - n_house)
                pcc_v[i] = vh
                if vh > fmax:
                    fmax = vh
            head = down[fid][0] if down[fid] else (0j, 0j, 0j)
            feeder_minutes[fid].append(
                _FeederMinute(
                    head_current_a=max(abs(head[0]), abs(head[1]), abs(head[2])),
                    max_pcc_v=fmax,
                    max_phase_v=(ph_max[0], ph_max[1], ph_max[2]),
                )
            )

        # ---- 4. Terminal voltages & protection ----
        tripped_count = 0
        derating_count = 0
        max_house_v = 0.0
        for i, h in enumerate(houses):
            st = states[i]
            tr = trace_list[i]
            v_pcc = pcc_v[i]
            st.prev_pcc_v = v_pcc
            if h.installed_pv_kw > 0.0:
                i_inv = (inv_kw[i] * 1000.0 / (3.0 if phase_idx[i] is None else 1.0)) / max(200.0, v_pcc)
                v_term = v_pcc + max(-2.5, i_inv * r_internal[i])
            else:
                v_term = v_pcc
            if status_now[i] == InverterStatus.OFFLINE:
                v_inverter_reported = 0.0
            else:
                v_inverter_reported = v_term
            tr.pcc_voltage_v.append(round(v_pcc, 2))
            tr.inverter_voltage_v.append(round(v_inverter_reported, 2))
            max_house_v = max(max_house_v, v_pcc)

            if status_now[i] == InverterStatus.TRIPPED_OVERVOLTAGE:
                tripped_count += 1
                if v_term < h.trip_threshold_v - RECONNECT_HYSTERESIS_V:
                    st.ok_minutes += 1
                else:
                    st.ok_minutes = 0
                if st.ok_minutes >= h.reconnect_delay_min:
                    st.tripped = False
                    st.ok_minutes = 0
                    st.ramp_fraction = 0.0
            elif status_now[i] in (InverterStatus.NORMAL, InverterStatus.DERATING):
                if status_now[i] == InverterStatus.DERATING:
                    derating_count += 1
                if v_term >= h.trip_threshold_v:
                    st.tripped = True
                    st.ok_minutes = 0
                    tr.trip_events += 1
                    if tr.first_trip_minute is None:
                        tr.first_trip_minute = minute
                if h.volt_watt_enabled:
                    if v_term <= VOLT_WATT_START_V:
                        target = 1.0
                    else:
                        target = max(0.0, (VOLT_WATT_STOP_V - v_term) / (VOLT_WATT_STOP_V - VOLT_WATT_START_V))
                    # First-order response (τ ≈ 1 min) keeps the P(U) loop stable at 1-min resolution
                    st.volt_watt_fraction += 0.5 * (target - st.volt_watt_fraction)

        # ---- 5. Transformer power flow ----
        s_total = sum(v_bus[k] * total_i[k].conjugate() for k in range(3))
        apparent_kva = sum(abs(v_bus[k]) * abs(total_i[k]) for k in range(3)) / 1000.0
        transformer_samples.append(
            TransformerMinuteSample.model_construct(
                minute_of_day=minute,
                timestamp=minute_to_hhmm(minute),
                active_power_kw=round(s_total.real / 1000.0, 2),
                apparent_power_kva=round(apparent_kva, 2),
                loading_pct=round(apparent_kva / rated_kva * 100.0, 1),
                busbar_voltage_v=round(max(abs(v) for v in v_bus), 2),
                max_house_voltage_v=round(max_house_v, 2),
                pv_production_kw=round(total_pv_kw, 2),
                houses_tripped=tripped_count,
                houses_derating=derating_count,
            )
        )

    return NeighborhoodSimulation(
        neighborhood=nb,
        traces=traces,
        transformer=transformer_samples,
        feeder_minutes=feeder_minutes,
    )


# ============================================================================
# 6. DAY SUMMARY & DISTRIBUTOR-FACING DIAGNOSIS
# ============================================================================

_STATUS_SEVERITY = {
    InverterStatus.TRIPPED_OVERVOLTAGE: 4,
    InverterStatus.OFFLINE: 3,
    InverterStatus.DERATING: 2,
    InverterStatus.NORMAL: 1,
    InverterStatus.STANDBY_NIGHT: 0,
}


def truth_grid_cause(trace: HouseTrace) -> GridFaultCause:
    """Ground-truth root cause for the house (what the engine must find without seeing this)."""
    h = trace.house
    if h.installed_pv_kw <= 0.0:
        return GridFaultCause.NONE
    if h.fault in (
        InstallationFault.INVERTER_DEVICE_FAULT,
        InstallationFault.STRING_FAULT,
        InstallationFault.SOILING_DEGRADATION,
    ):
        return GridFaultCause.LOCAL_EQUIPMENT_FAULT
    if trace.trip_events > 0:
        if h.fault == InstallationFault.WRONG_TRIP_THRESHOLD:
            return GridFaultCause.LOCAL_OVERVOLTAGE_SENSITIVITY
        if h.fault == InstallationFault.UNDERSIZED_AC_CABLE:
            return GridFaultCause.LOCAL_CABLE_IMPEDANCE
        return GridFaultCause.GRID_OVERVOLTAGE
    return GridFaultCause.NONE


def _house_summary(trace: HouseTrace) -> HouseDaySummary:
    h = trace.house
    dt = 1.0 / 60.0
    pcc_15 = []
    worst_15 = []
    for idx in range(96):
        chunk = trace.pcc_voltage_v[idx * 15:(idx + 1) * 15]
        pcc_15.append(round(sum(chunk) / len(chunk), 2))
        statuses = trace.status[idx * 15:(idx + 1) * 15]
        worst_15.append(max(statuses, key=lambda s: _STATUS_SEVERITY[s]))
    produced = sum(trace.pv_kw) * dt
    expected = sum(trace.expected_kw) * dt
    return HouseDaySummary(
        house_id=h.house_id,
        household_id=h.client.household_id if h.client else None,
        monitored=h.monitored,
        feeder_id=h.feeder_id,
        distance_m=h.distance_from_transformer_m,
        phase=h.phase.value,
        installed_pv_kw=h.installed_pv_kw,
        has_battery=h.battery_config.has_battery,
        x_m=h.x_m,
        y_m=h.y_m,
        max_pcc_voltage_v=max(trace.pcc_voltage_v),
        min_pcc_voltage_v=min(trace.pcc_voltage_v),
        max_inverter_voltage_v=max(trace.inverter_voltage_v),
        trip_events=trace.trip_events,
        trip_minutes=sum(1 for s in trace.status if s == InverterStatus.TRIPPED_OVERVOLTAGE),
        derating_minutes=sum(1 for s in trace.status if s == InverterStatus.DERATING),
        produced_kwh=round(produced, 2),
        expected_kwh=round(expected, 2),
        lost_kwh=round(max(0.0, expected - produced), 2),
        first_trip_time=minute_to_hhmm(trace.first_trip_minute) if trace.first_trip_minute is not None else None,
        pcc_voltage_15m=pcc_15,
        worst_status_15m=worst_15,
        fault=h.fault,
        truth_grid_cause=truth_grid_cause(trace),
    )


def summarize_neighborhood(
    sim: NeighborhoodSimulation,
    date_analyzed: str,
    headline_ro: str,
    explanation_ro: str,
    recommended_action_ro: str,
    what_if_label_ro: Optional[str] = None,
) -> NeighborhoodGridAnalysis:
    nb = sim.neighborhood
    houses = nb.houses
    traces = sim.traces
    house_summaries = [_house_summary(traces[h.house_id]) for h in houses]

    # Network-wide voltage extremes (PCC = what the distributor is responsible for)
    max_v, max_m, min_v, min_m = 0.0, 0, 999.0, 0
    for h in houses:
        tr = traces[h.house_id]
        for m, v in enumerate(tr.pcc_voltage_v):
            if v > max_v:
                max_v, max_m = v, m
            if v < min_v:
                min_v, min_m = v, m

    minutes_above = sum(1 for s in sim.transformer if s.max_house_voltage_v >= EN50549_OVERVOLTAGE_TRIP_V)

    peak_phase_v: Dict[str, float] = {
        p: round(max(fm.max_phase_v[k] for fms in sim.feeder_minutes.values() for fm in fms), 2)
        for k, p in enumerate(_PHASES)
    }
    phase_pv: Dict[str, float] = {p: 0.0 for p in _PHASES}
    for h in houses:
        if h.phase == GridPhase.THREE_PHASE:
            for p in _PHASES:
                phase_pv[p] += h.installed_pv_kw / 3.0
        else:
            phase_pv[h.phase.value] += h.installed_pv_kw

    reverse = min(sim.transformer, key=lambda s: s.active_power_kw)
    peak_reverse_kw = max(0.0, -reverse.active_power_kw)
    peak_reverse_loading = reverse.loading_pct if reverse.active_power_kw < 0 else 0.0

    feeders: List[FeederDaySummary] = []
    for f in nb.feeders:
        f_houses = [h for h in houses if h.feeder_id == f.feeder_id]
        fm = sim.feeder_minutes[f.feeder_id]
        f_max_v, f_max_m, f_min_v, f_min_m = 0.0, 0, 999.0, 0
        for h in f_houses:
            for m, v in enumerate(traces[h.house_id].pcc_voltage_v):
                if v > f_max_v:
                    f_max_v, f_max_m = v, m
                if v < f_min_v:
                    f_min_v, f_min_m = v, m
        # Reverse current = feeder head current while the feeder is a net exporter (around noon)
        peak_rev = 0.0
        for m, fmin in enumerate(fm):
            exporting = sum(traces[h.house_id].export_kw[m] - traces[h.house_id].import_kw[m] for h in f_houses) > 0
            if exporting:
                peak_rev = max(peak_rev, fmin.head_current_a)
        feeders.append(
            FeederDaySummary(
                feeder_id=f.feeder_id,
                street_name=f.street_name,
                cable_code=f.cable.code,
                length_m=f.length_m,
                houses_count=len(f_houses),
                pv_houses_count=sum(1 for h in f_houses if h.installed_pv_kw > 0),
                installed_pv_kw=round(sum(h.installed_pv_kw for h in f_houses), 1),
                max_voltage_v=round(f_max_v, 2) if f_houses else 0.0,
                max_voltage_time=minute_to_hhmm(f_max_m),
                min_voltage_v=round(f_min_v, 2) if f_houses else 0.0,
                min_voltage_time=minute_to_hhmm(f_min_m),
                minutes_above_253v=sum(1 for x in fm if x.max_pcc_v >= EN50549_OVERVOLTAGE_TRIP_V),
                peak_reverse_current_a=round(peak_rev, 1),
                peak_loading_pct_of_ampacity=round(peak_rev / f.cable.ampacity_a * 100.0, 1),
                houses_tripped=sum(1 for h in f_houses if traces[h.house_id].trip_events > 0),
            )
        )

    profile = [
        VoltageProfilePoint(
            house_id=h.house_id,
            feeder_id=h.feeder_id,
            distance_m=h.distance_from_transformer_m,
            phase=h.phase.value,
            voltage_v=traces[h.house_id].pcc_voltage_v[max_m],
            status=traces[h.house_id].status[max_m],
            monitored=h.monitored,
        )
        for h in sorted(houses, key=lambda x: (x.feeder_id, x.distance_from_transformer_m))
    ]

    installed_pv = round(sum(h.installed_pv_kw for h in houses), 1)
    return NeighborhoodGridAnalysis(
        neighborhood_id=nb.neighborhood_id,
        name_ro=nb.name_ro,
        city=nb.city,
        county=nb.county,
        latitude=nb.latitude,
        longitude=nb.longitude,
        description_ro=nb.description_ro,
        date_analyzed=date_analyzed,
        what_if_label_ro=what_if_label_ro,
        transformer_id=nb.transformer.transformer_id,
        transformer_name=nb.transformer.name,
        rated_kva=nb.transformer.rated_kva,
        tap_setting_pct=nb.transformer.tap_setting_pct,
        distribution_operator=nb.transformer.distribution_operator,
        stress_cause=nb.designed_stress_cause,
        houses_total=len(houses),
        pv_houses=sum(1 for h in houses if h.installed_pv_kw > 0),
        battery_houses=sum(1 for h in houses if h.battery_config.has_battery),
        monitored_households=sum(1 for h in houses if h.monitored),
        monitored_household_ids=[h.client.household_id for h in houses if h.client],
        installed_pv_kw=installed_pv,
        pv_to_transformer_ratio_pct=round(installed_pv / nb.transformer.rated_kva * 100.0, 1),
        phase_installed_pv_kw={p: round(v, 1) for p, v in phase_pv.items()},
        max_voltage_v=round(max_v, 2),
        max_voltage_time=minute_to_hhmm(max_m),
        min_voltage_v=round(min_v, 2),
        min_voltage_time=minute_to_hhmm(min_m),
        minutes_above_253v=minutes_above,
        peak_phase_voltage_v=peak_phase_v,
        houses_tripped=sum(1 for s in house_summaries if s.trip_events > 0),
        trip_events_total=sum(s.trip_events for s in house_summaries),
        lost_energy_kwh=round(sum(s.lost_kwh for s in house_summaries), 1),
        peak_reverse_power_kw=round(peak_reverse_kw, 1),
        peak_reverse_loading_pct=round(peak_reverse_loading, 1),
        peak_reverse_time=reverse.timestamp,
        peak_voltage_minute=max_m,
        headline_ro=headline_ro,
        explanation_ro=explanation_ro,
        recommended_distributor_action_ro=recommended_action_ro,
        feeders=feeders,
        houses=house_summaries,
        transformer_timeseries=sim.transformer,
        voltage_profile_at_peak=profile,
    )
