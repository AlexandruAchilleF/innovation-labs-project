"""LV grid topology (transformer -> feeders -> houses), neighborhood simulation results and ground truth."""

from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from sunproof.models.billing_and_battery import (
    CustomerBatteryIntent,
    InverterBatteryConfig,
)
from sunproof.models.enums import (
    BatteryMode,
    BatteryVerdictStatus,
    BillingVerdictStatus,
    DistributionOperator,
    GridFaultCause,
    GridPhase,
    GridStressCause,
    InstallationFault,
    InverterBrand,
    InverterStatus,
    PanelOrientation,
)


class CableSpec(BaseModel):
    """Electrical parameters of a low-voltage conductor (per km, at operating temperature)."""
    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., description="Conductor designation, e.g. 'TYIR 3x50+50 Al'")
    description_ro: str
    r_phase_ohm_per_km: float = Field(..., gt=0.0)
    x_phase_ohm_per_km: float = Field(..., ge=0.0)
    r_neutral_ohm_per_km: float = Field(..., gt=0.0)
    ampacity_a: float = Field(..., gt=0.0, description="Admissible continuous current per phase (A)")


class TransformerStation(BaseModel):
    """MV/LV distribution transformer station (Post de Transformare, 20/0.4 kV)."""
    model_config = ConfigDict(extra="forbid")

    transformer_id: str = Field(..., description="Short station code, e.g. 'PT-04'")
    name: str = Field(..., description="Display name, e.g. 'PT-04 Dumbrăvița'")
    rated_kva: float = Field(..., gt=0.0)
    tap_setting_pct: float = Field(
        default=0.0,
        ge=-5.0,
        le=5.0,
        description="Off-load tap changer position: +5% means 241.5V phase-neutral at no load"
    )
    short_circuit_impedance_pct: float = Field(default=4.0, gt=0.0, description="uk% of the transformer")
    x_over_r: float = Field(default=2.0, gt=0.0)
    mv_noon_rise_pct: float = Field(default=0.5, ge=0.0, description="MV (20 kV) voltage rise at solar noon")
    mv_evening_dip_pct: float = Field(default=0.8, ge=0.0, description="MV voltage dip at the evening peak")
    distribution_operator: DistributionOperator


class FeederLine(BaseModel):
    """One radial LV feeder (plecare) leaving the transformer station along a street."""
    model_config = ConfigDict(extra="forbid")

    feeder_id: str = Field(..., description="e.g. 'PT04-F1'")
    street_name: str
    cable: CableSpec
    length_m: int = Field(..., ge=20, le=2000)
    bearing_deg: float = Field(default=90.0, description="Street direction for the map view (0 = north)")


class CloudEvent(BaseModel):
    """A passing cloud over the whole neighborhood (all houses lose production together, no fault)."""
    model_config = ConfigDict(extra="forbid")

    start_minute: int = Field(..., ge=0, le=1439)
    end_minute: int = Field(..., ge=0, le=1439)
    irradiance_factor: float = Field(..., ge=0.0, le=1.0)


class SupplierClientProfile(BaseModel):
    """
    The POD is a client of our supplier and gave consent for SunProof monitoring.
    Only these houses are visible to the supplier; the rest of the street is physics only.
    """
    model_config = ConfigDict(extra="forbid")

    household_id: str
    customer_name: str
    street_address: str
    pod_code: str
    battery_intent: CustomerBatteryIntent
    billing_anomaly: BillingVerdictStatus = Field(default=BillingVerdictStatus.INVOICE_VALID_EXPLAINED)
    consent_anonymized_neighbor_sharing: bool = Field(
        default=True,
        description="Client agreed that anonymized voltage/production is used as evidence for neighbors on the same PT"
    )


