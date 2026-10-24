"""Production and consumption profiles at one-minute resolution (Task 1)."""

from datetime import date
from pathlib import Path

import pandas as pd


def load_pvgis(path: Path) -> pd.Series:
    """Load a PVGIS seriescalc JSON file as hourly W per kWp, UTC."""
    raise NotImplementedError


def to_minute(hourly: pd.Series) -> pd.Series:
    """Linear interpolation to one minute, keeping each hour's energy within 1%."""
    raise NotImplementedError


def bell_profile(day: date, kwh_per_kwp: float = 6.0) -> pd.Series:
    """Offline fallback: a bell-shaped W per kWp profile for one day."""
    raise NotImplementedError


def consumption_profile(day: date, daily_kwh: float, seed: int) -> pd.Series:
    """Household load in W per minute: 150 W base, peaks 07-08 and 18-22, seeded noise."""
    raise NotImplementedError
