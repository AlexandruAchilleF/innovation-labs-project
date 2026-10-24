"""Customer ticket API (prosumer -> supplier inbox): seeds, create, idempotency, resolve."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from sunproof import tickets
from sunproof.app import app
from sunproof.scenarios import get_scenario_by_id


@pytest.fixture()
def client():
    tickets.reset_tickets()
    with TestClient(app) as c:
        yield c
    tickets.reset_tickets()


def test_seeded_tickets_use_the_customer_question(client):
    data = client.get("/api/tickets").json()
    assert [t["household_id"] for t in data] == list(tickets.SEED_HOUSEHOLD_IDS)
    for t in data:
        assert t["status"] == "OPEN"
        assert t["message_ro"] == get_scenario_by_id(t["household_id"]).invoice.customer_question_ro


def test_create_is_idempotent_on_client_id_and_resolve(client):
    body = {"household_id": "RO-IF-002", "message_ro": "  De ce se oprește invertorul?  ", "ticket_id": "SP-9001",
            "topic_ro": "Invertorul se oprește la prânz"}
    first = client.post("/api/tickets", json=body).json()
    assert first["ticket_id"] == "SP-9001" and first["message_ro"] == "De ce se oprește invertorul?"
    assert first["topic_ro"] == "Invertorul se oprește la prânz"
    assert client.post("/api/tickets", json=body).json() == first
    assert len(client.get("/api/tickets").json()) == 3

    done = client.post("/api/tickets/SP-9001/resolve", json={"resolution_ro": "Dosar PDF generat"}).json()
    assert done["status"] == "RESOLVED" and done["resolution_ro"] == "Dosar PDF generat"
    assert client.post("/api/tickets/SP-1001/resolve").json()["status"] == "RESOLVED"


def test_ticket_errors(client):
    assert client.post("/api/tickets", json={"household_id": "RO-XX-999", "message_ro": "x"}).status_code == 404
    assert client.post("/api/tickets", json={"household_id": "RO-TM-001", "message_ro": ""}).status_code == 422
    assert client.post("/api/tickets/SP-0000/resolve").status_code == 404