class GridHouse(BaseModel):
    """A single connection point (branșament / POD) on a feeder: consumer or prosumer."""
    model_config = ConfigDict(extra="forbid")

    house_id: str = Field(..., description="Network-side id, e.g. 'PT04-H07'")
    feeder_id: str
    distance_from_transformer_m: int = Field(..., ge=10, le=2000)
    street_number: int = Field(..., ge=1)
    phase: GridPhase
    x_m: float = Field(default=0.0, description="Map x coordinate relative to the PT (m, east)")
    y_m: float = Field(default=0.0, description="Map y coordinate relative to the PT (m, north)")
    service_drop_length_m: float = Field(default=20.0, gt=0.0, le=120.0)

    # PV system (installed_pv_kw == 0 -> pure consumer)
    installed_pv_kw: float = Field(default=0.0, ge=0.0)
    orientation: PanelOrientation = Field(default=PanelOrientation.SOUTH)
    inverter_brand: Optional[InverterBrand] = None
    inverter_model: str = Field(default="")
    trip_threshold_v: float = Field(default=253.0, ge=230.0, le=270.0)
    volt_watt_enabled: bool = Field(default=False, description="P(U) curtailment 248V -> 253V enabled")
    reconnect_delay_min: int = Field(default=2, ge=1, le=15)
    internal_ac_cable_section_mm2: float = Field(default=6.0, gt=0.0)
    internal_ac_cable_length_m: float = Field(default=10.0, gt=0.0)
    fault: InstallationFault = Field(default=InstallationFault.NONE)

    # Storage
    battery_config: InverterBatteryConfig = Field(default_factory=lambda: InverterBatteryConfig(
        has_battery=False, battery_brand_model="Fără baterie", configured_mode=BatteryMode.NO_BATTERY,
    ))

    # Consumption profile (StoreNet / OPSD shaped)
    base_load_kw: float = Field(default=0.42, gt=0.0)
    evening_peak_kw: float = Field(default=2.6, ge=0.0)
    morning_peak_kw: float = Field(default=1.15, ge=0.0)
    midday_load_kw: float = Field(default=0.55, ge=0.0)
    ac_cooling_kw: float = Field(default=0.0, ge=0.0, description="Afternoon air conditioning (13:00-18:00)")
    ev_charger_kw: float = Field(default=0.0, ge=0.0, description="EV charging after work (19:10-20:25)")
    load_time_shift_min: int = Field(default=0, ge=-90, le=90)
    load_noise_seed: int = Field(default=0, ge=0, description="0 = canonical StoreNet-like ripple")

    client: Optional[SupplierClientProfile] = None

    @property
    def monitored(self) -> bool:
        return self.client is not None


class Neighborhood(BaseModel):
    """A complete LV network: one transformer station, its feeders and every connected house."""
    model_config = ConfigDict(extra="forbid")

    neighborhood_id: str = Field(..., description="e.g. 'NB-TM-DUMBRAVITA'")
    name_ro: str
    city: str
    county: str
    county_code: str = Field(..., description="Two-letter county code used in household ids, e.g. 'TM'")
    latitude: float
    longitude: float
    description_ro: str
    designed_stress_cause: GridStressCause
    transformer: TransformerStation
    feeders: List[FeederLine]
    houses: List[GridHouse]
    cloud_events: List[CloudEvent] = Field(default_factory=list)


# ============================================================================
# 7. NEIGHBORHOOD SIMULATION RESULTS (DIGITAL TWIN OF THE STREET)
# ============================================================================

class TransformerMinuteSample(BaseModel):
    """Power flow at the transformer LV busbar for one minute."""
    model_config = ConfigDict(extra="forbid")

    minute_of_day: int = Field(..., ge=0, le=1439)
    timestamp: str
    active_power_kw: float = Field(..., description="+ = MV->LV (consumption), - = reverse flow into MV")
    apparent_power_kva: float = Field(..., ge=0.0)
    loading_pct: float = Field(..., ge=0.0)
    busbar_voltage_v: float = Field(..., ge=0.0, description="Highest phase-neutral voltage at the LV busbar")
    max_house_voltage_v: float = Field(..., ge=0.0, description="Highest PCC voltage of any house this minute")
    pv_production_kw: float = Field(..., ge=0.0)
    houses_tripped: int = Field(..., ge=0)
    houses_derating: int = Field(..., ge=0)


