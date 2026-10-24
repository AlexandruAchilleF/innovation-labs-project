"""Explainer + numeric anti-hallucination guardrail.

Engines compute every number; text (Romanian template or optional Claude LLM) only explains them.
Every number found in a text must match a deterministic fact, otherwise the text is rejected and the
verified deterministic template is shown instead.
"""
from __future__ import annotations

import json
import os
import re

from sunproof.models import HouseholdCompleteAnalysis, HouseholdScenario, VerifiedTextOutput
from sunproof.text_templates import ID_FIELDS as _ID_FIELDS
from sunproof.text_templates import analysis_facts, build_template_text, fmt_ro

__all__ = ["DOC_TYPES", "LEGAL_REFERENCE_WHITELIST", "analysis_facts", "build_template_text", "explain_household",
           "extract_numbers_ro", "fmt_ro", "generate_verified_explanation", "verify_text", "verify_text_against_facts"]

DOC_TYPES = ("distributor_complaint", "invoice_explanation", "battery_guide")
_FIELD = {"distributor_complaint": "distributor_complaint_text",
          "invoice_explanation": "invoice_explanation_text", "battery_guide": "battery_guide_text"}
# Legal / regulatory references whose digits are not claims (removed before extraction).
LEGAL_REFERENCE_WHITELIST = ("SR EN 50549-1", "EN 50549-1", "EN 50549", "SR EN 50160", "EN 50160",
                             "Legea 160/2026", "Legea nr. 160/2026", "Legea 123/2012",
                             "Ordinul ANRE nr. 46/2021", "Ord. ANRE 46/2021")
