"""Regression coverage for verified text and export review findings; no external sends."""
import json
import re
import shutil
import subprocess
import sys
import types
import zlib

import httpx
import pytest

from sunproof.engine import analyze_household
from sunproof.explainer import extract_numbers_ro, generate_verified_explanation, verify_text_against_facts
from sunproof.pdf_dossier import build_distributor_dossier_pdf
from sunproof.scenarios import get_scenario_by_id
from sunproof.telegram_bot import format_technician_alert, send_technician_alert


def _extract_pdf_text(data: bytes) -> str:
    """Extract text from PDF using pdftotext CLI if installed, or via standard zlib streams."""
    if shutil.which("pdftotext"):
        return subprocess.run(["pdftotext", "-", "-"], input=data, capture_output=True, check=True).stdout.decode()
    pages = []
    for stream in re.findall(b"stream[\r\n]+(.*?)[\r\n]+endstream", data, re.DOTALL):
        try:
            decomp = zlib.decompress(stream)
            chunks = []
            for m in re.findall(rb"\((.*?)\)\s*T[jJ]", decomp):
                chunks.append(m.decode("latin-1", errors="ignore").replace("\\(", "(").replace("\\)", ")"))
            if chunks:
                pages.append(" ".join(chunks))
        except Exception:
            pass
    return "\f".join(pages)


@pytest.fixture(scope="module")
def pair():
    s = get_scenario_by_id("RO-TM-001")
    return s, analyze_household(s)


@pytest.mark.parametrize("text, want", [("1e9 RON", [1e9]), ("RON999999", [999999]),
    ("4.500 V", [4500]), ("1 234,50 RON", [1234.5]), ("−2,5e3 kWh", [-2500])])
def test_complete_numeric_notation(text, want):
    assert extract_numbers_ro(text) == want


@pytest.mark.parametrize("text,facts", [("450 V", {"truck_cost_ron": 450}),
    ("1e9 RON", {"x": 1}), ("RON999999", {"x": 1}),
    ("4.500 V", {"voltage_v": 4.5}), ("225 kWh", {"x": 225.9}),
    ("1.320 kWh", {"x": 1.32})])
def test_wrong_unit_or_partial_numeric_claim_rejected(text, facts):
    assert not verify_text_against_facts(text, facts).guardrail_passed


def test_invalid_fallback_is_not_returned_as_safe():
    out = verify_text_against_facts("999 RON", {"x": 1}, fallback_text_ro="888 RON")
    assert out.text_ro not in ("999 RON", "888 RON")
    assert not out.guardrail_passed
    assert out.numbers_extracted_from_text == []


def test_llm_same_pool_different_named_field_is_rejected(monkeypatch, pair):
    import sunproof.explainer as module
    monkeypatch.setenv("ANTHROPIC_API_KEY", "offline")
    a = pair[1]
    wrong = f"Tensiunea la contor este {a.grid_verdict.avoided_truck_roll_saving_ron:.0f} V."
    monkeypatch.setattr(module, "_call_claude", lambda *args: wrong)
    out = generate_verified_explanation(a, "distributor_complaint", True)
    assert out.source == "template_fallback" and out.text_ro != wrong
    # Even a numerically valid sentence with the wrong field attribution is untrusted.
    monkeypatch.setattr(module, "_call_claude", lambda *args: "Factura este corectă.")
    assert generate_verified_explanation(a, "invoice_explanation", True).source == "template_fallback"


def test_incomplete_llm_is_closed_and_rejected(monkeypatch, pair):
    calls = {}
    class Client:
        def __init__(self, **kwargs):
            calls.update(kwargs)
            self.messages = self
        def create(self, **kwargs):
            return types.SimpleNamespace(stop_reason="max_tokens", content=[types.SimpleNamespace(type="text", text="Factura")])
        def close(self):
            calls["closed"] = True
    monkeypatch.setenv("ANTHROPIC_API_KEY", "offline")
    monkeypatch.setitem(sys.modules, "anthropic", types.SimpleNamespace(Anthropic=Client))
    out = generate_verified_explanation(pair[1], "invoice_explanation", True)
    assert out.source == "template" and calls["closed"]
    assert calls["timeout"] <= 20 and calls["max_retries"] == 0


@pytest.mark.parametrize("cause, label", [("NONE", "Fara declansari"),
    ("LOCAL_CABLE_IMPEDANCE", "Cauza locala"), ("INSUFFICIENT_DATA", "Date insuficiente")])
def test_pdf_non_grid_never_requests_grid_work(pair, cause, label):
    s, a = pair
    g = a.grid_verdict.model_copy(update={"cause": types.SimpleNamespace(value=cause)})
    a = a.model_copy(update={"grid_verdict": g})
    pdf = build_distributor_dossier_pdf(s, a)
    text = _extract_pdf_text(pdf)
    assert label in text
    assert "Verificarea si reglajul plotului" not in text
    assert "DEMO / DATE SIMULATE" in text
    assert s.household_id in text and s.date_analyzed in text
    assert "Pregatit" in text and "netrimis" in text
    assert "medii de 15 min" in text


def test_pdf_grid_requests_and_watermark_each_page(pair):
    s, a = pair
    g = a.grid_verdict.model_copy(update={"cause": types.SimpleNamespace(value="GRID_OVERVOLTAGE")})
    pdf = build_distributor_dossier_pdf(s, a.model_copy(update={"grid_verdict": g}))
    text = _extract_pdf_text(pdf)
    assert "Verificarea si reglajul plotului" in text
    assert all("DEMO / DATE SIMULATE" in page for page in text.split("\f") if page.strip())


