"""All string enums of the SunProof domain (brands, statuses, verdict codes, grid/installation causes)."""

from __future__ import annotations

from enum import Enum


class InverterBrand(str, Enum):
    """Major inverter brands in the Romanian prosumer market (~70% Chinese, ~60% of those Huawei)."""
    HUAWEI = "Huawei"
    DEYE = "Deye"
    FRONIUS = "Fronius"
    GROWATT = "Growatt"
    SOLAREDGE = "SolarEdge"
    SMA = "SMA"
    VICTRON = "Victron"


class DistributionOperator(str, Enum):
    """Romanian regional electricity distribution operators (OD)."""
    if_reteaua_electrica = "Rețele Electrice (fostul E-Distribuție)"
    RETRASIB_DEER = "Distribuție Energie Electrică România (DEER)"
    DISTRI_OLTENIA = "Distribuție Oltenia"
    DELGAZ_GRID = "Delgaz Grid"


class InverterStatus(str, Enum):
    """Operational state of the inverter at a given minute."""
    NORMAL = "NORMAL"
    DERATING = "DERATING"  # Volt-Watt / Volt-VAR active power curtailment near 250-252V
    TRIPPED_OVERVOLTAGE = "TRIPPED_OVERVOLTAGE"  # Protected shutdown (e.g., EN 50549 > 253V or wrong local threshold)
    STANDBY_NIGHT = "STANDBY_NIGHT"
    OFFLINE = "OFFLINE"


class BatteryMode(str, Enum):
    """Operating mode of the BESS (Battery Energy Storage System)."""
    MAX_SELF_CONSUMPTION = "MAX_SELF_CONSUMPTION"
    BACKUP_RESERVE = "BACKUP_RESERVE"
    TIME_OF_USE = "TIME_OF_USE"
    FORCED_CHARGE_FROM_GRID = "FORCED_CHARGE_FROM_GRID"
    NO_BATTERY = "NO_BATTERY"


class SettlementRegime(str, Enum):
    """Romanian prosumer billing regime (Law 160/2026 & ANRE methodology)."""
    QUANTITY_COMPENSATION_UNDER_200KW = "QUANTITY_COMPENSATION_UNDER_200KW"
    QUANTITY_COMPENSATION_200_400KW = "QUANTITY_COMPENSATION_200_400KW"
    FINANCIAL_SETTLEMENT_PZU_WEIGHTED = "FINANCIAL_SETTLEMENT_PZU_WEIGHTED"
    POST_2027_HOURLY_SETTLEMENT = "POST_2027_HOURLY_SETTLEMENT"


class GridFaultCause(str, Enum):
    """Root-cause classification for midday inverter shutdowns."""
    NONE = "NONE"
    GRID_OVERVOLTAGE = "GRID_OVERVOLTAGE"  # Multiple houses on same transformer hit >=253V simultaneously
    LOCAL_OVERVOLTAGE_SENSITIVITY = "LOCAL_OVERVOLTAGE_SENSITIVITY"  # Wrong country code / trip threshold (e.g., 245V)
    LOCAL_CABLE_IMPEDANCE = "LOCAL_CABLE_IMPEDANCE"  # Undersized AC cable between inverter and smart meter (>8V rise)
    LOCAL_EQUIPMENT_FAULT = "LOCAL_EQUIPMENT_FAULT"  # Inverter hardware / string fault with normal voltage