_NUM_RE = re.compile(r"(?<![\w.,])([-−]?)(\d{1,3}(?:\.\d{3})+(?!\d)(?:,\d+)?|\d+,\d+|\d+\.\d+|\d+)(\s*%)?")
_RO_THOUSANDS = re.compile(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?")



# ---------------------------------------------------------------- number extraction
def _candidates(sign: str, body: str, pct: str | None) -> list[tuple[float, bool]]:
    """All plausible (value, written_as_integer) readings; the first one is the Romanian reading."""
    neg = -1.0 if sign else 1.0
    out: list[tuple[float, bool]] = []
    if _RO_THOUSANDS.fullmatch(body):
        ip, _, dp = body.partition(",")
        out.append((float(ip.replace(".", "") + ("." + dp if dp else "")), not dp))
        if not dp and body.count(".") == 1:
            out.append((float(body), False))           # "1.320" may also be English 1.32
    elif "," in body:
        ip, dp = body.split(",")
        out.append((float(f"{ip}.{dp}"), False))
        if len(dp) == 3:
            out.append((float(ip + dp), True))         # "1,320" may also be English 1320
    else:
        out.append((float(body), "." not in body))
    if pct:
        out += [(v / 100.0, False) for v, _ in list(out)]
    return [(neg * v, is_int) for v, is_int in out]


def _strip_known(text: str, facts: dict | None) -> str:
    for ref in sorted(LEGAL_REFERENCE_WHITELIST, key=len, reverse=True):
        text = re.sub(re.escape(ref), " ", text, flags=re.IGNORECASE)
    strings = {str(v).strip() for v in (facts or {}).values() if isinstance(v, str)}
    for s in sorted((s for s in strings if len(s) >= 3 and not re.fullmatch(r"-?\d+(?:[.,]\d+)?", s)),
                    key=len, reverse=True):
        text = text.replace(s, " ")
    return text


def _tokens(text: str, facts: dict | None = None) -> list[list[tuple[float, bool]]]:
    return [_candidates(m.group(1), m.group(2), m.group(3))
            for m in _NUM_RE.finditer(_strip_known(text or "", facts))]


def extract_numbers_ro(text_ro: str) -> list[float]:
    """Numbers in Romanian text (RO reading: `1.320`=1320, `210,80`=210.8); legal refs are ignored."""
    return [cands[0][0] for cands in _tokens(text_ro)]


# ---------------------------------------------------------------- guardrail
def _string_numbers(facts: dict) -> dict[float, str]:
    """Numbers written inside string facts (e.g. 'nr. 14'), excluding times/dates (too generic)."""
    out: dict[float, str] = {}
    for k, v in facts.items():
        if isinstance(v, str) and not re.fullmatch(r"\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}", v.strip()):
            for cands in _tokens(v):
                out.setdefault(cands[0][0], k)
    return out


def _match(cands: list[tuple[float, bool]], facts: dict, strnums: dict[float, str]) -> str | None:
    best, best_d = None, None
    for v, is_int in cands:
        for k, f in facts.items():
            if isinstance(f, str):
                continue
            d = abs(v - float(f))
            if d <= (1.0 if is_int else 0.01 + 0.005 * abs(float(f))) and (best_d is None or d < best_d):
                best, best_d = k, d
    if best is None:
        best = next((strnums[v] for v, _ in cands if v in strnums), None)
    return best


def _check(text: str, facts: dict) -> tuple[list[float], list[float], dict]:
    extracted, bad, used, strnums = [], [], {}, _string_numbers(facts)
    for cands in _tokens(text, facts):
        extracted.append(cands[0][0])
        key = _match(cands, facts, strnums)
        if key is None:
            if cands[0][0] not in bad:
                bad.append(cands[0][0])
        else:
            used[key] = facts[key]
    return extracted, bad, used


def verify_text_against_facts(text_ro: str, facts: dict, *, document_type: str = "guardrail_demo",
                              fallback_text_ro: str | None = None, source: str = "llm") -> VerifiedTextOutput:
    """Every number in `text_ro` must match a fact; otherwise reject (and use `fallback_text_ro` if given)."""
    extracted, bad, used = _check(text_ro, facts)
    if not bad:
        return VerifiedTextOutput(document_type=document_type, text_ro=text_ro, source=source,
                                  guardrail_passed=True, numbers_extracted_from_text=extracted,
                                  unverified_numbers_caught=[], facts_used=used)
    final_text, final_source = text_ro, source
    if fallback_text_ro is not None:
        final_text, final_source = fallback_text_ro, "template_fallback"
        used = _check(fallback_text_ro, facts)[2]
    return VerifiedTextOutput(document_type=document_type, text_ro=final_text, source=final_source,
                              guardrail_passed=False, numbers_extracted_from_text=extracted,
                              unverified_numbers_caught=bad, facts_used=used)


def verify_text(text_ro: str, document_type: str, source: str, facts: dict) -> VerifiedTextOutput:
    """Roadmap alias of `verify_text_against_facts` (no fallback text)."""
    return verify_text_against_facts(text_ro, facts, document_type=document_type, source=source)


# ---------------------------------------------------------------- LLM (optional) + orchestration
_SYSTEM_RO = ("Ești asistentul SunProof pentru un furnizor de energie din România. Scrii în limba română, clar și "
              "politicos. Folosește EXCLUSIV cifrele din faptele furnizate (JSON), scrise în format românesc "
              "(virgulă zecimală, punct pentru mii). Nu inventa, nu calcula și nu rotunji alte cifre; nu numerota "
              "listele (folosește '•'). Dacă o informație lipsește, nu o menționa. Răspunde doar cu textul final.")
_PREFIX = {"distributor_complaint": ("grid_",), "invoice_explanation": ("billing_", "invoice_", "grid_tariffs",
           "total_retail"), "battery_guide": ("battery_",)}


def _relevant_facts(analysis: HouseholdCompleteAnalysis, doc_type: str) -> dict:
    facts = analysis_facts(analysis)
    keep = _PREFIX[doc_type] + _ID_FIELDS + ("household_id", "installed_pv_kw", "days_in_month", "distribution")
    out = {k: v for k, v in facts.items() if k.startswith(keep)}
    return {k: v for k, v in out.items() if not re.match(r"grid_event_(\d+)_", k) or
            int(re.match(r"grid_event_(\d+)_", k).group(1)) <= 5}


def _call_claude(analysis: HouseholdCompleteAnalysis, doc_type: str, template: str) -> str:
    import anthropic  # lazy: optional dependency, never imported in tests

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    prompt = (f"Tip document: {doc_type}\nFapte verificate (JSON):\n"
              f"{json.dumps(_relevant_facts(analysis, doc_type), ensure_ascii=False)}\n\n"
              f"Text de referință (corect, deterministic):\n{template}\n\n"
              "Reformulează textul de referință într-un stil natural, păstrând toate cifrele exact cum apar.")
    msg = client.messages.create(model=os.environ.get("LLM_MODEL", "claude-sonnet-5-5"), max_tokens=800,
                                 system=_SYSTEM_RO, messages=[{"role": "user", "content": prompt}])
    text = "".join(getattr(b, "text", "") for b in msg.content if getattr(b, "type", "") == "text").strip()
    if not text:
        raise ValueError("răspuns LLM gol")
    return text


def generate_verified_explanation(analysis: HouseholdCompleteAnalysis, doc_type: str,
                                  use_claude_api: bool = False) -> VerifiedTextOutput:
    """LLM text (if enabled and keyed) checked by the guardrail; deterministic template otherwise."""
    facts, template = analysis_facts(analysis), build_template_text(analysis, doc_type)
    if use_claude_api and os.environ.get("ANTHROPIC_API_KEY"):
        try:
            llm_text = _call_claude(analysis, doc_type, template)
            return verify_text_against_facts(llm_text, facts, document_type=doc_type,
                                             fallback_text_ro=template, source="llm")
        except Exception:  # noqa: BLE001 - any API/network problem -> deterministic template
            pass
    return verify_text_against_facts(template, facts, document_type=doc_type, source="template")


def explain_household(scenario: HouseholdScenario, analysis: HouseholdCompleteAnalysis, *,
                      use_llm: bool = False) -> HouseholdCompleteAnalysis:
    """Copy of `analysis` with the three verified Romanian texts filled in."""
    del scenario  # texts rely only on the analysis (all numbers live in deterministic_facts)
    return analysis.model_copy(update={_FIELD[d]: generate_verified_explanation(analysis, d, use_llm)
                                       for d in DOC_TYPES})
