"""Strict Romanian numeric parsing and unit evidence for the public numeric guardrail.

This validates numeric evidence only, not attribution in arbitrary prose. Generated documents
must additionally match a deterministic template whose slots name their source fields.
"""
import math
import re

NUMBER = re.compile(r"(?<![\d.,])([-−]?)(\d{1,3}(?:[. \u00a0\u202f]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)([eE][+−-]?\d+)?(\s*%)?")
UNIT = re.compile(r"\s*(RON/MWh|RON/kWh|RON|kWh|kW|V|%|mm²|mm2|m)(?![\w])", re.I)


def number_tokens(text):
    for match in NUMBER.finditer(text):
        before = text[:match.start()]
        # Embedded equipment/POD identifiers are not measurements; currency may precede its amount.
        if before and before[-1].isalnum() and not re.search(r"(?:RON|kWh|kW|V)$", before):
            continue
        body = match[2].replace("\u00a0", " ").replace("\u202f", " ").replace(" ", "")
        if re.fullmatch(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?", body):
            body = body.replace(".", "")
        value = float(body.replace(",", "."))
        if match[1]:
            value = -value
        if match[3]:
            exponent = int(match[3][1:].replace("−", "-"))
            try:
                value *= 10.0 ** exponent
            except OverflowError:
                value = math.copysign(math.inf, value)
        unit_match = UNIT.match(text[match.end():])
        unit = "%" if match[4] else (unit_match[1].lower() if unit_match else None)
        if unit is None:
            prefix = re.search(r"(RON/MWh|RON/kWh|RON|kWh|kW|V)\s*$", before, re.I)
            unit = prefix[1].lower() if prefix else None
        yield value, unit


def field_unit(key):
    for suffix, unit in (("_ron_mwh", "ron/mwh"), ("_ron_kwh", "ron/kwh"),
                         ("_kwh", "kwh"), ("_kw", "kw"), ("_ron", "ron"),
                         ("_v", "v"), ("_pct", "%"), ("_mm2", "mm2"), ("_m", "m")):
        if key.endswith(suffix):
            return unit
    return None


def match_number(value, unit, facts):
    for key, fact in facts.items():
        if isinstance(fact, (float, int)) and not isinstance(fact, bool):
            expected_unit = field_unit(key)
            if unit and expected_unit and unit != expected_unit:
                continue
            candidates = [float(fact)]
            if unit == "%" and key.endswith("ratio"):
                candidates = [float(fact) * 100]
            if math.isfinite(value) and any(abs(value - f) <= 0.005000001 for f in candidates):
                return key
    return None
