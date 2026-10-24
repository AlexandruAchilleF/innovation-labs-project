"""Prosumer-controlled data sharing with an access log (Task 11).

Every piece of data that leaves for a third party goes through share().
"""

from dataclasses import dataclass
from datetime import date
from typing import Literal

import pandas as pd

Scope = Literal[
    "voltage_events", "trip_events", "alerts", "battery_delivery", "production_hourly", "consumption"
]
Party = Literal["distribuitor", "furnizor", "om"]


@dataclass
class Grant:
    site_id: str
    party: Party
    scopes: set[str]
    expires: date | None = None


DEFAULT_GRANTS: dict[str, set[str]] = {
    "distribuitor": {"voltage_events", "trip_events"},
    "om": {"alerts", "trip_events"},
    "furnizor": {"battery_delivery"},
}


def set_grant(store, grant: Grant) -> None:
    raise NotImplementedError


def revoke(store, site_id: str, party: Party) -> None:
    raise NotImplementedError


def share(store, party: Party, site_id: str, scope: Scope) -> pd.DataFrame | None:
    """Data only if the scope is granted and not expired; always writes to access_log."""
    raise NotImplementedError