class BatteryVerdictStatus(str, Enum):
    """Classification of battery utilization and evening peak support."""
    NO_BATTERY = "NO_BATTERY"
    OPTIMAL = "OPTIMAL"
    MISCONFIGURED_SOC_RESERVE = "MISCONFIGURED_SOC_RESERVE"  # e.g., customer wants 20% reserve, inverter set to 80%
    MISCONFIGURED_MODE = "MISCONFIGURED_MODE"  # e.g., stuck in Backup-only or wrong TOU schedule
    UNDERPERFORMING_CAPACITY = "UNDERPERFORMING_CAPACITY"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class BillingVerdictStatus(str, Enum):
    """Classification of invoice vs. smart meter vs. inverter reconciliation."""
    INVOICE_VALID_EXPLAINED = "INVOICE_VALID_EXPLAINED"  # Math is right; customer confused PV production with grid export
    MISSING_EXPORT_INDEX = "MISSING_EXPORT_INDEX"  # Distributor/supplier failed to read 2.8.0 export index
    ESTIMATED_INDEX_OVERCHARGE = "ESTIMATED_INDEX_OVERCHARGE"  # Estimated import instead of smart meter profile
    METER_INVERTER_DISCREPANCY = "METER_INVERTER_DISCREPANCY"  # CT clamp reversed or phase metering mismatch
    AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
    UNSUPPORTED_SETTLEMENT = "UNSUPPORTED_SETTLEMENT"


class SeverityLevel(str, Enum):
    """Alert severity for triage in the Supplier Dashboard."""
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"
    OK = "OK"


class ResponsibleParty(str, Enum):
    """Who must act to resolve the identified issue."""
    DISTRIBUTOR = "DISTRIBUTOR"  # Operatorul de Distribuție (OD) - network voltage / transformer tap / missing index
    INSTALLER_TECHNICIAN = "INSTALLER_TECHNICIAN"  # Field O&M technician - inverter settings / AC wiring
    CUSTOMER_SETTINGS = "CUSTOMER_SETTINGS"  # Prosumer app setting (SoC reserve / operating mode)
    SUPPLIER_BILLING = "SUPPLIER_BILLING"  # Energy supplier billing / call-center team
    NONE = "NONE"


class PriceZone(str, Enum):
    """OPCOM PZU intraday price zone."""
    OFF_PEAK = "OFF_PEAK"
    MORNING_PEAK = "MORNING_PEAK"
    SOLAR_DIP = "SOLAR_DIP"
    EVENING_PEAK = "EVENING_PEAK"


class GridPhase(str, Enum):
    """Connection of a POD to the 3-phase + neutral low-voltage feeder."""
    L1 = "L1"
    L2 = "L2"
    L3 = "L3"
    THREE_PHASE = "3P"


class PanelOrientation(str, Enum):
    """Roof orientation of the PV array (shifts and reshapes the daily production curve)."""
    SOUTH = "SOUTH"
    EAST = "EAST"
    WEST = "WEST"
    EAST_WEST = "EAST_WEST"


class InstallationFault(str, Enum):
    """Ground-truth installation defect injected into the neighborhood simulation."""
    NONE = "NONE"
    WRONG_TRIP_THRESHOLD = "WRONG_TRIP_THRESHOLD"  # U> set to e.g. 245V instead of 253V (wrong grid code)
    UNDERSIZED_AC_CABLE = "UNDERSIZED_AC_CABLE"  # thin / long AC cable inverter -> meter panel
    STRING_FAULT = "STRING_FAULT"  # one of two PV strings open (≈ -50% production, no alarm)
    INVERTER_DEVICE_FAULT = "INVERTER_DEVICE_FAULT"  # inverter stopped in permanent fault all day
    SOILING_DEGRADATION = "SOILING_DEGRADATION"  # dirty / degraded modules (≈ -18% production)


class GridStressCause(str, Enum):
    """Why a low-voltage network (transformer station + feeders) is overstressed by PV injection."""
    NONE = "NONE"
    FEEDER_VOLTAGE_RISE = "FEEDER_VOLTAGE_RISE"  # long / thin feeder with dense PV -> voltage rise at line end
    PHASE_IMBALANCE = "PHASE_IMBALANCE"  # single-phase inverters concentrated on one phase
    TRANSFORMER_TAP_HIGH = "TRANSFORMER_TAP_HIGH"  # tap set high for consumption (+5%) -> whole PT high at noon
    TRANSFORMER_REVERSE_OVERLOAD = "TRANSFORMER_REVERSE_OVERLOAD"  # PV installed >> transformer rating
