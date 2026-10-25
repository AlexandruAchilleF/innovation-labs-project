"""O&M technician alert over the Telegram Bot API (HTML parse mode).

Without a bot token + chat id (or with `dry_run=True`) the alert is only simulated and the payload returned.
The bot token is never included in the returned dict or in error messages.
"""
from __future__ import annotations

import os
from html import escape
from typing import Optional

import httpx

from sunproof.models import HouseholdCompleteAnalysis, HouseholdScenario

TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage"
TELEGRAM_MAX_CHARS = 4096
_SEVERITY_EMOJI = {"CRITICAL": "🔴", "WARNING": "🟠", "INFO": "🔵", "OK": "🟢"}
_CAUSE_RO = {"GRID_OVERVOLTAGE": "supratensiune în rețea (post de transformare)",
             "LOCAL_OVERVOLTAGE_SENSITIVITY": "prag de declanșare setat greșit în invertor",
             "LOCAL_CABLE_IMPEDANCE": "cablu AC intern subdimensionat",
             "LOCAL_EQUIPMENT_FAULT": "defect de echipament (invertor / stringuri)",
             "NONE": "fără declanșări anormale"}
_BATTERY_ISSUES = ("MISCONFIGURED_SOC_RESERVE", "MISCONFIGURED_MODE", "UNDERPERFORMING_CAPACITY", "MISCONFIGURED_DISCHARGE_POLICY")


def _inverter_label(s: HouseholdScenario) -> str:
    brand = s.inverter_brand.value
    return s.inverter_model if s.inverter_model.lower().startswith(brand.lower()) else f"{brand} {s.inverter_model}"


def format_technician_alert(scenario: HouseholdScenario, analysis: HouseholdCompleteAnalysis) -> str:
    """Short Romanian HTML message for the field technician (all dynamic values HTML-escaped)."""
    g, b, s = analysis.grid_verdict, analysis.battery_verdict, scenario
    e = lambda v: escape(str(v))  # noqa: E731
    severity = analysis.overall_severity.value
    battery_primary = b.status.value in _BATTERY_ISSUES and (
        not g.requires_technician_telegram_alert or b.severity.value == severity)
    action = (" ".join(b.step_by_step_fix_ro) or b.headline_ro) if battery_primary else g.recommended_action_supplier_ro
    lines = [
        "<b>DEMO / DATE SIMULATE</b> · sursa: scenarii sintetice SunProof",
        f"{_SEVERITY_EMOJI.get(severity, '⚪')} <b>SunProof — alertă O&amp;M ({e(severity)})</b>",
        f"<b>{e(s.household_id)}</b> · {e(s.customer_name)}",
        f"📍 {e(s.street_address)}, {e(s.city)}, jud. {e(s.county)}",
        f"POD: <code>{e(s.pod_code)}</code> · PT: {e(s.transformer_id)}",
        f"⚙️ Invertor: {e(_inverter_label(s))} ({s.installed_pv_kw:.1f} kW), "
        f"prag declanșare configurat <b>{g.configured_trip_threshold_v:.2f} V</b>",
        f"⚡ Tensiune max: invertor <b>{g.max_inverter_voltage_v:.2f} V</b> / maxim medii contor (PCC, 15 min) "
        f"<b>{g.max_meter_voltage_v:.2f} V</b> (limită EN 50549-1: {g.en50549_legal_limit_v:.0f} V)",
        f"🔌 Creștere pe cablul AC intern: <b>{g.voltage_rise_internal_cable_v:.2f} V</b> "
        f"({s.internal_ac_cable_section_mm2:.1f} mm², {s.internal_ac_cable_length_m:.1f} m)",
        f"⏱ Opriri azi: <b>{g.total_trip_minutes_today} min</b> · pierdut {g.lost_production_today_kwh:.2f} kWh "
        f"(echipamente afectate simultan: {g.neighbors_affected_simultaneously}/{g.neighbors_total})",
        f"🩺 Cauză: <b>{e(_CAUSE_RO.get(g.cause.value, g.cause.value))}</b>",
        f"✅ Acțiune recomandată: {e(action)}",
    ]
    if b.status.value in _BATTERY_ISSUES:
        lines.append(f"🔋 Baterie: {e(b.headline_ro)} · stare {e(b.status.value)}")
        lines.append(f"SoC dorit {b.desired_min_soc_pct:.2f}% / configurat {b.configured_min_soc_pct:.2f}% · "
                     f"mod {e(b.configured_mode.value)} / dorit {e(b.desired_mode.value)}")
    return "\n".join(lines)[:TELEGRAM_MAX_CHARS]