class VoltageProfilePoint(BaseModel):
    """Voltage of one house at a given minute, used to draw the 'voltage along the street' chart."""
    model_config = ConfigDict(extra="forbid")

    house_id: str
    feeder_id: str
    distance_m: int
    phase: str
    voltage_v: float
    status: InverterStatus
    monitored: bool


class FeederDaySummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feeder_id: str
    street_name: str
    cable_code: str
    length_m: int
    houses_count: int
    pv_houses_count: int
    installed_pv_kw: float
    max_voltage_v: float
    max_voltage_time: str
    min_voltage_v: float
    min_voltage_time: str
    minutes_above_253v: int = Field(..., description="Minutes in which at least one house on the feeder had PCC >= 253V")
    peak_reverse_current_a: float
    peak_loading_pct_of_ampacity: float
    houses_tripped: int


class HouseDaySummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    house_id: str
    household_id: Optional[str] = None
    monitored: bool
    feeder_id: str
    distance_m: int
    phase: str
    installed_pv_kw: float
    has_battery: bool
    x_m: float
    y_m: float
    max_pcc_voltage_v: float
    min_pcc_voltage_v: float
    max_inverter_voltage_v: float
    trip_events: int
    trip_minutes: int
    derating_minutes: int
    produced_kwh: float
    expected_kwh: float
    lost_kwh: float
    first_trip_time: Optional[str] = None
    pcc_voltage_15m: List[float] = Field(default_factory=list, description="96 x 15-min mean PCC voltage")
    worst_status_15m: List[InverterStatus] = Field(default_factory=list, description="96 x worst status per interval")
    fault: InstallationFault
    truth_grid_cause: GridFaultCause


class NeighborhoodGridAnalysis(BaseModel):
    """Day-level result of the LV network simulation, with the distributor-facing diagnosis."""
    model_config = ConfigDict(extra="forbid")

    neighborhood_id: str
    name_ro: str
    city: str
    county: str
    latitude: float
    longitude: float
    description_ro: str
    date_analyzed: str
    what_if_label_ro: Optional[str] = Field(default=None, description="Set when this is a what-if re-simulation")

    transformer_id: str
    transformer_name: str
    rated_kva: float
    tap_setting_pct: float
    distribution_operator: DistributionOperator
    stress_cause: GridStressCause

    houses_total: int
    pv_houses: int
    battery_houses: int
    monitored_households: int
    monitored_household_ids: List[str]
    installed_pv_kw: float
    pv_to_transformer_ratio_pct: float
    phase_installed_pv_kw: Dict[str, float]

    max_voltage_v: float
    max_voltage_time: str
    min_voltage_v: float
    min_voltage_time: str
    minutes_above_253v: int
    peak_phase_voltage_v: Dict[str, float]
    houses_tripped: int
    trip_events_total: int
    lost_energy_kwh: float
    peak_reverse_power_kw: float
    peak_reverse_loading_pct: float
    peak_reverse_time: str
    peak_voltage_minute: int

    headline_ro: str
    explanation_ro: str
    recommended_distributor_action_ro: str

    feeders: List[FeederDaySummary]
    houses: List[HouseDaySummary]
    transformer_timeseries: List[TransformerMinuteSample]
    voltage_profile_at_peak: List[VoltageProfilePoint]


class HouseholdGroundTruth(BaseModel):
    """What was actually injected in the simulation — used only to test the engine verdicts."""
    model_config = ConfigDict(extra="forbid")

    household_id: str
    neighborhood_id: str
    installation_fault: InstallationFault
    grid_cause: GridFaultCause
    battery_status: BatteryVerdictStatus
    billing_status: BillingVerdictStatus
