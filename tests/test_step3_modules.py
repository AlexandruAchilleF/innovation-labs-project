"""Step 3 (Agent B): numeric guardrail + templates, PDF dossier, Telegram technician alert."""
from __future__ import annotations

import json
import sys
import types

import httpx
import pytest

from sunproof.engine import analyze_household
from sunproof.explainer import (DOC_TYPES, analysis_facts, build_template_text, explain_household,
                                extract_numbers_ro, fmt_ro, generate_verified_explanation, verify_text,
                                verify_text_against_facts)
from sunproof.pdf_dossier import build_distributor_dossier_pdf, build_distributor_pdf_bytes, to_pdf_safe
from sunproof.scenarios import get_all_scenarios, get_scenario_by_id
from sunproof.telegram_bot import format_technician_alert, send_technician_alert

TOKEN = "123456:SECRET-TOKEN-abc"


@pytest.fixture(scope="module")
def pairs():
    return [(s, analyze_household(s)) for s in get_all_scenarios()]


@pytest.fixture(scope="module")
def tm001():
    s = get_scenario_by_id("RO-TM-001")
    return s, analyze_household(s)


# ------------------------------------------------------------------ number extraction
@pytest.mark.parametrize("text, expected", [
    ("1.320 kWh", [1320.0]), ("210,80 RON", [210.8]), ("1.320,50 RON", [1320.5]), ("6.57 V", [6.57]),
    ("253 V", [253.0]), ("-12,5 kWh", [-12.5]), ("55%", [55.0]), ("1.234.567", [1234567.0]),
    ("între 10:40 și 11:05", [10.0, 40.0, 11.0, 5.0]), ("EN 50549-1 și Legea 160/2026", []),
    ("faza L1, Ordinul ANRE nr. 46/2021", []),
])
def test_extract_numbers_ro(text, expected):
    assert extract_numbers_ro(text) == expected


def test_string_facts_are_stripped_before_extraction():
    facts = {"t": "10:40", "pod": "RO002E145892001", "inv": "SP-2026-884120", "d": "2026-08-18", "v": 253.0}
    out = verify_text_against_facts("La 10:40 (POD RO002E145892001, factura SP-2026-884120, 2026-08-18): 253 V",
                                    facts)
    assert out.guardrail_passed and out.numbers_extracted_from_text == [253.0]


def test_ambiguous_thousands_and_tolerances():
    assert not verify_text_against_facts("1.320 kWh", {"x": 1.32}).guardrail_passed  # RO means 1320
    assert not verify_text_against_facts("1.320 kWh", {"x": 1320.4}).guardrail_passed
    assert not verify_text_against_facts("225 kWh", {"x": 225.9}).guardrail_passed
    assert not verify_text_against_facts("6,70 V", {"x": 6.57}).guardrail_passed     # decimals: tight
    assert verify_text_against_facts("55%", {"ratio": 0.55}).guardrail_passed         # percent of a ratio
    assert verify_text_against_facts("Str. Soarelui nr. 14", {"addr": "Str. Soarelui nr. 14"}).guardrail_passed
    assert not verify_text_against_facts("ora 7", {"t": "10:40"}).guardrail_passed   # times are not a pool


@pytest.mark.parametrize("x", [1320.5, 0.55, 253.0, 1711.85, 6.57, 1234567.89, -3.2, 0.0])
def test_fmt_ro_round_trips_through_guardrail(x):
    assert verify_text_against_facts(f"valoare {fmt_ro(x)} RON", {"x": x}).guardrail_passed


# ------------------------------------------------------------------ guardrail demo + templates
def test_demo_999_ron_is_caught_and_falls_back(tm001):
    _, a = tm001
    template = build_template_text(a, "distributor_complaint")
    bad = template + "\nPierderea reală este de 999 RON pe lună."
    out = verify_text_against_facts(bad, analysis_facts(a), document_type="distributor_complaint",
                                    fallback_text_ro=template, source="llm")
    assert out.unverified_numbers_caught == [999.0]
    assert out.guardrail_passed is False and out.source == "template_fallback" and out.text_ro == template
    assert 999.0 not in out.numbers_extracted_from_text  # returned text is independently checked
    assert 0 < len(out.facts_used) < 40
    no_fallback = verify_text(bad, "distributor_complaint", "llm", analysis_facts(a))
    assert not no_fallback.guardrail_passed and no_fallback.text_ro == bad
    assert verify_text_against_facts(template, analysis_facts(a)).guardrail_passed


def test_every_template_passes_its_own_guardrail(pairs):
    failures = []
    for _, a in pairs:
        for doc in DOC_TYPES:
            out = generate_verified_explanation(a, doc)
            if not (out.guardrail_passed and out.source == "template" and out.text_ro):
                failures.append((a.household_id, doc, out.unverified_numbers_caught))
    assert not failures


