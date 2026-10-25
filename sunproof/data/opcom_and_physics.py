"""OPCOM PZU hourly price curve (August 2026), pricing constants and the trace -> inverter/meter/neighbor contract converters."""

from __future__ import annotations

import math
from typing import Dict, List

from sunproof.grid import (
    HouseTrace,
    minute_to_hhmm,
)
from sunproof.models import (
    InverterMinuteSample,
    NeighborMinuteSample,
    NeighborNode,
    OpcomHourlyPrice,
    PriceZone,
    SmartMeterInterval15m,
)


DATE_ANALYZED = "2026-08-18"
MONTH_LABEL = "August 2026"
DAYS_IN_MONTH = 31
# August in the Romanian plains: production ≈ 88% of 31 clear-sky days; cloudier days add ~8% import
MONTH_PV_FACTOR = DAYS_IN_MONTH * 0.88
MONTH_IMPORT_FACTOR = DAYS_IN_MONTH * 1.08
SUPPLY_PRICE_RON_KWH = 0.68
GRID_TARIFFS_RON_KWH = {"TM": 0.62, "IF": 0.60, "B": 0.56, "CJ": 0.62, "BV": 0.61}

# ============================================================================
# 1. OPCOM PZU HOURLY PRICE PROFILE (ROMANIA - AUGUST 2026 TYPICAL SUNNY DAY)
# ============================================================================

def build_opcom_pzu_august_curve() -> List[OpcomHourlyPrice]:
    """
    Returns the 24 hourly OPCOM Day-Ahead Market (PZU) prices for a high-solar summer day.
    Notice the deep midday 'duck curve' dip (11:00-15:00 at 85-135 RON/MWh) vs.
    the steep evening peak (19:00-22:00 at 940-1120 RON/MWh).
    """
    hourly_ron_mwh = [
        410.0,  # 00:00 - 01:00
        375.0,  # 01:00 - 02:00
        350.0,  # 02:00 - 03:00
        340.0,  # 03:00 - 04:00
        360.0,  # 04:00 - 05:00
        430.0,  # 05:00 - 06:00
        580.0,  # 06:00 - 07:00
        690.0,  # 07:00 - 08:00 (Morning peak)
        640.0,  # 08:00 - 09:00
        420.0,  # 09:00 - 10:00
        230.0,  # 10:00 - 11:00
        130.0,  # 11:00 - 12:00 (Solar dip)
        95.0,   # 12:00 - 13:00 (Solar dip)
        85.0,   # 13:00 - 14:00 (Solar dip minimum)
        110.0,  # 14:00 - 15:00 (Solar dip)
        195.0,  # 15:00 - 16:00
        340.0,  # 16:00 - 17:00
        560.0,  # 17:00 - 18:00
        840.0,  # 18:00 - 19:00 (Evening peak start)
        1040.0, # 19:00 - 20:00 (Evening peak)
        1120.0, # 20:00 - 21:00 (Evening peak maximum)
        960.0,  # 21:00 - 22:00 (Evening peak)
        670.0,  # 22:00 - 23:00
        480.0,  # 23:00 - 24:00
    ]

    prices: List[OpcomHourlyPrice] = []
    for hour, mwh_price in enumerate(hourly_ron_mwh):
        if 11 <= hour <= 15:
            zone = PriceZone.SOLAR_DIP
        elif 7 <= hour <= 9:
            zone = PriceZone.MORNING_PEAK
        elif 18 <= hour <= 21:
            zone = PriceZone.EVENING_PEAK
        else:
            zone = PriceZone.OFF_PEAK

        prices.append(
            OpcomHourlyPrice(
                hour=hour,
                interval_label=f"{hour:02d}:00 - {(hour + 1) % 24:02d}:00",
                pzu_price_ron_mwh=round(mwh_price, 2),
                pzu_price_ron_kwh=round(mwh_price / 1000.0, 4),
                zone=zone,
            )
        )
    return prices

# ============================================================================

def _inverter_samples(trace: HouseTrace) -> List[InverterMinuteSample]:
    return [
        InverterMinuteSample(
            timestamp=minute_to_hhmm(m),
            minute_of_day=m,
            ac_voltage_v=trace.inverter_voltage_v[m],
            grid_frequency_hz=round(50.0 + 0.02 * math.sin(m * 0.05), 3),
            pv_power_kw=trace.pv_kw[m],
            pvgis_expected_kw=trace.expected_kw[m],
            house_load_kw=trace.load_kw[m],
            battery_power_kw=trace.battery_kw[m],
            battery_soc_pct=trace.soc_pct[m],
            grid_import_kw=trace.import_kw[m],
            grid_export_kw=trace.export_kw[m],
            status=trace.status[m],
            error_code=trace.error_code[m],
        )
        for m in range(1440)
    ]


def _meter_intervals(trace: HouseTrace) -> List[SmartMeterInterval15m]:
    dt_hours = 1.0 / 60.0
    intervals: List[SmartMeterInterval15m] = []
    for idx in range(96):
        start_m, end_m = idx * 15, idx * 15 + 15
        intervals.append(
            SmartMeterInterval15m(
                interval_index=idx,
                interval_start=minute_to_hhmm(start_m),
                interval_end="24:00" if end_m == 1440 else minute_to_hhmm(end_m),
                active_import_kwh=round(sum(trace.import_kw[start_m:end_m]) * dt_hours, 4),
                active_export_kwh=round(sum(trace.export_kw[start_m:end_m]) * dt_hours, 4),
                meter_voltage_avg_v=round(sum(trace.pcc_voltage_v[start_m:end_m]) / 15.0, 2),
            )
        )
    return intervals


def _neighbor_node(trace: HouseTrace, neighbor_id: str, street_by_feeder: Dict[str, str]) -> NeighborNode:
    h = trace.house
    feeder_no = h.feeder_id.split("-")[-1]
    return NeighborNode(
        neighbor_id=neighbor_id,
        anonymized_label=(
            f"Echipament {neighbor_id} · plecarea {feeder_no} ({street_by_feeder[h.feeder_id]}) · "
            f"{h.distance_from_transformer_m} m de PT · faza {h.phase.value}"
        ),
        distance_from_transformer_m=h.distance_from_transformer_m,
        inverter_brand=h.inverter_brand,
        installed_kw=h.installed_pv_kw,
        phase=h.phase.value,
        feeder_id=h.feeder_id,
        telemetry=[
            NeighborMinuteSample(
                timestamp=minute_to_hhmm(m),
                minute_of_day=m,
                ac_voltage_v=trace.inverter_voltage_v[m],
                pv_power_kw=trace.pv_kw[m],
                expected_kw=trace.expected_kw[m],
                status=trace.status[m],
            )
            for m in range(1440)
        ],
    )
