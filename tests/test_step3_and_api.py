"""Step 3 API tests: FastAPI app over engines + explainer + PDF + Telegram (no network)."""

from __future__ import annotations

import json
import re

import pytest
from fastapi.testclient import TestClient

from sunproof.app import app
from sunproof.scenarios import STORY_HOUSEHOLD_IDS

TEXT_FIELDS = ("distributor_complaint_text", "invoice_explanation_text", "battery_guide_text")
TOKEN_RE = re.compile(r"\d{6,}:[A-Za-z0-9_-]{20,}")


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_index_html_and_health(client):
    r = client.get("/")
    assert r.status_code == 200 and "text/html" in r.headers["content-type"]
    assert "SunProof" in r.text
    assert client.get("/api/health").json() == {"status": "ok"}


def test_portfolio_and_households(client):
    data = client.get("/api/portfolio").json()
    assert len(data["households"]) == 81
    assert data["households"][0]["household_id"] == STORY_HOUSEHOLD_IDS[0]
    for key in ("monitored_households_count", "grid_fault_households_count", "invoice_issues_count",
                "fleet_total_supplier_monthly_value_ron", "extrapolated_annual_supplier_savings_eur"):
        assert key in data["metrics"]
    assert data["metrics"]["monitored_households_count"] == 81
    summary = data["households"][0]
    for key in ("grid_cause", "battery_status", "billing_status", "overall_severity", "one_line_triage_ro"):
        assert key in summary
    assert client.get("/api/households").json() == data["households"]


@pytest.mark.parametrize("household_id", STORY_HOUSEHOLD_IDS)
def test_story_household_detail(client, household_id):
    r = client.get(f"/api/households/{household_id}")
    assert r.status_code == 200
    body = r.json()
    scenario, analysis = body["scenario"], body["analysis"]
    assert "inverter_telemetry" not in scenario and "smart_meter_15m" not in scenario
    assert all("telemetry" not in n for n in scenario["neighbors"])
    assert scenario["inverter_samples_count"] == 1440 and len(scenario["opcom_pzu_hourly"]) == 24
    for field in TEXT_FIELDS:
        text = analysis[field]
        assert text is not None and text["text_ro"].strip()
        assert text["guardrail_passed"] is True, (field, text["unverified_numbers_caught"])
    assert len(body["timeseries"]["minutes"]) == 288


def test_unknown_ids_404(client):
    assert client.get("/api/households/NOPE-000").status_code == 404
    assert client.get("/api/households/NOPE-000/analysis").status_code == 404
    assert client.get("/api/households/NOPE-000/pdf-dossier").status_code == 404
    assert client.get("/api/neighborhoods/NB-NOPE").status_code == 404
    assert client.post("/api/households/NOPE-000/what-if-battery", json={"min_soc_pct": 20}).status_code == 404


def test_timeseries_and_analysis_alias(client):
    hid = STORY_HOUSEHOLD_IDS[0]
    ts = client.get(f"/api/households/{hid}/timeseries").json()
    assert len(ts["minutes"]) == 288 and len(ts["pzu"]) == 24 and len(ts["meter_voltage_15m"]) == 96
    assert ts["minutes"][1]["minute_of_day"] == 5 and ts["minutes"][1]["time"] == "00:05"
    assert ts["neighbors"] and all(len(n["voltage_max_5min"]) == 288 for n in ts["neighbors"])
    analysis = client.get(f"/api/households/{hid}/analysis").json()
    assert analysis["household_id"] == hid and analysis["battery_guide_text"] is not None


def test_battery_what_if_unlocks_capacity(client):
    hid = next(h for h in STORY_HOUSEHOLD_IDS
               if client.get(f"/api/households/{h}/analysis").json()["battery_verdict"]["status"]
               == "MISCONFIGURED_SOC_RESERVE")
    before = client.get(f"/api/households/{hid}/analysis").json()["battery_verdict"]
    r = client.post(f"/api/households/{hid}/what-if-battery", json={"min_soc_pct": before["desired_min_soc_pct"]})
    assert r.status_code == 200
    body = r.json()
    delta = body["delta"]
    assert delta["locked_capacity_kwh"]["after"] <= delta["locked_capacity_kwh"]["before"]
    assert body["after"]["battery_verdict"]["configured_min_soc_pct"] == before["desired_min_soc_pct"]
    assert len(body["timeseries"]["before"]) == len(body["timeseries"]["after"]) == 288
    assert body["after"]["battery_guide_text"] is not None


