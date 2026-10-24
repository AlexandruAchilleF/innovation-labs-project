"""Grid complaint dossier (Task 5). Facts come from code; the LLM only drafts."""

from dataclasses import dataclass
from datetime import date
from pathlib import Path

from sunproof import config
from sunproof.events import Event
from sunproof.llm import LLM


@dataclass
class Owner:
    name: str
    address: str
    county: str
    pod_code: str
    email: str


@dataclass
class DossierFacts:
    owner: Owner
    period: tuple[date, date]
    events: list[Event]
    n_events: int
    lost_kwh: float
    lost_lei: float
    v_max: float
    peers_confirmed: int


def distributor_for(county: str) -> str:
    """Distribution operator for a county code. Unknown codes raise KeyError."""
    return config.DISTRIBUTOR_BY_COUNTY[county]


def build_facts(store, site_id: str, owner: Owner, start: date, end: date) -> DossierFacts:
    """Only grid_overvoltage and volt_watt_curtailment events; data via consent.share()."""
    raise NotImplementedError


def draft_letter(facts: DossierFacts, llm: LLM) -> str:
    """Romanian letter; event count, kWh and max voltage are checked and rewritten from a template if wrong."""
    raise NotImplementedError


def render_pdf(facts: DossierFacts, letter: str, out: Path) -> Path:
    """Page 1 letter, page 2 event table, page 3 voltage chart with the 253 V line."""
    raise NotImplementedError