def battery_only(pair):
    s, a = pair
    g = a.grid_verdict.model_copy(update={"requires_technician_telegram_alert": False})
    b = a.battery_verdict.model_copy(update={"severity": types.SimpleNamespace(value="CRITICAL")})
    return s, a.model_copy(update={"grid_verdict": g, "battery_verdict": b,
        "overall_severity": types.SimpleNamespace(value="CRITICAL")})


def test_battery_alert_uses_overall_severity_and_battery_action(pair):
    msg = format_technician_alert(*battery_only(pair))
    assert "🔴" in msg and "(CRITICAL)" in msg
    assert "Baterie" in msg and "SoC" in msg
    assert "DEMO" in msg


def test_nonrecommended_alert_does_not_send(pair):
    s, a = pair
    a = a.model_copy(update={"grid_verdict": a.grid_verdict.model_copy(update={"requires_technician_telegram_alert": False}),
        "battery_verdict": a.battery_verdict.model_copy(update={"status": types.SimpleNamespace(value="OPTIMAL")})})
    def fail(request):
        pytest.fail("nonrecommended alert must not send")
    with httpx.Client(transport=httpx.MockTransport(fail)) as client:
        out = send_technician_alert(s, a, "secret", "42", client=client)
    assert not out["sent"] and not out["recommended"]
    assert out["prepared"] and not out["failed"]


def test_configured_server_bot_cannot_be_redirected(monkeypatch, pair):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "server-secret")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "server-chat")
    def fail(request):
        pytest.fail("caller must not redirect server bot")
    with httpx.Client(transport=httpx.MockTransport(fail)) as client:
        out = send_technician_alert(*pair, chat_id="attacker", client=client)
    assert not out["sent"] and out["failed"]


def test_nested_telegram_response_never_exposes_token(pair):
    secret = "123456:private-token"
    def response(request):
        return httpx.Response(400, json={"ok": False, "result": {"deep": [secret]}, "description": secret})
    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        out = send_technician_alert(*pair, secret, "42", client=client)
    assert secret not in json.dumps(out)
    assert out["failed"] and not out["sent"] and out["prepared"]


@pytest.mark.parametrize("status", ["UNSUPPORTED_SETTLEMENT_REGIME", "INVOICE_AMOUNT_MISMATCH", "INSUFFICIENT_DATA"])
def test_new_billing_status_is_truthful_and_none_safe(pair, status):
    a = pair[1]
    verdict = a.billing_verdict.model_copy(update={"status": types.SimpleNamespace(value=status),
        "correct_payable_ron": None, "financial_discrepancy_ron": None})
    facts = dict(a.deterministic_facts, billing_status=status, billing_correct_payable_ron=None,
                 billing_financial_discrepancy_ron=None)
    out = generate_verified_explanation(a.model_copy(update={"billing_verdict": verdict,
        "deterministic_facts": facts}), "invoice_explanation")
    assert out.guardrail_passed
    assert status in out.text_ro
    assert "Factura este corectă" not in out.text_ro and "1:1" not in out.text_ro


@pytest.mark.parametrize("status", ["MISCONFIGURED_DISCHARGE_POLICY", "INSUFFICIENT_DATA"])
def test_new_battery_status_never_promises_locked_capacity(pair, status):
    a = pair[1]
    b = a.battery_verdict.model_copy(update={"status": types.SimpleNamespace(value=status)})
    out = generate_verified_explanation(a.model_copy(update={"battery_verdict": b,
        "deterministic_facts": dict(a.deterministic_facts, battery_status=status)}), "battery_guide")
    assert out.guardrail_passed and status in out.text_ro
    assert "Capacitate blocată" not in out.text_ro


@pytest.mark.parametrize("cause", ["INSUFFICIENT_DATA", "MONITORING_UNCERTAIN"])
def test_uncertain_grid_template_does_not_diagnose_local(pair, cause):
    a = pair[1]
    g = a.grid_verdict.model_copy(update={"cause": types.SimpleNamespace(value=cause)})
    out = generate_verified_explanation(a.model_copy(update={"grid_verdict": g,
        "deterministic_facts": dict(a.deterministic_facts, grid_cause=cause)}), "distributor_complaint")
    assert out.guardrail_passed and cause in out.text_ro
    assert "problema este locală" not in out.text_ro and "Solicităm:" not in out.text_ro


def test_uncertain_pdf_does_not_present_missing_measurements_as_zero(pair):
    s, a = pair
    g = a.grid_verdict.model_copy(update={"cause": types.SimpleNamespace(value="INSUFFICIENT_DATA"),
        "max_inverter_voltage_v": 0, "max_meter_voltage_v": 0, "events": []})
    pdf = build_distributor_dossier_pdf(s, a.model_copy(update={"grid_verdict": g}))
    text = _extract_pdf_text(pdf)
    assert "0.00 V" not in text
    assert "Nicio fereastra" not in text


def test_server_bot_rejects_chat_override_even_when_explicit_token_matches(monkeypatch, pair):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "server-secret")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "server-chat")
    def fail(request):
        pytest.fail("explicitly repeating the server token cannot bypass destination policy")
    with httpx.Client(transport=httpx.MockTransport(fail)) as client:
        out = send_technician_alert(*pair, "server-secret", "attacker", client=client)
    assert out["failed"] and not out["sent"]


def test_user_question_string_cannot_whitelist_a_numeric_claim():
    out = verify_text_against_facts("Tensiune 450 V", {"user_question": "Tensiune 450 V", "truck_cost_ron": 450})
    assert not out.guardrail_passed
