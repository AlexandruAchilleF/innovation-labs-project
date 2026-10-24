"""
Catalog of simulated low-voltage neighborhoods (cartiere) for SunProof.

Each neighborhood is a complete street-level network: transformer station, feeders with real Romanian
conductor types, and every connected house (consumers and prosumers, monitored or not).
Houses are generated deterministically (seeded by the neighborhood id), then the curated demo
households and the injected installation faults are placed on top.

The 8 networks cover every way a PV-heavy LV network fails, plus healthy references:

| Cartier                      | PT     | Stress                         | Demo household            |
|------------------------------|--------|--------------------------------|---------------------------|
| Dumbrăvița (TM)              | PT-04  | Feeder voltage rise (TYIR 50)  | RO-TM-001 grid + battery  |
| Corbeanca (IF)               | PT-11  | healthy                        | RO-IF-002 local threshold |
| Cluj-Napoca Zorilor (CJ)     | PT-09  | healthy                        | RO-CJ-003 battery backup  |
| Brașov Răcădău (BV)          | PT-02  | healthy + passing cloud        | RO-BV-004 missing export  |
| București Aviației (B)       | PT-18  | healthy                        | RO-B-005 explained bill   |
| Giroc (TM)                   | PT-27  | Phase imbalance (L1)           | generated                 |
| Florești (CJ)                | PT-33  | Transformer tap +5%            | generated                 |
| Bragadiru (IF)               | PT-41  | Transformer reverse overload   | generated                 |
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple

from sunproof.models import (
    BatteryMode,
    BillingVerdictStatus,
    CableSpec,
    CloudEvent,
    CustomerBatteryIntent,
    DistributionOperator,
    FeederLine,
    GridHouse,
    GridPhase,
    GridStressCause,
    InstallationFault,
    InverterBatteryConfig,
    InverterBrand,
    Neighborhood,
    PanelOrientation,
    SupplierClientProfile,
    TransformerStation,
)


# ============================================================================
# 1. CONDUCTOR CATALOG (values at ~50°C operating temperature)
# ============================================================================

CABLES: Dict[str, CableSpec] = {
    "TYIR_3x50": CableSpec(
        code="TYIR 3x50+50 Al",
        description_ro="Linie aeriană torsadată 3x50 mm² Al (rețea rurală veche, extinsă pentru cartiere noi)",
        r_phase_ohm_per_km=0.720,
        x_phase_ohm_per_km=0.100,
        r_neutral_ohm_per_km=0.720,
        ampacity_a=150.0,
    ),
    "TYIR_3x70": CableSpec(
        code="TYIR 3x70+54.6 Al",
        description_ro="Linie aeriană torsadată 3x70 mm² Al (standard periurban)",
        r_phase_ohm_per_km=0.500,
        x_phase_ohm_per_km=0.095,
        r_neutral_ohm_per_km=0.700,
        ampacity_a=190.0,
    ),
    "TYIR_3x95": CableSpec(
        code="TYIR 3x95+70 Al",
        description_ro="Linie aeriană torsadată 3x95 mm² Al (conductor de întărire)",
        r_phase_ohm_per_km=0.360,
        x_phase_ohm_per_km=0.090,
        r_neutral_ohm_per_km=0.500,
        ampacity_a=240.0,
    ),
    "ACYABY_3x150": CableSpec(
        code="ACYAbY 3x150+70 Al",
        description_ro="Cablu subteran 3x150 mm² Al",
        r_phase_ohm_per_km=0.230,
        x_phase_ohm_per_km=0.080,
        r_neutral_ohm_per_km=0.490,
        ampacity_a=270.0,
    ),
    "ACYABY_3x240": CableSpec(
        code="ACYAbY 3x240+120 Al",
        description_ro="Cablu subteran 3x240 mm² Al (rețea urbană)",
        r_phase_ohm_per_km=0.145,
        x_phase_ohm_per_km=0.078,
        r_neutral_ohm_per_km=0.290,
        ampacity_a=360.0,
    ),
}


# ============================================================================
# 2. EQUIPMENT & NAME POOLS
# ============================================================================

# Romanian prosumer market: ~70% Chinese inverters, ~60% of those Huawei
_BRAND_WEIGHTS: List[Tuple[InverterBrand, float]] = [
    (InverterBrand.HUAWEI, 0.42),
    (InverterBrand.DEYE, 0.13),
    (InverterBrand.GROWATT, 0.11),
    (InverterBrand.FRONIUS, 0.11),
    (InverterBrand.SOLAREDGE, 0.08),
    (InverterBrand.SMA, 0.09),
    (InverterBrand.VICTRON, 0.06),
]

_PV_SIZES_KW: List[Tuple[float, float]] = [
    (3.0, 0.07), (4.0, 0.10), (5.0, 0.17), (6.0, 0.20), (8.0, 0.20), (10.0, 0.19), (12.0, 0.07),
]

_ORIENTATIONS: List[Tuple[PanelOrientation, float]] = [
    (PanelOrientation.SOUTH, 0.55),
    (PanelOrientation.EAST_WEST, 0.20),
    (PanelOrientation.EAST, 0.12),
    (PanelOrientation.WEST, 0.13),
]

_FIRST_NAMES = [
    "Andrei", "Ioana", "Mihai", "Elena", "Alexandru", "Maria", "Gabriel", "Ana", "Bogdan", "Raluca",
    "Cristian", "Simona", "Florin", "Diana", "Adrian", "Laura", "Ionuț", "Roxana", "Sorin", "Alina",
    "Vlad", "Irina", "Radu", "Oana", "Cătălin", "Monica", "Marius", "Corina", "Paul", "Teodora",
]
_LAST_NAMES = [
    "Popa", "Stan", "Dinu", "Matei", "Lungu", "Neagu", "Barbu", "Ilie", "Toma", "Marin",
    "Constantin", "Stoica", "Moldovan", "Rusu", "Mureșan", "Oprea", "Vasile", "Sima", "Pop", "Cozma",
    "Ardelean", "Nistor", "Florea", "Enache", "Gheorghe", "Tudor", "Voicu", "Șerban", "Cristea", "Lazăr",
]

_POD_PREFIX = {"TM": "RO002E", "IF": "RO001E", "B": "RO001E", "CJ": "RO005E", "BV": "RO006E"}


def _weighted(rng: random.Random, items: List[Tuple[object, float]]):
    total = sum(w for _, w in items)
    x = rng.uniform(0.0, total)
    acc = 0.0
    for item, w in items:
        acc += w
        if x <= acc:
            return item
    return items[-1][0]


def inverter_model_name(brand: InverterBrand, kw: float, three_phase: bool) -> str:
    k = int(round(kw))
    if brand == InverterBrand.HUAWEI:
        return f"Huawei SUN2000-{k}KTL-M1" if three_phase else f"Huawei SUN2000-{min(k, 6)}KTL-L1"
    if brand == InverterBrand.DEYE:
        return f"Deye SUN-{k}K-SG04LP3-EU" if three_phase else f"Deye SUN-{min(k, 6)}K-SG04LP1-EU"
    if brand == InverterBrand.GROWATT:
        return f"Growatt MOD {k}KTL3-XH" if three_phase else f"Growatt MIN {min(k, 6)}000TL-XH"
    if brand == InverterBrand.FRONIUS:
        return f"Fronius Symo GEN24 {k}.0 Plus" if three_phase else f"Fronius Primo GEN24 {min(k, 6)}.0 Plus"
    if brand == InverterBrand.SOLAREDGE:
        return f"SolarEdge SE{k}K" if three_phase else f"SolarEdge SE{min(k, 6)}000H"
    if brand == InverterBrand.SMA:
        return f"SMA Sunny Tripower {k}.0" if three_phase else f"SMA Sunny Boy {min(k, 6)}.0"
    return f"Victron MultiPlus-II 48/{min(k, 8)}000"


def _battery_hardware(brand: InverterBrand, rng: random.Random) -> Tuple[str, float, float, str]:
    """Returns (model, usable kWh, max kW, vendor app path for the reserve setting)."""
    if brand == InverterBrand.HUAWEI:
        kwh = rng.choice([5.0, 10.0, 10.0, 15.0])
        return (f"Huawei LUNA2000-{int(kwh)}-S0 ({kwh:.0f} kWh)", kwh, 2.5 if kwh == 5.0 else 5.0,
                "FusionSolar App → Dispozitive → LUNA2000 → Parametri Funcționare → End-of-Discharge SoC")
    if brand == InverterBrand.DEYE:
        n = rng.choice([1, 2, 2, 3])
        return (f"Deye SE-G5.1 Pro-B x{n} ({5.1 * n:.1f} kWh)", round(5.1 * n, 1), min(5.0, 2.5 * n),
                "Solarman Smart → Work Mode → Battery Setting → Shutdown / Low Batt SoC")
    if brand == InverterBrand.GROWATT:
        kwh = rng.choice([5.1, 7.7, 10.2])
        return (f"Growatt ARK {kwh} HV ({kwh} kWh)", kwh, 5.0,
                "ShinePhone → Configurare → Battery → Discharge Stop SoC")
    if brand == InverterBrand.SOLAREDGE:
        return ("SolarEdge Home Battery 9.7 kWh", 9.7, 5.0,
                "mySolarEdge → Setări → Backup Reserve")
    if brand == InverterBrand.VICTRON:
        n = rng.choice([2, 3])
        return (f"Pylontech US5000 x{n} ({4.8 * n:.1f} kWh)", round(4.8 * n, 1), 5.0,
                "VictronConnect / VRM → ESS → Minimum SoC (unless grid fails)")
    kwh = rng.choice([7.7, 10.2, 12.8])
    app = ("Fronius Solar.web → Setări → Management Energie → Limitele bateriei" if brand == InverterBrand.FRONIUS
           else "SMA Sunny Portal → Configurare → Battery → Minimum SoC")
    return (f"BYD Battery-Box Premium HVS {kwh} ({kwh} kWh)", kwh, 5.0, app)


# ============================================================================
# 3. DETERMINISTIC HOUSE GENERATOR
# ============================================================================

@dataclass
class FeederPlan:
    """How to populate one feeder."""
    feeder: FeederLine
    houses: int
    pv_share: float
    single_phase_share: float = 0.55  # share of PV systems ≤ 6 kW connected single-phase
    phase_weights: Tuple[float, float, float] = (1 / 3, 1 / 3, 1 / 3)
    battery_share: float = 0.39  # ANRE: ~39% of prosumers had storage in August 2026
    volt_watt_share: float = 0.10
    ev_share: float = 0.06
    big_pv: bool = False  # newer / larger systems (8-12 kW, mostly 3-phase)
    max_pv_kw: float = 12.0  # small houses on narrow plots -> small single-phase systems
    first_house_m: int = 25


@dataclass
class NeighborhoodPlan:
    neighborhood_id: str
    name_ro: str
    city: str
    county: str
    county_code: str
    latitude: float
    longitude: float
    description_ro: str
    stress: GridStressCause
    transformer: TransformerStation
    feeders: List[FeederPlan]
    monitored_share: float = 0.5
    cloud_events: List[CloudEvent] = field(default_factory=list)
    # (feeder_id, position index on feeder) -> function(house, rng) -> house
    specials: Dict[Tuple[str, int], Callable[[GridHouse, random.Random], GridHouse]] = field(default_factory=dict)


def _with(house: GridHouse, **updates) -> GridHouse:
    """Validated copy of a house with some fields replaced."""
    data = house.model_dump()
    for key, value in updates.items():
        data[key] = value.model_dump() if hasattr(value, "model_dump") else value
    return GridHouse.model_validate(data)


def _generate_feeder_houses(
    nb_plan: NeighborhoodPlan,
    plan: FeederPlan,
    rng: random.Random,
) -> List[GridHouse]:
    f = plan.feeder
    pt_code = nb_plan.transformer.transformer_id.replace("-", "")
    feeder_no = f.feeder_id.split("-")[-1]
    span = f.length_m - plan.first_house_m - 5
    step = span / max(1, plan.houses - 1)
    bearing = math.radians(f.bearing_deg)
    houses: List[GridHouse] = []

    for k in range(plan.houses):
        d = int(round(plan.first_house_m + k * step + rng.uniform(-0.25, 0.25) * step))
        d = max(10, min(f.length_m, d))
        if houses and d <= houses[-1].distance_from_transformer_m:
            d = houses[-1].distance_from_transformer_m + 3
        side = 1 if k % 2 == 0 else -1
        number = 2 * k + (1 if side > 0 else 2)
        x = d * math.sin(bearing) + side * 14.0 * math.cos(bearing)
        y = d * math.cos(bearing) - side * 14.0 * math.sin(bearing)

        has_pv = rng.random() < plan.pv_share
        if has_pv:
            pv_kw = _weighted(rng, _PV_SIZES_KW)
            if plan.big_pv:
                pv_kw = max(pv_kw, rng.choice([8.0, 10.0, 10.0, 12.0]))
            pv_kw = min(pv_kw, plan.max_pv_kw)
            brand = _weighted(rng, _BRAND_WEIGHTS)
            if brand == InverterBrand.VICTRON:
                pv_kw = min(pv_kw, 6.0)
            single = pv_kw <= 6.0 and rng.random() < plan.single_phase_share
            if brand == InverterBrand.VICTRON:
                single = True
        else:
            pv_kw, brand, single = 0.0, None, rng.random() < 0.7

        if single and has_pv:
            # Installers' habit: single-phase inverters land on whichever phase is first in the panel
            phase = _weighted(rng, [(GridPhase.L1, plan.phase_weights[0]),
                                    (GridPhase.L2, plan.phase_weights[1]),
                                    (GridPhase.L3, plan.phase_weights[2])])
        elif single:
            phase = rng.choice([GridPhase.L1, GridPhase.L2, GridPhase.L3])
        else:
            phase = GridPhase.THREE_PHASE

        battery = InverterBatteryConfig(has_battery=False, battery_brand_model="Fără baterie",
                                        configured_mode=BatteryMode.NO_BATTERY)
        if has_pv and rng.random() < plan.battery_share:
            model, kwh, kw, app = _battery_hardware(brand, rng)
            battery = InverterBatteryConfig(
                has_battery=True,
                battery_brand_model=model,
                usable_capacity_kwh=kwh,
                max_charge_discharge_kw=kw,
                configured_mode=BatteryMode.MAX_SELF_CONSUMPTION,
                configured_min_soc_pct=rng.choice([10.0, 15.0, 20.0, 20.0, 25.0, 30.0]),
                grid_charge_enabled=False,
                state_of_health_pct=round(rng.uniform(96.0, 99.8), 1),
                app_setting_path_ro=app,
            )

        three = phase == GridPhase.THREE_PHASE
        houses.append(GridHouse(
            house_id=f"{pt_code}-{feeder_no}-H{k + 1:02d}",
            feeder_id=f.feeder_id,
            distance_from_transformer_m=d,
            street_number=number,
            phase=phase,
            x_m=round(x, 1),
            y_m=round(y, 1),
            service_drop_length_m=round(rng.uniform(12.0, 35.0), 1),
            installed_pv_kw=pv_kw,
            orientation=_weighted(rng, _ORIENTATIONS) if has_pv else PanelOrientation.SOUTH,
            inverter_brand=brand,
            inverter_model=inverter_model_name(brand, pv_kw, three) if has_pv else "",
            trip_threshold_v=253.0,
            volt_watt_enabled=has_pv and rng.random() < plan.volt_watt_share,
            reconnect_delay_min=rng.choice([2, 3, 5, 5]),
            internal_ac_cable_section_mm2=rng.choice([6.0, 6.0, 10.0]) if three else 6.0,
            internal_ac_cable_length_m=round(rng.uniform(6.0, 15.0), 1),
            battery_config=battery,
            base_load_kw=round(rng.uniform(0.30, 0.60), 2),
            evening_peak_kw=round(rng.uniform(1.8, 3.4), 2),
            morning_peak_kw=round(rng.uniform(0.8, 1.4), 2),
            midday_load_kw=round(rng.uniform(0.3, 0.8), 2),
            ac_cooling_kw=round(rng.uniform(0.6, 1.5), 2) if rng.random() < 0.45 else 0.0,
            ev_charger_kw=(11.0 if three else 7.4) if rng.random() < plan.ev_share else 0.0,
            load_time_shift_min=rng.randint(-40, 40),
            load_noise_seed=rng.randint(1, 999_999),
        ))
    return houses


@dataclass
class _IdAllocator:
    next_seq: int = 6

    def take(self, county_code: str) -> str:
        hid = f"RO-{county_code}-{self.next_seq:03d}"
        self.next_seq += 1
        return hid


def _client_for(house: GridHouse, nb_plan: NeighborhoodPlan, street: str, household_id: str,
                rng: random.Random) -> SupplierClientProfile:
    cfg = house.battery_config
    if cfg.has_battery:
        intent = CustomerBatteryIntent(
            goal_description_ro=rng.choice([
                "Vreau să folosesc bateria seara și să păstrez o rezervă mică pentru pene de curent.",
                "Bateria să acopere consumul de seară ca factura să fie cât mai mică.",
                "Autoconsum maxim; rezervă minimă pentru frigider dacă pică rețeaua.",
            ]),
            desired_mode=BatteryMode.MAX_SELF_CONSUMPTION,
            desired_min_soc_pct=max(5.0, cfg.configured_min_soc_pct),
            evening_discharge_allowed=True,
            wants_supplier_storage_bonus=rng.random() < 0.7,
        )
    else:
        intent = CustomerBatteryIntent(
            goal_description_ro="Nu am baterie; vreau ca panourile să producă la capacitate maximă.",
            desired_mode=BatteryMode.NO_BATTERY,
            desired_min_soc_pct=20.0,
            evening_discharge_allowed=False,
            wants_supplier_storage_bonus=False,
        )
    digits = "".join(str(rng.randint(0, 9)) for _ in range(9))
    return SupplierClientProfile(
        household_id=household_id,
        customer_name=f"{rng.choice(_FIRST_NAMES)} {rng.choice(_LAST_NAMES)}",
        street_address=f"{street} nr. {house.street_number}",
        pod_code=f"{_POD_PREFIX.get(nb_plan.county_code, 'RO001E')}{digits}",
        battery_intent=intent,
    )


def _build_neighborhood(plan: NeighborhoodPlan, ids: _IdAllocator) -> Neighborhood:
    rng = random.Random(f"sunproof-{plan.neighborhood_id}")
    houses: List[GridHouse] = []
    for fp in plan.feeders:
        generated = _generate_feeder_houses(plan, fp, rng)
        for k, house in enumerate(generated):
            special = plan.specials.get((fp.feeder.feeder_id, k))
            if special is not None:
                house = special(house, rng)
            elif house.installed_pv_kw > 0 and rng.random() < plan.monitored_share:
                house = _with(house, client=_client_for(
                    house, plan, fp.feeder.street_name, ids.take(plan.county_code), rng))
            houses.append(house)

    return Neighborhood(
        neighborhood_id=plan.neighborhood_id,
        name_ro=plan.name_ro,
        city=plan.city,
        county=plan.county,
        county_code=plan.county_code,
        latitude=plan.latitude,
        longitude=plan.longitude,
        description_ro=plan.description_ro,
        designed_stress_cause=plan.stress,
        transformer=plan.transformer,
        feeders=[fp.feeder for fp in plan.feeders],
        houses=houses,
        cloud_events=plan.cloud_events,
    )


# ============================================================================
# 4. SPECIAL HOUSES: CURATED DEMO STORIES & INJECTED FAULTS
# ============================================================================

def _story(
    household_id: str,
    customer_name: str,
    street_address: str,
    pod_code: str,
    intent: CustomerBatteryIntent,
    billing: BillingVerdictStatus = BillingVerdictStatus.INVOICE_VALID_EXPLAINED,
    **house_updates,
) -> Callable[[GridHouse, random.Random], GridHouse]:
    def apply(house: GridHouse, _rng: random.Random) -> GridHouse:
        client = SupplierClientProfile(
            household_id=household_id,
            customer_name=customer_name,
            street_address=street_address,
            pod_code=pod_code,
            battery_intent=intent,
            billing_anomaly=billing,
        )
        return _with(house, client=client, **house_updates)
    return apply


def _monitored_fault(
    ids: _IdAllocator,
    plan_ref: List[NeighborhoodPlan],
    street: str,
    fault: InstallationFault = InstallationFault.NONE,
    battery: Optional[str] = None,  # "reserve_80" | "backup"
    billing: BillingVerdictStatus = BillingVerdictStatus.INVOICE_VALID_EXPLAINED,
    **house_updates,
) -> Callable[[GridHouse, random.Random], GridHouse]:
    """A generated monitored house with a deliberate defect (installation, battery or invoice)."""
    def apply(house: GridHouse, rng: random.Random) -> GridHouse:
        plan = plan_ref[0]
        updates = dict(house_updates)
        if house.installed_pv_kw <= 0.0 and "installed_pv_kw" not in updates:
            updates.update(installed_pv_kw=6.0, inverter_brand=InverterBrand.HUAWEI,
                           inverter_model=inverter_model_name(InverterBrand.HUAWEI, 6.0,
                                                              house.phase == GridPhase.THREE_PHASE))
        if fault != InstallationFault.NONE:
            updates["fault"] = fault
        house = _with(house, **updates)

        desired_soc = None
        if battery is not None:
            brand = house.inverter_brand or InverterBrand.HUAWEI
            cfg = house.battery_config
            if not cfg.has_battery:
                model, kwh, kw, app = _battery_hardware(brand, rng)
                cfg = InverterBatteryConfig(has_battery=True, battery_brand_model=model, usable_capacity_kwh=kwh,
                                            max_charge_discharge_kw=kw, app_setting_path_ro=app,
                                            configured_mode=BatteryMode.MAX_SELF_CONSUMPTION,
                                            configured_min_soc_pct=20.0)
            desired_soc = 20.0
            if battery == "reserve_80":
                cfg = cfg.model_copy(update={"configured_min_soc_pct": 80.0,
                                             "configured_mode": BatteryMode.MAX_SELF_CONSUMPTION})
            else:
                cfg = cfg.model_copy(update={"configured_min_soc_pct": 85.0,
                                             "configured_mode": BatteryMode.BACKUP_RESERVE})
            house = _with(house, battery_config=cfg)

        client = _client_for(house, plan, street, ids.take(plan.county_code), rng)
        if desired_soc is not None:
            client = client.model_copy(update={"battery_intent": client.battery_intent.model_copy(update={
                "desired_mode": BatteryMode.MAX_SELF_CONSUMPTION,
                "desired_min_soc_pct": desired_soc,
                "evening_discharge_allowed": True,
                "wants_supplier_storage_bonus": True,
            })})
        client = client.model_copy(update={"billing_anomaly": billing})
        return _with(house, client=client)
    return apply


# ============================================================================
# 5. THE 8 NEIGHBORHOODS
# ============================================================================

def _feeder(fid: str, street: str, cable: str, length_m: int, bearing: float) -> FeederLine:
    return FeederLine(feeder_id=fid, street_name=street, cable=CABLES[cable], length_m=length_m, bearing_deg=bearing)


def _plans(ids: _IdAllocator) -> List[NeighborhoodPlan]:
    plans: List[NeighborhoodPlan] = []

    # ---------------------------------------------------------------- Dumbrăvița
    ref: List[NeighborhoodPlan] = []
    p = NeighborhoodPlan(
        neighborhood_id="NB-TM-DUMBRAVITA",
        name_ro="Dumbrăvița — Str. Soarelui",
        city="Dumbrăvița",
        county="Timiș",
        county_code="TM",
        latitude=45.7975,
        longitude=21.2430,
        description_ro=(
            "Cartier nou lângă Timișoara, construit pe o rețea rurală veche. Str. Soarelui e alimentată printr-o "
            "linie aeriană TYIR 3x70 de 760 m, iar aproape fiecare casă are panouri de 8-12 kW."
        ),
        stress=GridStressCause.FEEDER_VOLTAGE_RISE,
        transformer=TransformerStation(
            transformer_id="PT-04", name="PT-04 Dumbrăvița", rated_kva=250.0, tap_setting_pct=2.5,
            mv_noon_rise_pct=0.6, distribution_operator=DistributionOperator.if_reteaua_electrica,
        ),
        feeders=[
            FeederPlan(_feeder("PT04-F1", "Str. Soarelui", "TYIR_3x70", 760, 75.0), houses=16, pv_share=0.85,
                       big_pv=True, single_phase_share=0.6, phase_weights=(0.5, 0.25, 0.25)),
            FeederPlan(_feeder("PT04-F2", "Str. Liliacului", "TYIR_3x70", 420, 190.0), houses=10, pv_share=0.6),
            FeederPlan(_feeder("PT04-F3", "Str. Petőfi Sándor", "ACYABY_3x150", 260, 310.0), houses=8,
                       pv_share=0.4),
        ],
        monitored_share=0.5,
    )
    ref.append(p)
    p.specials = {
        ("PT04-F1", 10): _story(
            "RO-TM-001", "Andrei Popescu", "Str. Soarelui nr. 14", "RO002E145892001",
            CustomerBatteryIntent(
                goal_description_ro="Vreau să folosesc bateria seara ca să nu mai plătesc curent scump; păstrează doar 20% rezervă de avarie.",
                desired_mode=BatteryMode.MAX_SELF_CONSUMPTION, desired_min_soc_pct=20.0,
                evening_discharge_allowed=True, wants_supplier_storage_bonus=True,
            ),
            street_number=14, phase=GridPhase.THREE_PHASE, installed_pv_kw=8.0,
            orientation=PanelOrientation.SOUTH, inverter_brand=InverterBrand.HUAWEI,
            inverter_model="Huawei SUN2000-8KTL-M1", trip_threshold_v=253.0, volt_watt_enabled=False,
            reconnect_delay_min=2, internal_ac_cable_section_mm2=6.0, internal_ac_cable_length_m=10.0,
            fault=InstallationFault.NONE,
            battery_config=InverterBatteryConfig(
                has_battery=True, battery_brand_model="Huawei LUNA2000-10-S0 (10 kWh)", usable_capacity_kwh=10.0,
                max_charge_discharge_kw=5.0, configured_mode=BatteryMode.MAX_SELF_CONSUMPTION,
                configured_min_soc_pct=80.0, grid_charge_enabled=False, state_of_health_pct=99.0,
                app_setting_path_ro="FusionSolar App → Dispozitive → LUNA2000 → Parametri Funcționare → End-of-Discharge SoC (schimbă din 80% în 20%)",
            ),
            base_load_kw=0.45, evening_peak_kw=2.85, morning_peak_kw=1.15, midday_load_kw=0.55,
            ac_cooling_kw=0.0, ev_charger_kw=0.0, load_time_shift_min=0, load_noise_seed=0,
        ),
        ("PT04-F1", 13): _monitored_fault(ids, ref, "Str. Soarelui", battery="backup"),
        ("PT04-F2", 4): _monitored_fault(ids, ref, "Str. Liliacului",
                                         billing=BillingVerdictStatus.MISSING_EXPORT_INDEX),
    }
    plans.append(p)

    # ---------------------------------------------------------------- Corbeanca
    ref = []
    p = NeighborhoodPlan(
        neighborhood_id="NB-IF-CORBEANCA",
        name_ro="Corbeanca — Str. Pădurii",
        city="Corbeanca",
        county="Ilfov",
        county_code="IF",
        latitude=44.6040,
        longitude=26.0480,
        description_ro=(
            "Rețea subterană nouă (ACYAbY 3x150) cu transformator de 400 kVA și puțini prosumatori. "
            "Tensiunea pe stradă rămâne sub 240 V toată ziua: orice oprire aici e o problemă a instalației."
        ),
        stress=GridStressCause.NONE,
        transformer=TransformerStation(
            transformer_id="PT-11", name="PT-11 Corbeanca", rated_kva=400.0, tap_setting_pct=0.0,
            mv_noon_rise_pct=0.4, distribution_operator=DistributionOperator.if_reteaua_electrica,
        ),
        feeders=[
            FeederPlan(_feeder("PT11-F1", "Str. Pădurii", "ACYABY_3x150", 380, 20.0), houses=12, pv_share=0.45),
            FeederPlan(_feeder("PT11-F2", "Str. Teilor", "ACYABY_3x150", 300, 120.0), houses=10, pv_share=0.4),
        ],
        monitored_share=0.6,
    )
    ref.append(p)
    p.specials = {
        ("PT11-F1", 4): _story(
            "RO-IF-002", "Elena Ionescu", "Str. Pădurii nr. 8", "RO001E992310442",
            CustomerBatteryIntent(
                goal_description_ro="Nu am baterie momentan; vreau ca panourile să producă la capacitate maximă.",
                desired_mode=BatteryMode.NO_BATTERY, desired_min_soc_pct=20.0,
                evening_discharge_allowed=False, wants_supplier_storage_bonus=False,
            ),
            street_number=8, phase=GridPhase.L1, installed_pv_kw=6.0, orientation=PanelOrientation.SOUTH,
            inverter_brand=InverterBrand.HUAWEI, inverter_model="Huawei SUN2000-6KTL-L1",
            trip_threshold_v=245.0, volt_watt_enabled=False, reconnect_delay_min=2,
            internal_ac_cable_section_mm2=2.5, internal_ac_cable_length_m=38.0,
            fault=InstallationFault.WRONG_TRIP_THRESHOLD,
            battery_config=InverterBatteryConfig(
                has_battery=False, battery_brand_model="Fără baterie (Doar PV 6 kW)",
                configured_mode=BatteryMode.NO_BATTERY,
            ),
            base_load_kw=0.38, evening_peak_kw=2.10, morning_peak_kw=1.15, midday_load_kw=0.55,
            ac_cooling_kw=0.0, ev_charger_kw=0.0, load_time_shift_min=0, load_noise_seed=0,
        ),
        ("PT11-F2", 3): _monitored_fault(ids, ref, "Str. Teilor", fault=InstallationFault.INVERTER_DEVICE_FAULT),
    }
    plans.append(p)

    # ---------------------------------------------------------------- Cluj Zorilor
    ref = []
    p = NeighborhoodPlan(
        neighborhood_id="NB-CJ-ZORILOR",
        name_ro="Cluj-Napoca — Zorilor Sud",
        city="Cluj-Napoca",
        county="Cluj",
        county_code="CJ",
        latitude=46.7495,
        longitude=23.5840,
        description_ro=(
            "Cartier urban de case cu rețea subterană groasă (3x240) și transformator de 630 kVA. "
            "Rețeaua e sănătoasă; problemele de aici sunt bateriile setate greșit."
        ),
        stress=GridStressCause.NONE,
        transformer=TransformerStation(
            transformer_id="PT-09", name="PT-09 Zorilor Sud", rated_kva=630.0, tap_setting_pct=0.0,
            mv_noon_rise_pct=0.5, distribution_operator=DistributionOperator.RETRASIB_DEER,
        ),
        feeders=[
            FeederPlan(_feeder("PT09-F1", "Str. Cireșilor", "ACYABY_3x240", 320, 160.0), houses=12, pv_share=0.5),
            FeederPlan(_feeder("PT09-F2", "Str. Observatorului", "ACYABY_3x240", 400, 250.0), houses=14,
                       pv_share=0.4),
        ],
        monitored_share=0.5,
    )
    ref.append(p)
    p.specials = {
        ("PT09-F1", 5): _story(
            "RO-CJ-003", "Mihai Radu", "Str. Cireșilor nr. 22", "RO005E334190811",
            CustomerBatteryIntent(
                goal_description_ro="Am cumpărat baterie mare de 15 kWh special ca să acopăr tot consumul de seară (aer condiționat, plită, mașină de spălat) și să primesc bonusul de la furnizor.",
                desired_mode=BatteryMode.MAX_SELF_CONSUMPTION, desired_min_soc_pct=15.0,
                evening_discharge_allowed=True, wants_supplier_storage_bonus=True,
            ),
            street_number=22, phase=GridPhase.THREE_PHASE, installed_pv_kw=10.0, orientation=PanelOrientation.SOUTH,
            inverter_brand=InverterBrand.FRONIUS, inverter_model="Fronius Symo GEN24 10.0 Plus",
            trip_threshold_v=253.0, volt_watt_enabled=False, reconnect_delay_min=2,
            internal_ac_cable_section_mm2=10.0, internal_ac_cable_length_m=8.0, fault=InstallationFault.NONE,
            battery_config=InverterBatteryConfig(
                has_battery=True, battery_brand_model="BYD Battery-Box Premium HVS 15.0 (15 kWh)",
                usable_capacity_kwh=15.0, max_charge_discharge_kw=7.5, configured_mode=BatteryMode.BACKUP_RESERVE,
                configured_min_soc_pct=85.0, grid_charge_enabled=False, state_of_health_pct=99.5,
                app_setting_path_ro="Fronius Solar.web → Setări → Management Energie → Mod Baterie: schimbă din 'Backup Power Reserve (85%)' în 'Self-Consumption Optimization (Min SoC 15%)'",
            ),
            base_load_kw=0.55, evening_peak_kw=3.45, morning_peak_kw=1.15, midday_load_kw=0.55,
            ac_cooling_kw=0.0, ev_charger_kw=0.0, load_time_shift_min=0, load_noise_seed=0,
        ),
        ("PT09-F1", 9): _monitored_fault(ids, ref, "Str. Cireșilor", battery="reserve_80"),
        ("PT09-F2", 6): _monitored_fault(ids, ref, "Str. Observatorului", fault=InstallationFault.SOILING_DEGRADATION),
    }
    plans.append(p)

    # ---------------------------------------------------------------- Brașov Răcădău
    ref = []
    p = NeighborhoodPlan(
        neighborhood_id="NB-BV-RACADAU",
        name_ro="Brașov — Răcădău",
        city="Brașov",
        county="Brașov",
        county_code="BV",
        latitude=45.6330,
        longitude=25.6030,
        description_ro=(
            "Cartier de case la poalele Tâmpei, cu rețea subterană și transformator de 400 kVA. La 15:20 trece un nor "
            "peste tot cartierul: producția scade la toate casele deodată, fără nicio oprire de invertor."
        ),
        stress=GridStressCause.NONE,
        transformer=TransformerStation(
            transformer_id="PT-02", name="PT-02 Răcădău", rated_kva=400.0, tap_setting_pct=0.0,
            mv_noon_rise_pct=0.4, distribution_operator=DistributionOperator.RETRASIB_DEER,
        ),
        feeders=[
            FeederPlan(_feeder("PT02-F1", "Str. Molidului", "ACYABY_3x150", 300, 140.0), houses=12, pv_share=0.5),
            FeederPlan(_feeder("PT02-F2", "Str. Brazilor", "ACYABY_3x150", 350, 230.0), houses=12, pv_share=0.45),
        ],
        monitored_share=0.5,
        cloud_events=[CloudEvent(start_minute=15 * 60 + 20, end_minute=15 * 60 + 50, irradiance_factor=0.35)],
    )
    ref.append(p)
    p.specials = {
        ("PT02-F1", 4): _story(
            "RO-BV-004", "Dan Munteanu", "Str. Molidului nr. 5", "RO006E771209334",
            CustomerBatteryIntent(
                goal_description_ro="Autoconsum maxim seara cu rezervă de 20% pentru pene de curent.",
                desired_mode=BatteryMode.MAX_SELF_CONSUMPTION, desired_min_soc_pct=20.0,
                evening_discharge_allowed=True, wants_supplier_storage_bonus=True,
            ),
            billing=BillingVerdictStatus.MISSING_EXPORT_INDEX,
            street_number=5, phase=GridPhase.THREE_PHASE, installed_pv_kw=10.0, orientation=PanelOrientation.SOUTH,
            inverter_brand=InverterBrand.DEYE, inverter_model="Deye SUN-10K-SG04LP3-EU",
            trip_threshold_v=253.0, volt_watt_enabled=False, reconnect_delay_min=2,
            internal_ac_cable_section_mm2=10.0, internal_ac_cable_length_m=9.0, fault=InstallationFault.NONE,
            battery_config=InverterBatteryConfig(
                has_battery=True, battery_brand_model="Deye SE-G5.1 Pro-B (10 kWh)", usable_capacity_kwh=10.0,
                max_charge_discharge_kw=5.0, configured_mode=BatteryMode.MAX_SELF_CONSUMPTION,
                configured_min_soc_pct=20.0, grid_charge_enabled=False, state_of_health_pct=98.5,
                app_setting_path_ro="Solarman Smart / Deye → Work Mode → Selling First / Zero Export to Load (Min SoC 20% — Configurat Corect)",
            ),
            base_load_kw=0.52, evening_peak_kw=2.75, morning_peak_kw=1.15, midday_load_kw=0.55,
            ac_cooling_kw=0.0, ev_charger_kw=0.0, load_time_shift_min=0, load_noise_seed=0,
        ),
        ("PT02-F1", 8): _monitored_fault(ids, ref, "Str. Molidului",
                                         billing=BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE),
        ("PT02-F2", 5): _monitored_fault(ids, ref, "Str. Brazilor", fault=InstallationFault.STRING_FAULT),
    }
    plans.append(p)

    # ---------------------------------------------------------------- București Aviației
    ref = []
    p = NeighborhoodPlan(
        neighborhood_id="NB-B-AVIATIEI",
        name_ro="București — Aviației",
        city="București (Sector 1)",
        county="București",
        county_code="B",
        latitude=44.4810,
        longitude=26.0950,
        description_ro=(
            "Zonă de vile în nordul Bucureștiului, rețea urbană 3x240 și transformator de 630 kVA. Tensiune "
            "stabilă; o singură casă are un cablu AC subțire și lung între invertor și tablou."
        ),
        stress=GridStressCause.NONE,
        transformer=TransformerStation(
            transformer_id="PT-18", name="PT-18 Aviației", rated_kva=630.0, tap_setting_pct=0.0,
            mv_noon_rise_pct=0.4, distribution_operator=DistributionOperator.if_reteaua_electrica,
        ),
        feeders=[
            FeederPlan(_feeder("PT18-F1", "Str. Nicolae Caramfil", "ACYABY_3x240", 360, 10.0), houses=14,
                       pv_share=0.5),
            FeederPlan(_feeder("PT18-F2", "Str. Avionului", "ACYABY_3x240", 300, 100.0), houses=12, pv_share=0.45),
        ],
        monitored_share=0.5,
    )
    ref.append(p)
    p.specials = {
        ("PT18-F1", 3): _story(
            "RO-B-005", "Cristina Dumitrescu", "Str. Nicolae Caramfil nr. 44", "RO001E551829007",
            CustomerBatteryIntent(
                goal_description_ro="Vreau să maximizez autoconsumul zilnic și să las 20% în baterie pentru siguranță.",
                desired_mode=BatteryMode.MAX_SELF_CONSUMPTION, desired_min_soc_pct=20.0,
                evening_discharge_allowed=True, wants_supplier_storage_bonus=True,
            ),
            street_number=44, phase=GridPhase.L1, installed_pv_kw=6.0, orientation=PanelOrientation.SOUTH,
            inverter_brand=InverterBrand.FRONIUS, inverter_model="Fronius Primo GEN24 6.0 Plus",
            trip_threshold_v=253.0, volt_watt_enabled=False, reconnect_delay_min=2,
            internal_ac_cable_section_mm2=6.0, internal_ac_cable_length_m=11.0, fault=InstallationFault.NONE,
            battery_config=InverterBatteryConfig(
                has_battery=True, battery_brand_model="BYD Battery-Box Premium HVS 7.7 (7.7 kWh)",
                usable_capacity_kwh=7.7, max_charge_discharge_kw=5.0, configured_mode=BatteryMode.MAX_SELF_CONSUMPTION,
                configured_min_soc_pct=20.0, grid_charge_enabled=False, state_of_health_pct=99.2,
                app_setting_path_ro="Fronius Solar.web → Mod Autoconsum (Min SoC 20% — Optim)",
            ),
            base_load_kw=0.48, evening_peak_kw=2.25, morning_peak_kw=1.15, midday_load_kw=0.55,
            ac_cooling_kw=0.0, ev_charger_kw=0.0, load_time_shift_min=0, load_noise_seed=0,
        ),
        ("PT18-F2", 7): _monitored_fault(
            ids, ref, "Str. Avionului", fault=InstallationFault.UNDERSIZED_AC_CABLE,
            installed_pv_kw=6.0, phase=GridPhase.L2, inverter_brand=InverterBrand.GROWATT,
            inverter_model="Growatt MIN 6000TL-XH", internal_ac_cable_section_mm2=2.5,
            internal_ac_cable_length_m=65.0, volt_watt_enabled=False, orientation=PanelOrientation.SOUTH,
        ),
        ("PT18-F1", 9): _monitored_fault(ids, ref, "Str. Nicolae Caramfil",
                                         billing=BillingVerdictStatus.MISSING_EXPORT_INDEX),
    }
    plans.append(p)

    # ---------------------------------------------------------------- Giroc (phase imbalance)
    ref = []
    p = NeighborhoodPlan(
        neighborhood_id="NB-TM-GIROC",
        name_ro="Giroc — Str. Mercur",
        city="Giroc",
        county="Timiș",
        county_code="TM",
        latitude=45.6950,
        longitude=21.2360,
        description_ro=(
            "Cartier nou de case mici, toate cu invertoare monofazate de 3-5 kW. Instalatorii le-au "
            "racordat în mare parte pe faza L1, iar transformatorul are doar 160 kVA."
        ),
        stress=GridStressCause.PHASE_IMBALANCE,
        transformer=TransformerStation(
            transformer_id="PT-27", name="PT-27 Giroc", rated_kva=160.0, tap_setting_pct=2.5,
            mv_noon_rise_pct=0.6, distribution_operator=DistributionOperator.if_reteaua_electrica,
        ),
        feeders=[
            FeederPlan(_feeder("PT27-F1", "Str. Mercur", "TYIR_3x70", 400, 200.0), houses=16, pv_share=0.85,
                       max_pv_kw=5.0, single_phase_share=1.0, phase_weights=(0.8, 0.1, 0.1), ev_share=0.0),
            FeederPlan(_feeder("PT27-F2", "Str. Venus", "TYIR_3x70", 320, 110.0), houses=10, pv_share=0.7,
                       max_pv_kw=5.0, single_phase_share=1.0, phase_weights=(0.7, 0.15, 0.15)),
        ],
        monitored_share=0.5,
    )
    ref.append(p)
    p.specials = {
        ("PT27-F1", 7): _monitored_fault(ids, ref, "Str. Mercur", battery="reserve_80",
                                         phase=GridPhase.L1, installed_pv_kw=5.0,
                                         inverter_brand=InverterBrand.HUAWEI,
                                         inverter_model="Huawei SUN2000-5KTL-L1"),
    }
    plans.append(p)

    # ---------------------------------------------------------------- Florești (tap too high)
    ref = []
    p = NeighborhoodPlan(
        neighborhood_id="NB-CJ-FLORESTI",
        name_ro="Florești — Str. Eroilor",
        city="Florești",
        county="Cluj",
        county_code="CJ",
        latitude=46.7480,
        longitude=23.4880,
        description_ro=(
            "Cea mai mare comună-dormitor de lângă Cluj. Transformatorul a fost reglat pe plotul +5% ca să ajungă "
            "tensiune suficientă seara la capăt de linie; acum, la prânz, toată rețeaua pornește deja de sus."
        ),
        stress=GridStressCause.TRANSFORMER_TAP_HIGH,
        transformer=TransformerStation(
            transformer_id="PT-33", name="PT-33 Florești", rated_kva=400.0, tap_setting_pct=5.0,
            mv_noon_rise_pct=1.0, distribution_operator=DistributionOperator.RETRASIB_DEER,
        ),
        feeders=[
            FeederPlan(_feeder("PT33-F1", "Str. Eroilor", "TYIR_3x70", 420, 60.0), houses=14, pv_share=0.85,
                       big_pv=True),
            FeederPlan(_feeder("PT33-F2", "Str. Avram Iancu", "TYIR_3x70", 350, 170.0), houses=12, pv_share=0.8),
            FeederPlan(_feeder("PT33-F3", "Str. Cetății", "TYIR_3x70", 280, 290.0), houses=10, pv_share=0.75),
        ],
        monitored_share=0.45,
    )
    ref.append(p)
    p.specials = {
        ("PT33-F1", 6): _monitored_fault(ids, ref, "Str. Eroilor", battery="backup"),
        ("PT33-F2", 8): _monitored_fault(ids, ref, "Str. Avram Iancu",
                                         billing=BillingVerdictStatus.MISSING_EXPORT_INDEX),
    }
    plans.append(p)

    # ---------------------------------------------------------------- Bragadiru (reverse overload)
    ref = []
    p = NeighborhoodPlan(
        neighborhood_id="NB-IF-BRAGADIRU",
        name_ro="Bragadiru — Str. Gladiolelor",
        city="Bragadiru",
        county="Ilfov",
        county_code="IF",
        latitude=44.3710,
        longitude=25.9750,
        description_ro=(
            "Ansamblu rezidențial cu sisteme mari de 8-12 kW pe aproape fiecare casă, alimentat de un singur "
            "transformator de 160 kVA dimensionat acum 15 ani pentru consum. La prânz puterea curge invers prin "
            "transformator, peste puterea lui nominală."
        ),
        stress=GridStressCause.TRANSFORMER_REVERSE_OVERLOAD,
        transformer=TransformerStation(
            transformer_id="PT-41", name="PT-41 Bragadiru", rated_kva=160.0, tap_setting_pct=0.0,
            mv_noon_rise_pct=0.6, distribution_operator=DistributionOperator.if_reteaua_electrica,
        ),
        feeders=[
            FeederPlan(_feeder("PT41-F1", "Str. Gladiolelor", "ACYABY_3x150", 280, 30.0), houses=16,
                       pv_share=0.92, big_pv=True, single_phase_share=0.2, volt_watt_share=0.3),
            FeederPlan(_feeder("PT41-F2", "Str. Zambilelor", "ACYABY_3x150", 250, 140.0), houses=14,
                       pv_share=0.92, big_pv=True, single_phase_share=0.2, volt_watt_share=0.3),
        ],
        monitored_share=0.5,
    )
    ref.append(p)
    p.specials = {
        ("PT41-F1", 5): _monitored_fault(ids, ref, "Str. Gladiolelor", fault=InstallationFault.STRING_FAULT),
        ("PT41-F2", 9): _monitored_fault(ids, ref, "Str. Zambilelor", battery="backup"),
    }
    plans.append(p)

    return plans


_NEIGHBORHOOD_CACHE: Optional[Dict[str, Neighborhood]] = None


def get_neighborhood_specs() -> Dict[str, Neighborhood]:
    """All neighborhood topologies (cached, deterministic)."""
    global _NEIGHBORHOOD_CACHE
    if _NEIGHBORHOOD_CACHE is None:
        ids = _IdAllocator()
        _NEIGHBORHOOD_CACHE = {}
        for plan in _plans(ids):
            nb = _build_neighborhood(plan, ids)
            _NEIGHBORHOOD_CACHE[nb.neighborhood_id] = nb
    return _NEIGHBORHOOD_CACHE


# ============================================================================
# 6. WHAT-IF RE-SIMULATION (DISTRIBUTOR FIXES & BATTERY SETTINGS)
# ============================================================================

def build_what_if_neighborhood(
    nb: Neighborhood,
    tap_setting_pct: Optional[float] = None,
    transformer_kva: Optional[float] = None,
    feeder_cable_upgrades: Optional[Dict[str, str]] = None,
    rebalance_phases: bool = False,
    enable_volt_watt_all: bool = False,
    battery_overrides: Optional[Dict[str, Tuple[float, Optional[BatteryMode]]]] = None,
) -> Neighborhood:
    """
    Returns a modified copy of the network. `battery_overrides` maps household_id -> (min_soc_pct, mode).
    Nothing is changed in place; the cached catalog stays untouched.
    """
    transformer = nb.transformer
    if tap_setting_pct is not None or transformer_kva is not None:
        transformer = transformer.model_copy(update={
            "tap_setting_pct": transformer.tap_setting_pct if tap_setting_pct is None else float(tap_setting_pct),
            "rated_kva": transformer.rated_kva if transformer_kva is None else float(transformer_kva),
        })

    feeders = list(nb.feeders)
    if feeder_cable_upgrades:
        feeders = [
            f.model_copy(update={"cable": CABLES[feeder_cable_upgrades[f.feeder_id]]})
            if f.feeder_id in feeder_cable_upgrades else f
            for f in feeders
        ]

    houses = list(nb.houses)
    if rebalance_phases:
        # Greedy balancing of the voltage-rise "moment" (kW x m) per phase, for both the noon PV injection
        # and the evening consumption, as a distributor planner would move single-phase service drops.
        phases = [GridPhase.L1, GridPhase.L2, GridPhase.L3]
        for fid in [f.feeder_id for f in nb.feeders]:
            singles = [i for i, h in enumerate(houses)
                       if h.feeder_id == fid and h.phase != GridPhase.THREE_PHASE]
            pv_m = {i: houses[i].installed_pv_kw * houses[i].distance_from_transformer_m for i in singles}
            ld_m = {i: (houses[i].evening_peak_kw + houses[i].ev_charger_kw) * houses[i].distance_from_transformer_m
                    for i in singles}
            total_pv = sum(pv_m.values()) or 1.0
            total_ld = sum(ld_m.values()) or 1.0
            acc_pv = {p: 0.0 for p in phases}
            acc_ld = {p: 0.0 for p in phases}
            for i in sorted(singles, key=lambda i: -(pv_m[i] / total_pv + ld_m[i] / total_ld)):
                best = min(phases, key=lambda p: max((acc_pv[p] + pv_m[i]) / total_pv, (acc_ld[p] + ld_m[i]) / total_ld))
                acc_pv[best] += pv_m[i]
                acc_ld[best] += ld_m[i]
                houses[i] = houses[i].model_copy(update={"phase": best})

    if enable_volt_watt_all:
        houses = [h.model_copy(update={"volt_watt_enabled": True}) if h.installed_pv_kw > 0 else h for h in houses]

    if battery_overrides:
        for i, h in enumerate(houses):
            if h.client is None or h.client.household_id not in battery_overrides:
                continue
            if not h.battery_config.has_battery:
                continue
            min_soc, mode = battery_overrides[h.client.household_id]
            cfg = h.battery_config.model_copy(deep=True)
            cfg.configured_min_soc_pct = float(max(5.0, min(100.0, min_soc)))
            if mode is not None:
                cfg.configured_mode = mode
            elif cfg.configured_mode == BatteryMode.BACKUP_RESERVE and min_soc <= 35.0:
                cfg.configured_mode = BatteryMode.MAX_SELF_CONSUMPTION
            houses[i] = h.model_copy(update={"battery_config": cfg})

    return nb.model_copy(update={"transformer": transformer, "feeders": feeders, "houses": houses})


# ============================================================================
# 7. DISTRIBUTOR-FACING DIAGNOSIS (TEXT GENERATED FROM SIMULATED NUMBERS ONLY)
# ============================================================================

def _fmt(x: float, digits: int = 1) -> str:
    return f"{x:.{digits}f}"


def _worst_feeder(analysis) -> "FeederDaySummary":
    return max(analysis.feeders, key=lambda f: (f.minutes_above_253v, f.max_voltage_v))


def _resolution_note(after, before) -> str:
    resolved = after.houses_tripped == 0 and after.minutes_above_253v == 0
    evening_ok = after.min_voltage_v >= 207.0
    parts = [
        f"tensiune maximă {_fmt(after.max_voltage_v)} V (față de {_fmt(before.max_voltage_v)} V)",
        f"{after.houses_tripped} case deconectate (față de {before.houses_tripped})",
        f"tensiune minimă seara {_fmt(after.min_voltage_v)} V (față de {_fmt(before.min_voltage_v)} V)",
    ]
    if resolved and evening_ok:
        verdict = "rezolvă problema"
    elif not resolved:
        verdict = "NU e suficient"
    elif after.min_voltage_v < before.min_voltage_v:
        verdict = "rezolvă supratensiunea, dar coboară tensiunea serii sub 207 V"
    else:
        verdict = "rezolvă supratensiunea; seara tensiunea rămâne sub 207 V"
    return f"Simulare SunProof: {verdict} — " + ", ".join(parts) + "."


def describe_neighborhood(nb: Neighborhood, analysis, what_ifs: Dict[str, object]) -> Tuple[str, str, str]:
    """Returns (headline, explanation, recommended distributor action) in Romanian."""
    t = analysis
    cause = nb.designed_stress_cause
    tripped_local = [h for h in t.houses if h.trip_events > 0 and h.truth_grid_cause != "GRID_OVERVOLTAGE"]
    common = (
        f"{t.houses_total} branșamente pe {t.transformer_name} ({_fmt(t.rated_kva, 0)} kVA, plot "
        f"{t.tap_setting_pct:+.1f}%), {t.pv_houses} cu panouri ({_fmt(t.installed_pv_kw)} kW instalați, "
        f"{_fmt(t.pv_to_transformer_ratio_pct)}% din puterea transformatorului)."
    )

    if cause == GridStressCause.NONE:
        headline = f"Rețea sănătoasă: tensiune maximă {_fmt(t.max_voltage_v)} V, sub limita de 253 V"
        explanation = common + (
            f" Tensiunea a rămas între {_fmt(t.min_voltage_v)} V și {_fmt(t.max_voltage_v)} V toată ziua."
        )
        if tripped_local:
            explanation += (
                f" {len(tripped_local)} invertor(oare) s-au oprit totuși, fără ca vecinii să fie afectați: "
                "cauza e în instalația locală, nu în rețea."
            )
        return headline, explanation, "Nicio intervenție necesară în rețeaua de distribuție."

    wf = _worst_feeder(t)
    if cause == GridStressCause.FEEDER_VOLTAGE_RISE:
        headline = (
            f"Supratensiune pe {wf.street_name}: {_fmt(wf.max_voltage_v)} V la ora {wf.max_voltage_time}, "
            f"{wf.houses_tripped} case deconectate"
        )
        explanation = common + (
            f" Plecarea {wf.feeder_id} ({wf.cable_code}, {wf.length_m} m) are {wf.pv_houses_count} prosumatori "
            f"cu {_fmt(wf.installed_pv_kw)} kW. La prânz curentul injectat ({_fmt(wf.peak_reverse_current_a)} A) "
            f"ridică tensiunea spre capătul liniei: {wf.minutes_above_253v} minute peste 253 V, "
            f"{t.trip_events_total} deconectări de invertor și {_fmt(t.lost_energy_kwh)} kWh pierduți azi. "
            f"Seara, aceeași linie coboară la {_fmt(wf.min_voltage_v)} V: conductorul e subdimensionat în ambele sensuri."
        )
        action = f"Întărirea plecării {wf.feeder_id} ({wf.street_name})."
        if "cable" in what_ifs:
            action += " " + _resolution_note(what_ifs["cable"], t)
        if "tap" in what_ifs:
            action += " Doar coborârea plotului cu 2.5% nu ajunge. " + _resolution_note(what_ifs["tap"], t)
        return headline, explanation, action

    if cause == GridStressCause.PHASE_IMBALANCE:
        pv = t.phase_installed_pv_kw
        v = t.peak_phase_voltage_v
        headline = (
            f"Dezechilibru de fază pe {t.transformer_id}: L1 urcă la {_fmt(v['L1'])} V, "
            f"L2 / L3 rămân la {_fmt(v['L2'])} / {_fmt(v['L3'])} V"
        )
        explanation = common + (
            f" Pe faza L1 sunt racordați {_fmt(pv['L1'])} kW de panouri, față de {_fmt(pv['L2'])} kW pe L2 și "
            f"{_fmt(pv['L3'])} kW pe L3. Curentul injectat pe o singură fază se întoarce prin conductorul de nul și "
            f"ridică dublu tensiunea pe L1: {t.houses_tripped} case deconectate de {t.trip_events_total} ori, "
            f"{_fmt(t.lost_energy_kwh)} kWh pierduți azi. Seara efectul se inversează: consumul acelorași case "
            f"coboară L1 până la {_fmt(t.min_voltage_v)} V la ora {t.min_voltage_time}."
        )
        action = "Reechilibrarea fazelor: mutarea branșamentelor monofazate de pe L1 pe L2 și L3."
        if "rebalance" in what_ifs:
            action += " " + _resolution_note(what_ifs["rebalance"], t)
        return headline, explanation, action

    if cause == GridStressCause.TRANSFORMER_TAP_HIGH:
        bus = max(s.busbar_voltage_v for s in t.transformer_timeseries)
        headline = (
            f"Plot transformator {t.tap_setting_pct:+.1f}%: rețeaua {t.transformer_id} pornește de la "
            f"{_fmt(bus)} V la prânz, {t.houses_tripped} case deconectate"
        )
        high_feeders = sum(1 for f in t.feeders if f.max_voltage_v > 250.0)
        explanation = common + (
            f" Transformatorul e reglat pe plotul {t.tap_setting_pct:+.1f}%, ca să compenseze căderea de tensiune "
            f"seara. La prânz bara de joasă tensiune ajunge deja la {_fmt(bus)} V, iar pe {high_feeders} din "
            f"{len(t.feeders)} plecări tensiunea trece de 250 V: {t.minutes_above_253v} minute peste 253 V, "
            f"{t.trip_events_total} deconectări, {_fmt(t.lost_energy_kwh)} kWh pierduți azi."
        )
        action = "Coborârea plotului transformatorului de la {:+.1f}% la {:+.1f}%.".format(
            t.tap_setting_pct, t.tap_setting_pct - 5.0)
        if "tap" in what_ifs:
            action += " " + _resolution_note(what_ifs["tap"], t)
        return headline, explanation, action

    # TRANSFORMER_REVERSE_OVERLOAD
    headline = (
        f"Transformatorul de {_fmt(t.rated_kva, 0)} kVA e încărcat {_fmt(t.peak_reverse_loading_pct)}% "
        f"în sens invers la ora {t.peak_reverse_time}"
    )
    explanation = common + (
        f" La prânz {t.transformer_id} trimite {_fmt(t.peak_reverse_power_kw)} kW înapoi în rețeaua de medie "
        f"tensiune, peste puterea lui nominală. Tensiunea rămâne sub 253 V (maxim {_fmt(t.max_voltage_v)} V), "
        "deci invertoarele nu se opresc. Riscul e termic: transformatorul se supraîncălzește în orele de vârf "
        "solar, iar o arsură lasă tot cartierul fără curent."
    )
    action = "Înlocuirea transformatorului cu unul de 400 kVA sau un post de transformare nou."
    if "transformer" in what_ifs:
        after = what_ifs["transformer"]
        action += (
            f" Simulare SunProof cu 400 kVA: încărcare inversă maximă {_fmt(after.peak_reverse_loading_pct)}%, "
            f"tensiune maximă {_fmt(after.max_voltage_v)} V."
        )
    return headline, explanation, action


def recommended_what_ifs(nb: Neighborhood) -> Dict[str, Dict[str, object]]:
    """The distributor fixes worth simulating for each stress type (kwargs for build_what_if_neighborhood)."""
    cause = nb.designed_stress_cause
    t = nb.transformer
    if cause == GridStressCause.FEEDER_VOLTAGE_RISE:
        overhead = {f.feeder_id: "ACYABY_3x240" for f in nb.feeders if f.cable.code.startswith("TYIR")}
        return {
            "cable": {"feeder_cable_upgrades": overhead},
            "tap": {"tap_setting_pct": t.tap_setting_pct - 2.5},
        }
    if cause == GridStressCause.PHASE_IMBALANCE:
        return {"rebalance": {"rebalance_phases": True}}
    if cause == GridStressCause.TRANSFORMER_TAP_HIGH:
        return {"tap": {"tap_setting_pct": t.tap_setting_pct - 5.0}}
    if cause == GridStressCause.TRANSFORMER_REVERSE_OVERLOAD:
        return {"transformer": {"transformer_kva": 400.0}}
    return {}


WHAT_IF_LABELS_RO = {
    "cable": "Plecările aeriene înlocuite cu cablu subteran ACYAbY 3x240",
    "tap": "Plot transformator coborât",
    "rebalance": "Branșamente monofazate reechilibrate pe L1 / L2 / L3",
    "transformer": "Transformator înlocuit cu 400 kVA",
}
