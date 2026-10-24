"""O&M: tickets, feeder map data, avoided truck rolls, Telegram alerts (Task 6)."""

from dataclasses import dataclass
from typing import Callable, Literal

import pandas as pd

TicketStatus = Literal["open", "acknowledged", "fixed", "verified", "reopened"]


@dataclass
class Ticket:
    ticket_id: int
    site_id: str
    opened: pd.Timestamp
    status: TicketStatus
    lost_lei_per_day: float
    fixed_at: pd.Timestamp | None = None


def sync_tickets(store) -> list[Ticket]:
    """Open tickets from equipment events only, one open ticket per house."""
    raise NotImplementedError


def mark_fixed(store, ticket_id: int, ts: pd.Timestamp) -> None:
    raise NotImplementedError


def verify_tickets(store, today) -> list[Ticket]:
    """fixed -> verified after VERIFY_DAYS clean days; relapse -> reopened and re-alert."""
    raise NotImplementedError


def avoided_truck_rolls(store, start, end) -> int:
    raise NotImplementedError


def feeder_status(store, day) -> pd.DataFrame:
    """Columns: feeder_id, lat, lon, status in {ok, overvoltage, equipment}, n_events."""
    raise NotImplementedError


def queue(store, text: str) -> None:
    raise NotImplementedError


def flush(store, send: Callable[[str], bool]) -> int:
    """Send queued alerts in order; stop at the first failure. Returns how many were sent."""
    raise NotImplementedError


def telegram_sender(token: str, chat_id: str) -> Callable[[str], bool]:
    raise NotImplementedError


def distributor_report(store, feeder_id: str, start, end) -> str:
    """Street-level summary for the distributor; reads data only via consent.share()."""
    raise NotImplementedError
