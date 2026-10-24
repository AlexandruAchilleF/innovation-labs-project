"""Is your battery doing what it should? (Task 12)"""

from dataclasses import dataclass, field
from datetime import date
from typing import Literal

import pandas as pd

from sunproof.feeder import Battery


@dataclass
class OwnerIntent:
    """What the owner wanted, entered at setup. Battery.reserve stays the real inverter setting."""

    reserve: float = 0.2
    evening_use: bool = True
    in_program: bool = False


@dataclass
class BatteryFinding:
    site_id: str
    day: date
    kind: Literal[
        "not_charging_midday",
        "full_before_noon",
        "no_evening_delivery",
        "reserve_violation",
        "reserve_mismatch",
        "holding_owner_reserve",
    ]
    severity: Literal["alert", "info"]
    missed_lei: float
    avoidable_import_lei: float
    evidence: dict = field(default_factory=dict)


def check_day(
    readings_site_day: pd.DataFrame, battery: Battery, intent: OwnerIntent, day: date
) -> list[BatteryFinding]:
    raise NotImplementedError


def delivery_report(store, site_id: str, month) -> pd.DataFrame:
    """kWh delivered in PROGRAM_WINDOW per day, for the supplier, only via consent.share()."""
    raise NotImplementedError
