"""SQLite storage and month simulation (Task 4)."""

from datetime import date
from pathlib import Path

import pandas as pd

from sunproof.events import Event
from sunproof.feeder import FeederConfig, Fault


class Store:
    def __init__(self, path: Path):
        self.path = Path(path)

    def upsert_sites(self, sites: pd.DataFrame) -> None:
        raise NotImplementedError

    def append_readings(self, readings: pd.DataFrame) -> None:
        """Idempotent on (site_id, ts)."""
        raise NotImplementedError

    def readings(self, site_id: str | None, start, end) -> pd.DataFrame:
        raise NotImplementedError

    def save_events(self, events: list[Event]) -> None:
        raise NotImplementedError

    def events(self, site_id: str | None = None, kind: str | None = None) -> list[Event]:
        raise NotImplementedError


def simulate_month(
    store: Store, cfg: FeederConfig, pv: pd.Series, month: date, faults: list[Fault], seed: int
) -> int:
    """Simulate a month day by day, save readings and events, return the event count."""
    raise NotImplementedError
