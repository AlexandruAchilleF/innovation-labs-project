"""Event extraction, grid-vs-equipment classification and lost energy (Task 3)."""

from dataclasses import dataclass, field
from typing import Literal

import pandas as pd

EventKind = Literal[
    "grid_overvoltage", "grid_outage", "equipment", "volt_watt_curtailment", "no_data", "unknown"
]


@dataclass
class Event:
    site_id: str
    feeder_id: str
    start: pd.Timestamp
    end: pd.Timestamp
    kind: EventKind
    v_max: float
    peers_affected: int
    lost_kwh: float
    lost_lei: float
    evidence: dict = field(default_factory=dict)


def expected_power(readings: pd.DataFrame, sites: pd.DataFrame) -> pd.Series:
    """Expected AC power per (site_id, ts): kwp x median W/kWp of neighbours that are on."""
    raise NotImplementedError


def extract_events(readings: pd.DataFrame, sites: pd.DataFrame) -> list[Event]:
    """Detect and classify events. Must give the same result on 5-minute data."""
    raise NotImplementedError


def monthly_summary(events: list[Event], site_id: str, month) -> dict:
    """Trip count, kWh, lei and grid-vs-equipment share for one month."""
    raise NotImplementedError
