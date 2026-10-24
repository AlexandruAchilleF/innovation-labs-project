"""SunProof HTTP API + single-page UI (`uvicorn sunproof.app:app`).

Deterministic engines decide; texts are verified explanations. Analyses are cached in-process
(see `sunproof.api_support`). `SUNPROOF_USE_LLM=1` enables the LLM path of the explainer.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

from sunproof import api_support as sup
from sunproof.engine import analyze_household
from sunproof.explainer import DOC_TYPES, analysis_facts, build_template_text, verify_text_against_facts
from sunproof.pdf_dossier import build_distributor_pdf_bytes
from sunproof.scenarios import (
    get_all_neighborhood_analyses,
    get_neighborhood_analysis,
    get_scenario_by_id,
    simulate_neighborhood_what_if,
    simulate_scenario_with_battery_override,
)
from sunproof.telegram_bot import send_technician_alert

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(title="SunProof", description="Prosumer & Grid Intelligence Engine (RO, aug 2026)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ---------------------------------------------------------------- request bodies
class BatteryOverrideBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    min_soc_pct: float = Field(..., ge=0.0, le=100.0)
    mode: Optional[str] = None

    @field_validator("mode")
    @classmethod
    def _valid_mode(cls, v: Optional[str]) -> Optional[str]:
        parsed = sup.parse_battery_mode(v)  # raises ValueError -> 422
        return parsed.value if parsed else None


class NeighborhoodWhatIfBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tap_setting_pct: Optional[float] = None
    transformer_kva: Optional[float] = None
    feeder_cable_upgrades: Optional[Dict[str, str]] = None
    rebalance_phases: bool = False
    enable_volt_watt_all: bool = False
    fix_all_batteries: bool = False


class TelegramBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None
    dry_run: bool = False


class GuardrailBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text_ro: Optional[str] = None
    doc_type: str = "invoice_explanation"

    @field_validator("doc_type")
    @classmethod
    def _valid_doc_type(cls, v: str) -> str:
        if v not in DOC_TYPES:
            raise ValueError(f"doc_type must be one of {list(DOC_TYPES)}")
        return v


# ---------------------------------------------------------------- helpers
def _scenario_or_404(household_id: str):
    try:
        return get_scenario_by_id(household_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Gospodărie necunoscută: {household_id}")


def _neighborhood_or_404(neighborhood_id: str):
    try:
        return get_neighborhood_analysis(neighborhood_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Cartier necunoscut: {neighborhood_id}")


# ---------------------------------------------------------------- UI + health
@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html", media_type="text/html")


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------- portfolio + households
@app.get("/api/portfolio")
def portfolio() -> Dict[str, Any]:
    return {"metrics": sup.dump(sup.portfolio_metrics()), "households": sup.all_household_summaries()}


@app.get("/api/households")
def households() -> list:
    return sup.all_household_summaries()


@app.get("/api/households/{household_id}")
def household_detail(household_id: str) -> Dict[str, Any]:
    scenario = _scenario_or_404(household_id)
    return {"scenario": sup.scenario_light(scenario),
            "analysis": sup.dump(sup.explained_analysis(household_id)),
            "timeseries": sup.household_timeseries(scenario)}


@app.get("/api/households/{household_id}/analysis")
def household_analysis(household_id: str) -> Dict[str, Any]:
    _scenario_or_404(household_id)
    return sup.dump(sup.explained_analysis(household_id))


@app.get("/api/households/{household_id}/timeseries")
def household_timeseries(household_id: str) -> Dict[str, Any]:
    return sup.household_timeseries(_scenario_or_404(household_id))


@app.post("/api/households/{household_id}/what-if-battery")
@app.post("/api/households/{household_id}/battery-override")
def battery_what_if(household_id: str, body: BatteryOverrideBody) -> Dict[str, Any]:
    scenario = _scenario_or_404(household_id)
    mode = sup.parse_battery_mode(body.mode)
    new_scenario = simulate_scenario_with_battery_override(household_id, body.min_soc_pct, mode)
    before = sup.explained_analysis(household_id)
    after = sup.explained(new_scenario, analyze_household(new_scenario))
    return {
        "household_id": household_id,
        "override": {"min_soc_pct": body.min_soc_pct, "mode": mode.value if mode else None},
        "before": sup.dump(before), "after": sup.dump(after),
        "delta": sup.battery_delta(before, after),
        "timeseries": {"before": sup.battery_series(scenario), "after": sup.battery_series(new_scenario)},
    }


@app.get("/api/households/{household_id}/pdf-dossier")
@app.get("/api/households/{household_id}/dossier.pdf")
def pdf_dossier(household_id: str) -> Response:
    scenario = _scenario_or_404(household_id)
    pdf = build_distributor_pdf_bytes(scenario, sup.explained_analysis(household_id))
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="dosar_{household_id}.pdf"'})


@app.post("/api/households/{household_id}/telegram-alert")
def telegram_alert(household_id: str, body: Optional[TelegramBody] = Body(default=None)) -> Dict[str, Any]:
    scenario = _scenario_or_404(household_id)
    body = body or TelegramBody()
    result = send_technician_alert(scenario, sup.explained_analysis(household_id),
                                   bot_token=body.bot_token, chat_id=body.chat_id, dry_run=body.dry_run)
    return sup.redact(result, body.bot_token)


@app.post("/api/households/{household_id}/test-guardrail")
def guardrail_check(household_id: str, body: Optional[GuardrailBody] = Body(default=None)) -> Dict[str, Any]:
    _scenario_or_404(household_id)
    body = body or GuardrailBody()
    analysis = sup.raw_analysis(household_id)
    template = build_template_text(analysis, body.doc_type)
    text = body.text_ro if body.text_ro is not None else template + sup.HALLUCINATED_SENTENCE_RO
    # deterministic_facts + identity strings (POD, address, ...), same fact set the explainer verifies against
    result = verify_text_against_facts(text, analysis_facts(analysis), document_type=body.doc_type,
                                       fallback_text_ro=template, source="llm")
    return {"input_text_ro": text, "result": sup.dump(result),
            "caught": list(result.unverified_numbers_caught),
            "fallback_applied": result.source == "template_fallback"}


# ---------------------------------------------------------------- neighborhoods
@app.get("/api/neighborhoods")
def neighborhoods() -> list:
    return [sup.neighborhood_summary(n) for n in get_all_neighborhood_analyses()]


@app.get("/api/neighborhoods/{neighborhood_id}")
def neighborhood_detail(neighborhood_id: str, full: bool = False) -> Dict[str, Any]:
    return sup.neighborhood_detail(_neighborhood_or_404(neighborhood_id), full=full)


@app.post("/api/neighborhoods/{neighborhood_id}/what-if")
def neighborhood_what_if(neighborhood_id: str, body: NeighborhoodWhatIfBody) -> Dict[str, Any]:
    before = _neighborhood_or_404(neighborhood_id)
    try:
        after = simulate_neighborhood_what_if(neighborhood_id, **body.model_dump())
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=f"Scenariu what-if invalid: {exc}")
    return {"neighborhood_id": neighborhood_id, "what_if": body.model_dump(),
            "before": sup.neighborhood_summary(before), "after": sup.neighborhood_summary(after)}