def _redact(text: str, token: Optional[str]) -> str:
    return text.replace(token, "***") if token else text


def send_technician_alert(scenario: HouseholdScenario, analysis: HouseholdCompleteAnalysis,
                          bot_token: Optional[str] = None, chat_id: Optional[str] = None, *,
                          dry_run: bool = False, client: Optional[httpx.Client] = None) -> dict:
    """Send (or simulate) the technician alert. Returns a dict that never contains the bot token."""
    text = format_technician_alert(scenario, analysis)
    server_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    server_chat = os.environ.get("TELEGRAM_CHAT_ID")
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = chat_id or os.environ.get("TELEGRAM_CHAT_ID")
    payload = {"chat_id": chat or "<TELEGRAM_CHAT_ID>", "text": text, "parse_mode": "HTML",
               "disable_web_page_preview": True}
    result = {"household_id": scenario.household_id, "message_text": text, "payload": payload,
              "recommended": bool(analysis.grid_verdict.requires_technician_telegram_alert or
                                  analysis.battery_verdict.status.value in _BATTERY_ISSUES),
              "prepared": True, "failed": False}
    if server_token and token == server_token and chat_id is not None and chat_id != server_chat:
        return {**result, "simulated": True, "sent": False, "failed": True,
                "error": "Destinația botului serverului nu poate fi schimbată de apelant."}
    if not result["recommended"]:
        return {**result, "simulated": True, "sent": False,
                "reason": "Nicio alertă de tehnician recomandată pentru acest diagnostic."}
    if dry_run or not token or not chat:
        reason = ("dry_run activ: mesajul nu a fost trimis" if dry_run else
                  "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID lipsesc: trimitere simulată")
        return {**result, "simulated": True, "sent": False, "reason": reason}
    try:
        url = TELEGRAM_API_URL.format(token=token)
        if client is not None:
            resp = client.post(url, json=payload, timeout=10.0)
        else:
            with httpx.Client(timeout=httpx.Timeout(10.0, connect=5.0),
                              transport=httpx.HTTPTransport(retries=0), follow_redirects=False) as own_client:
                resp = own_client.post(url, json=payload)
        try:
            data = resp.json()
        except ValueError:
            data = {"ok": False, "description": _redact(resp.text[:300], token)}
        if not isinstance(data, dict):
            data = {"ok": False, "description": "Răspuns Telegram invalid"}
        ok = resp.status_code == 200 and data.get("ok") is True
        # Do not return provider-controlled nested objects (URLs can contain credentials).
        safe_data = {"ok": ok}
        if ok and isinstance(data.get("result"), dict):
            message_id = data["result"].get("message_id")
            if isinstance(message_id, int):
                safe_data["result"] = {"message_id": message_id}
        out = {**result, "simulated": False, "sent": ok, "failed": not ok, "telegram_response": safe_data}
        if not ok:
            out["error"] = _redact(f"HTTP {resp.status_code}: {data.get('description', 'eroare Telegram')}", token)
        return out
    except Exception as exc:  # noqa: BLE001 - network/HTTP errors are reported, never raised
        return {**result, "simulated": False, "sent": False, "failed": True, "telegram_response": None,
                "error": _redact(f"{type(exc).__name__}: {exc}", token)}