def test_templates_adapt_to_verdicts(pairs):
    by = {}
    for _, a in pairs:
        by.setdefault(("g", a.grid_verdict.cause.value), a)
        by.setdefault(("b", a.battery_verdict.status.value), a)
        by.setdefault(("i", a.billing_verdict.status.value), a)
    assert "Solicităm" in build_template_text(by[("g", "GRID_OVERVOLTAGE")], "distributor_complaint")
    local = next(v for k, v in by.items() if k[0] == "g" and k[1].startswith("LOCAL"))
    assert "caracter informativ" in build_template_text(local, "distributor_complaint")
    assert "nu aveți baterie" in build_template_text(by[("b", "NO_BATTERY")], "battery_guide")
    assert "Pași de urmat" in build_template_text(by[("b", "MISCONFIGURED_SOC_RESERVE")], "battery_guide")
    assert "Factura este corectă" in build_template_text(by[("i", "INVOICE_VALID_EXPLAINED")],
                                                          "invoice_explanation")
    assert "lipsește indexul" in build_template_text(by[("i", "MISSING_EXPORT_INDEX")], "invoice_explanation")
    with pytest.raises(ValueError):
        build_template_text(by[("b", "OPTIMAL")], "unknown")


def test_generate_without_key_uses_template(monkeypatch, tm001):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    out = generate_verified_explanation(tm001[1], "invoice_explanation", use_claude_api=True)
    assert out.source == "template" and out.guardrail_passed


def _fake_anthropic(text):
    class _Messages:
        def create(self, **kwargs):
            assert kwargs["max_tokens"] <= 1000 and len(json.dumps(kwargs["messages"])) < 30000
            return types.SimpleNamespace(stop_reason="end_turn", content=[types.SimpleNamespace(type="text", text=text)])
    return types.SimpleNamespace(Anthropic=lambda **kw: types.SimpleNamespace(messages=_Messages(), close=lambda: None))


def test_llm_path_is_guarded_offline(monkeypatch, tm001):
    _, a = tm001
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    template = build_template_text(a, "battery_guide")
    monkeypatch.setitem(sys.modules, "anthropic", _fake_anthropic(template))
    assert generate_verified_explanation(a, "battery_guide", use_claude_api=True).source == "llm"
    monkeypatch.setitem(sys.modules, "anthropic", _fake_anthropic("Pierdeți 999 RON lunar."))
    out = generate_verified_explanation(a, "battery_guide", use_claude_api=True)
    assert out.source == "template_fallback" and out.unverified_numbers_caught == [999.0]
    assert out.text_ro == template


def test_explain_household_fills_three_texts(tm001):
    s, a = tm001
    out = explain_household(s, a)
    for field in ("distributor_complaint_text", "invoice_explanation_text", "battery_guide_text"):
        assert getattr(out, field).guardrail_passed
    assert a.distributor_complaint_text is None  # original untouched


# ------------------------------------------------------------------ PDF dossier
def test_to_pdf_safe():
    assert to_pdf_safe("Rețea șină Țară ŞŢ ă â î — ≥ “x” · ok") == 'Retea sina Tara ST a a i - >= "x" - ok'
    assert to_pdf_safe("€ 1") == "? 1"


def test_pdf_for_all_scenarios(pairs):
    assert build_distributor_dossier_pdf is build_distributor_pdf_bytes
    for s, a in pairs:
        pdf = build_distributor_pdf_bytes(s, a)
        assert pdf.startswith(b"%PDF") and len(pdf) > 2000, s.household_id


# ------------------------------------------------------------------ Telegram
def test_alert_message_content(tm001):
    s, a = tm001
    msg = format_technician_alert(s, a)
    for part in (s.household_id, s.pod_code, "257.19 V", "250.62 V", "6.57 V", "Acțiune recomandată"):
        assert part in msg
    assert "🔋" in msg  # battery misconfigured one-liner


def test_telegram_simulated_without_env(monkeypatch, tm001):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.delenv("TELEGRAM_CHAT_ID", raising=False)
    out = send_technician_alert(*tm001)
    assert out["simulated"] is True and out["sent"] is False and out["reason"]
    assert out["payload"]["parse_mode"] == "HTML" and out["household_id"] == "RO-TM-001"
    assert send_technician_alert(*tm001, TOKEN, "42", dry_run=True)["simulated"] is True


def test_telegram_real_path_with_mock_transport(monkeypatch, tm001):
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"], seen["body"] = str(request.url), json.loads(request.content)
        return httpx.Response(200, json={"ok": True, "result": {"message_id": 7}})

    out = send_technician_alert(*tm001, TOKEN, "42", client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert "sendMessage" in seen["url"] and seen["body"]["chat_id"] == "42"
    assert out["sent"] is True and out["simulated"] is False
    assert TOKEN not in json.dumps(out, ensure_ascii=False, default=str)


def test_telegram_network_error_hides_token(monkeypatch, tm001):
    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError(f"cannot reach {request.url}", request=request)

    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", TOKEN)
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "42")
    out = send_technician_alert(*tm001, client=httpx.Client(transport=httpx.MockTransport(boom)))
    assert out["sent"] is False and "error" in out and "***" in out["error"]
    assert TOKEN not in json.dumps(out, ensure_ascii=False, default=str)
