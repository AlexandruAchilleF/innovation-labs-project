"""Physical low-voltage street simulator (Task 2).

Voltage rises towards the end of the cable with export; inverters trip above
the thresholds in config. Also models volt-watt, injected faults, batteries
and smart absorption.
"""

from dataclasses import dataclass
from datetime import date
from typing import Literal

import pandas as pd

from sunproof import config

BatteryMode = Literal["self_consumption", "evening_program", "full_by_morning", "never_discharges"]


@dataclass
class Battery:
    capacity_kwh: float = 10.0
    max_kw: float = 5.0
    reserve: float = 0.2
    mode: BatteryMode = "self_consumption"


@dataclass
class House:
    site_id: str
    position: int  # 1 = closest to the transformer
    kwp: float
    daily_kwh: float
    volt_watt: bool = False
    smart_load_w: float = 0.0
    battery: Battery | None = None


@dataclass
class FeederConfig:
    feeder_id: str
    houses: list[House]
    r_seg_ohm: float = config.R_SEG_OHM
    v_tx: float = config.V_TX


@dataclass
class Fault:
    site_id: str
    kind: Literal["inverter_trip", "string_loss"]
    start: pd.Timestamp
    end: pd.Timestamp | None = None


def simulate(
    cfg: FeederConfig,
    pv_w_per_kwp: pd.Series,
    day: date,
    faults: list[Fault] | None = None,
    smart_absorb: bool = False,
    seed: int = 0,
) -> pd.DataFrame:
    """Simulate one day, minute by minute, vectorised over houses.

    Returns readings with columns: site_id, ts, p_ac_w, v_grid_v, status,
    alarm, soc, p_batt_w, load_w.
    """
    raise NotImplementedError


def demo_feeder(feeder_id: str = "A", n_houses: int = 12) -> FeederConfig:
    """The demo street: 12 houses of 6 kWp."""
    raise NotImplementedError
