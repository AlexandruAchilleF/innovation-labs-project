"""Customer battery intent vs. inverter config, monthly energy balance, prosumer invoice."""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sunproof.models.enums import (
    BatteryMode,
    SettlementRegime,
)


class CustomerBatteryIntent(BaseModel):
    """
    What the prosumer stated once during onboarding regarding how they want
    their battery storage system to behave.
    """
    model_config = ConfigDict(extra="forbid")

    goal_description_ro: str = Field(..., description="Customer's stated goal in plain Romanian")
    desired_mode: BatteryMode = Field(..., description="Intended operating mode")
    desired_min_soc_pct: float = Field(
        ...,
        ge=5.0,
        le=100.0,
        description="Desired minimum backup reserve SoC (%) so the rest can be used in the evening"
    )
    evening_discharge_allowed: bool = Field(
        default=True,
        description="Whether the customer wants the battery to cover evening household consumption"
    )
    wants_supplier_storage_bonus: bool = Field(
        default=True,
        description="Whether the customer opted into the supplier's evening peak relief tariff/bonus"
    )


class InverterBatteryConfig(BaseModel):
    """
    Actual configuration parameters read from the inverter / BMS via API or Modbus.
    """
    model_config = ConfigDict(extra="forbid")

    has_battery: bool = Field(default=True)
    battery_brand_model: str = Field(default="Fără baterie", description="Battery hardware model")
    usable_capacity_kwh: float = Field(default=0.0, ge=0.0, description="Total usable storage capacity (kWh)")
    max_charge_discharge_kw: float = Field(default=0.0, ge=0.0, description="Max charge/discharge power (kW)")
    configured_mode: BatteryMode = Field(default=BatteryMode.NO_BATTERY)
    configured_min_soc_pct: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Actual configured End-of-Discharge / Backup Reserve SoC (%) in the inverter"
    )
    grid_charge_enabled: bool = Field(default=False)
    state_of_health_pct: float = Field(default=100.0, ge=0.0, le=100.0)
    app_setting_path_ro: str = Field(
        default="",
        description="Exact menu path in the vendor app where the setting is located"
    )


class MonthlyEnergySummary(BaseModel):
    """
    Monthly aggregated energy quantities across all three sources of truth:
    1. PVGIS Satellite/Weather Reference
    2. Customer's Inverter Telemetry
    3. Distribution Smart Meter (15-min / monthly registers 1.8.0 & 2.8.0)
    """
    model_config = ConfigDict(extra="forbid")

    month_label: str = Field(..., description="e.g. 'August 2026'")
    days_in_month: int = Field(default=31, ge=28, le=31)
    pvgis_expected_production_kwh: float = Field(..., ge=0.0)
    inverter_total_production_kwh: float = Field(..., ge=0.0)
    inverter_direct_self_consumption_kwh: float = Field(
        ...,
        ge=0.0,
        description="PV energy consumed directly by house appliances before reaching the smart meter"
    )
    inverter_battery_charged_kwh: float = Field(default=0.0, ge=0.0)
    inverter_battery_discharged_kwh: float = Field(default=0.0, ge=0.0)
    inverter_reported_export_kwh: float = Field(..., ge=0.0)
    inverter_reported_import_kwh: float = Field(..., ge=0.0)
    meter_verified_export_kwh: float = Field(
        ...,
        ge=0.0,
        description="Official energy injected into grid measured by smart meter register 2.8.0"
    )
    meter_verified_import_kwh: float = Field(
        ...,
        ge=0.0,
        description="Official energy drawn from grid measured by smart meter register 1.8.0"
    )
    meter_previous_export_index: float = Field(..., ge=0.0)
    meter_current_export_index: float = Field(..., ge=0.0)
    meter_previous_import_index: float = Field(..., ge=0.0)
    meter_current_import_index: float = Field(..., ge=0.0)


class ProsumerInvoice(BaseModel):
    """
    Monthly electricity invoice issued to the prosumer, including quantity compensation
    lines and non-compensable grid/tax components under Romanian regulations.
    """
    model_config = ConfigDict(extra="forbid")

    invoice_number: str = Field(..., description="Invoice series and number, e.g. 'SP-2026-089412'")
    issue_date: str = Field(..., description="Invoice issue date YYYY-MM-DD")
    billing_period: str = Field(..., description="e.g. '01.08.2026 – 31.08.2026'")
    settlement_regime: SettlementRegime = Field(
        default=SettlementRegime.QUANTITY_COMPENSATION_UNDER_200KW
    )
    billed_import_kwh: float = Field(..., ge=0.0, description="Active energy imported billed on invoice (kWh)")
    billed_export_kwh: float = Field(..., ge=0.0, description="Active energy exported recognized on invoice (kWh)")
    is_export_index_missing_on_bill: bool = Field(
        default=False,
        description="True if the distributor/supplier omitted the monthly export index on the invoice"
    )
    is_import_estimated: bool = Field(
        default=False,
        description="True if import was billed on an overestimated convention instead of smart meter reading"
    )
    compensated_Active_energy_kwh: float = Field(
        ...,
        ge=0.0,
        validation_alias=AliasChoices("compensated_active_energy_kwh", "compensated_Active_energy_kwh"),
        description="kWh of active energy netted 1:1 between import and export"
    )
    net_billed_active_energy_kwh: float = Field(
        ...,
        ge=0.0,
        description="Remaining imported active energy billed after 1:1 quantity compensation"
    )
    carried_forward_export_credit_kwh: float = Field(
        default=0.0,
        ge=0.0,
        description="Surplus exported kWh rolled over or financially settled"
    )
    active_energy_supply_price_ron_kwh: float = Field(
        ...,
        gt=0.0,
        description="Active energy supply price (preț energie activă, fără tarife de rețea), e.g. 0.68 RON/kWh"
    )
    grid_tariffs_and_taxes_ron_kwh: float = Field(
        ...,
        gt=0.0,
        description="Regulated distribution, transport, system services, green certificates, cogeneration, excise & VAT per imported kWh, e.g. 0.62 RON/kWh"
    )
    total_retail_import_price_ron_kwh: float = Field(
        ...,
        gt=0.0,
        description="Full all-in retail price per imported kWh (active energy + regulated grid tariffs & taxes)"
    )
    total_payable_ron: float = Field(..., description="Final amount printed on the invoice (RON)")
    customer_question_ro: str = Field(
        ...,
        description="The exact question or complaint raised by the customer about this bill"
    )

    @property
    def compensated_active_energy_kwh(self) -> float:
        """Lowercase alias of `compensated_Active_energy_kwh` (accepted on input too)."""
        return self.compensated_Active_energy_kwh