def test_battery_what_if_validation(client):
    hid = STORY_HOUSEHOLD_IDS[0]
    assert client.post(f"/api/households/{hid}/what-if-battery", json={"min_soc_pct": 150}).status_code == 422
    assert client.post(f"/api/households/{hid}/battery-override",
                       json={"min_soc_pct": 20, "mode": "TURBO"}).status_code == 422


def test_neighborhoods_list_detail_and_what_if(client):
    items = client.get("/api/neighborhoods").json()
    assert len(items) >= 1
    assert all("transformer_timeseries" not in n and "houses" not in n for n in items)
    over = [n for n in items if n["minutes_above_253v"] > 0]
    assert over, "expected at least one overvoltage neighborhood"
    target = max(over, key=lambda n: n["tap_setting_pct"])
    detail = client.get(f"/api/neighborhoods/{target['neighborhood_id']}").json()
    assert len(detail["transformer_timeseries"]) == 288 and detail["houses"]
    r = client.post(f"/api/neighborhoods/{target['neighborhood_id']}/what-if",
                    json={"tap_setting_pct": target["tap_setting_pct"] - 2.5})
    assert r.status_code == 200
    body = r.json()
    assert body["after"]["max_voltage_v"] <= body["before"]["max_voltage_v"]
    assert body["after"]["what_if_label_ro"]
    bad = client.post(f"/api/neighborhoods/{target['neighborhood_id']}/what-if", json={"unknown": 1})
    assert bad.status_code == 422


def test_pdf_dossier(client):
    hid = STORY_HOUSEHOLD_IDS[0]
    for path in (f"/api/households/{hid}/pdf-dossier", f"/api/households/{hid}/dossier.pdf"):
        r = client.get(path)
        assert r.status_code == 200 and r.headers["content-type"] == "application/pdf"
        assert r.content.startswith(b"%PDF")
        assert f"dosar_{hid}.pdf" in r.headers["content-disposition"]


def test_telegram_alert_simulated_without_token(client, monkeypatch):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.delenv("TELEGRAM_CHAT_ID", raising=False)
    r = client.post(f"/api/households/{STORY_HOUSEHOLD_IDS[0]}/telegram-alert")
    assert r.status_code == 200
    body = r.json()
    assert body["simulated"] is True and body["sent"] is False
    assert not TOKEN_RE.search(json.dumps(body))
    fake = "123456789:AAFakeTokenForTestsOnly_abcdefghijkl"
    r = client.post(f"/api/households/{STORY_HOUSEHOLD_IDS[0]}/telegram-alert",
                    json={"bot_token": fake, "chat_id": "42", "dry_run": True})
    assert r.status_code == 200 and fake not in r.text


def test_guardrail_demo_catches_invented_number(client):
    r = client.post(f"/api/households/{STORY_HOUSEHOLD_IDS[0]}/test-guardrail", json={})
    assert r.status_code == 200
    body = r.json()
    assert "999" in body["input_text_ro"]
    assert 999 in body["caught"] or 999.0 in body["caught"]
    assert body["fallback_applied"] is True
    assert body["result"]["source"] == "template_fallback"
    assert body["result"]["guardrail_passed"] is False
    assert "999 RON" not in body["result"]["text_ro"]


def test_guardrail_clean_template_passes(client):
    hid = STORY_HOUSEHOLD_IDS[2]
    for doc_type in ("invoice_explanation", "distributor_complaint", "battery_guide"):
        demo = client.post(f"/api/households/{hid}/test-guardrail", json={"doc_type": doc_type}).json()
        clean = client.post(f"/api/households/{hid}/test-guardrail",
                            json={"doc_type": doc_type, "text_ro": demo["result"]["text_ro"]}).json()
        assert clean["result"]["guardrail_passed"] is True, clean["caught"]
        assert clean["caught"] == [] and clean["fallback_applied"] is False
    assert client.post(f"/api/households/{hid}/test-guardrail", json={"doc_type": "poem"}).status_code == 422
