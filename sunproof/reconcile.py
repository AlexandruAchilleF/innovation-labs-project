"""Inverter vs. meter vs. bill reconciliation and derived consumption (Task 10)."""

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Literal

import pandas as pd


@dataclass
class Bill:
    site_id: str
    month: date
    injected_kwh: float
    injected_price_lei: float
    consumed_kwh: float


@dataclass
class Finding:
    kind: Literal["export_not_billed", "export_price_zero", "meter_inverter_mismatch"]
    month: date
    amount_lei: float
    explanation_ro: str
    evidence: dict = field(default_factory=dict)


def meter_curve(readings: pd.DataFrame) -> pd.DataFrame:
    """site_id, ts (15 min), import_kwh, export_kwh, like the distributor's export."""
    raise NotImplementedError


def derive_consumption(production_kwh: pd.Series, meter: pd.DataFrame) -> pd.Series:
    """production + import - export, per 15-minute interval."""
    raise NotImplementedError


def load_bills(folder: Path) -> list[Bill]:
    raise NotImplementedError


def reconcile(production_kwh_month: float, meter_month: dict, bill: Bill) -> list[Finding]:
    raise NotImplementedError
