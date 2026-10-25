"""In-memory customer tickets (prosumer -> supplier) for the demo.

Two tickets are pre-seeded on flagship households so the supplier inbox is never empty; the
message is the customer's own question from the scenario invoice (no invented numbers).
Process-local and non-persistent by design: the frontend keeps its own localStorage copy.
Routes: GET /api/tickets, POST /api/tickets, POST /api/tickets/{ticket_id}/resolve.
"""

from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from sunproof.scenarios import get_scenario_by_id

SEED_HOUSEHOLD_IDS = ("RO-TM-001", "RO-BV-004")
SEED_CREATED_AT = "2026-08-14T09:30:00+00:00"

_lock = Lock()
_tickets: List[Dict[str, Any]] = []
_seeded = False


def _seed() -> None:
    global _seeded
    if _seeded:
        return
    for i, hid in enumerate(SEED_HOUSEHOLD_IDS):
        s = get_scenario_by_id(hid)
        _tickets.append({
            "ticket_id": f"SP-{1001 + i}", "household_id": hid, "customer_name": s.customer_name,
            "city": s.city, "scenario_badge_ro": s.scenario_badge_ro,
            "topic_ro": s.scenario_badge_ro, "message_ro": s.invoice.customer_question_ro,
            "attach_diagnostic": True,
            "created_at": SEED_CREATED_AT, "status": "OPEN", "resolution_ro": None,
        })
    _seeded = True


def list_tickets() -> List[Dict[str, Any]]:
    with _lock:
        _seed()
        return [dict(t) for t in _tickets]


def create_ticket(household_id: str, message_ro: str, attach_diagnostic: bool,
                  ticket_id: Optional[str] = None, topic_ro: Optional[str] = None) -> Dict[str, Any]:
    """Create (or return the existing ticket with the same client-chosen id). KeyError if unknown household."""
    s = get_scenario_by_id(household_id)
    with _lock:
        _seed()
        existing = next((t for t in _tickets if ticket_id and t["ticket_id"] == ticket_id), None)
        if existing:
            return dict(existing)
        ticket = {
            "ticket_id": ticket_id or f"SP-{1001 + len(_tickets)}", "household_id": household_id,
            "customer_name": s.customer_name, "city": s.city, "scenario_badge_ro": s.scenario_badge_ro,
            "topic_ro": topic_ro or s.scenario_badge_ro, "message_ro": message_ro.strip(),
            "attach_diagnostic": attach_diagnostic,
            "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "status": "OPEN", "resolution_ro": None,
        }
        _tickets.append(ticket)
        return dict(ticket)


def resolve_ticket(ticket_id: str, resolution_ro: Optional[str] = None) -> Dict[str, Any]:
    """Mark a ticket resolved. KeyError if unknown."""
    with _lock:
        _seed()
        for t in _tickets:
            if t["ticket_id"] == ticket_id:
                t["status"] = "RESOLVED"
                t["resolution_ro"] = resolution_ro or "Rezolvat de furnizor"
                return dict(t)
    raise KeyError(ticket_id)


def reset_tickets() -> None:
    """Test hook: drop created tickets and re-seed on next access."""
    global _seeded
    with _lock:
        _tickets.clear()
        _seeded = False


# ---------------------------------------------------------------- routes (mounted by sunproof.app)
router = APIRouter(prefix="/api/tickets", tags=["tickets"])


class TicketBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    household_id: str
    message_ro: str = Field(min_length=1, max_length=2000)
    attach_diagnostic: bool = True
    ticket_id: Optional[str] = Field(default=None, max_length=32)
    topic_ro: Optional[str] = Field(default=None, max_length=120)


class ResolveBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    resolution_ro: Optional[str] = Field(default=None, max_length=500)


@router.get("")
def get_tickets() -> List[Dict[str, Any]]:
    return list_tickets()


@router.post("")
def post_ticket(body: TicketBody) -> Dict[str, Any]:
    try:
        return create_ticket(body.household_id, body.message_ro, body.attach_diagnostic,
                             body.ticket_id, body.topic_ro)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Instalație necunoscută: {body.household_id}")


@router.post("/{ticket_id}/resolve")
def post_resolve(ticket_id: str, body: Optional[ResolveBody] = Body(default=None)) -> Dict[str, Any]:
    try:
        return resolve_ticket(ticket_id, body.resolution_ro if body else None)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Tichet necunoscut: {ticket_id}")
