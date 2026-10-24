"""Raw time-series contracts: 1-min inverter + neighbor samples, 15-min smart meter, OPCOM hourly price."""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from sunproof.models.enums import (
    InverterBrand,
    InverterStatus,
    PriceZone,
)


class InverterMinuteSample(BaseModel):
    """
    1-minute resolution telemetry from the customer's inverter and BMS,
    paired with the PVGIS reference irradiance/output curve for that exact minute.
    """
    model_config = ConfigDict(extra="forbid")

    timestamp: str = Field(..., description="Time of day in HH:MM format (e.g. '12:42')")
    minute_of_day: int = Field(..., ge=0, le=1439, description="Minute index from 00:00 (0..1439)")
    ac_voltage_v: float = Field(..., ge=0.0, le=300.0, description="AC voltage measured at inverter terminals (V)")
    grid_frequency_hz: float = Field(default=50.0, ge=45.0, le=55.0, description="AC grid frequency (Hz)")
    pv_power_kw: float = Field(..., ge=0.0, description="Actual AC/DC solar power produced (kW)")
    pvgis_expected_kw: float = Field(..., ge=0.0, description="Expected clear-sky/modeled PVGIS output (kW)")
    house_load_kw: float = Field(..., ge=0.0, description="Instantaneous household consumption (kW)")
    battery_power_kw: float = Field(
        default=0.0,
        description="Battery power flow in kW: positive (+) = charging, negative (-) = discharging"
    )
    battery_soc_pct: float = Field(default=0.0, ge=0.0, le=100.0, description="Battery State of Charge (%)")
    grid_import_kw: float = Field(..., ge=0.0, description="Power imported from grid at this minute (kW)")
    grid_export_kw: float = Field(..., ge=0.0, description="Power exported to grid at this minute (kW)")
    status: InverterStatus = Field(default=InverterStatus.NORMAL)
    error_code: Optional[str] = Field(
        default=None,
        description="Vendor-specific fault code when tripped (e.g., '2062 - Grid Overvoltage')"
    )


class NeighborMinuteSample(BaseModel):
    """
    1-minute anonymized telemetry sample from a neighboring prosumer connected
    to the same Low-Voltage (JT) distribution transformer (Post de Transformare).
    """
    model_config = ConfigDict(extra="forbid")

    timestamp: str = Field(..., description="Time of day in HH:MM format")
    minute_of_day: int = Field(..., ge=0, le=1439)
    ac_voltage_v: float = Field(..., ge=0.0, le=300.0, description="AC voltage at neighbor inverter (V)")
    pv_power_kw: float = Field(..., ge=0.0, description="Actual PV generation (kW)")
    expected_kw: float = Field(..., ge=0.0, description="Expected PV generation (kW)")
    status: InverterStatus = Field(default=InverterStatus.NORMAL)


class NeighborNode(BaseModel):
    """Metadata and telemetry for a neighboring prosumer on the same transformer feeder."""
    model_config = ConfigDict(extra="forbid")

    neighbor_id: str = Field(..., description="Anonymized identifier on the transformer feeder, e.g. 'PT04-N1'")
    anonymized_label: str = Field(..., description="Human-readable label for UI & PDF dossier")
    distance_from_transformer_m: int = Field(..., ge=10, le=2000, description="Cable distance from PT (meters)")
    inverter_brand: InverterBrand
    installed_kw: float = Field(..., gt=0.0)
    phase: str = Field(default="L1", description="Grid phase connection (L1, L2, L3, or 3P)")
    feeder_id: Optional[str] = Field(
        default=None,
        description="LV feeder (plecare) of the neighbor, e.g. 'PT04-F1'; same feeder = strongest evidence"
    )
    telemetry: List[NeighborMinuteSample] = Field(default_factory=list)


class SmartMeterInterval15m(BaseModel):
    """
    15-minute load profile interval from the distribution operator's smart meter (Contor Inteligent).
    Provides official billing-grade import (1.8.0), export (2.8.0), and PCC voltage at the property boundary.
    """
    model_config = ConfigDict(extra="forbid")

    interval_index: int = Field(..., ge=0, le=95, description="15-min interval index of the day (0..95)")
    interval_start: str = Field(..., description="Start time HH:MM")
    interval_end: str = Field(..., description="End time HH:MM")
    active_import_kwh: float = Field(..., ge=0.0, description="Energy imported in this 15-min window (kWh)")
    active_export_kwh: float = Field(..., ge=0.0, description="Energy exported in this 15-min window (kWh)")
    meter_voltage_avg_v: float = Field(
        ...,
        ge=0.0,
        le=300.0,
        description="Average AC voltage measured at the smart meter (Point of Common Coupling - PCC)"
    )


class OpcomHourlyPrice(BaseModel):
    """Hourly Day-Ahead Market (PZU - Piața pentru Ziua Următoare) price from OPCOM."""
    model_config = ConfigDict(extra="forbid")

    hour: int = Field(..., ge=0, le=23, description="Hour of day (0..23)")
    interval_label: str = Field(..., description="Display label, e.g. '12:00 - 13:00'")
    pzu_price_ron_mwh: float = Field(..., description="Spot price in RON/MWh")
    pzu_price_ron_kwh: float = Field(..., description="Spot price in RON/kWh")
    zone: PriceZone = Field(..., description="Intraday price regime classification")
