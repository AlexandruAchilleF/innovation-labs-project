"""Neighborhood analysis (distributor-facing diagnosis) and what-if labelling/override helpers."""

from __future__ import annotations

from typing import Dict, Optional

from sunproof.data.opcom_and_physics import DATE_ANALYZED
from sunproof.grid import NeighborhoodSimulation, simulate_neighborhood, summarize_neighborhood
from sunproof.models import BatteryMode, Neighborhood, NeighborhoodGridAnalysis
from sunproof.neighborhoods import (
    WHAT_IF_LABELS_RO,
    build_what_if_neighborhood,
    describe_neighborhood,
    recommended_what_ifs,
)


def analyze_neighborhood(nb: Neighborhood, sim: NeighborhoodSimulation, what_if_label: Optional[str] = None,
                         with_recommendations: bool = True) -> NeighborhoodGridAnalysis:
    analysis = summarize_neighborhood(sim, DATE_ANALYZED, "", "", "", what_if_label_ro=what_if_label)
    what_ifs: Dict[str, NeighborhoodGridAnalysis] = {}
    if with_recommendations:
        for key, kwargs in recommended_what_ifs(nb).items():
            alt = build_what_if_neighborhood(nb, **kwargs)
            what_ifs[key] = summarize_neighborhood(simulate_neighborhood(alt), DATE_ANALYZED, "", "", "")
    headline, explanation, action = describe_neighborhood(nb, analysis, what_ifs)
    return analysis.model_copy(update={
        "headline_ro": headline,
        "explanation_ro": explanation,
        "recommended_distributor_action_ro": action,
    })


def fix_all_batteries_overrides(nb: Neighborhood) -> Dict[str, tuple]:
    """Every monitored battery set to the customer's declared intent."""
    return {
        h.client.household_id: (h.client.battery_intent.desired_min_soc_pct, BatteryMode.MAX_SELF_CONSUMPTION)
        for h in nb.houses if h.client is not None and h.battery_config.has_battery
    }


def what_if_label(tap_setting_pct, transformer_kva, feeder_cable_upgrades, rebalance_phases,
                  enable_volt_watt_all, fix_all_batteries) -> str:
    labels = []
    if tap_setting_pct is not None:
        labels.append(f"Plot transformator {tap_setting_pct:+.1f}%")
    if transformer_kva is not None:
        labels.append(f"Transformator {transformer_kva:.0f} kVA")
    if feeder_cable_upgrades:
        labels.append("Conductor întărit pe " + ", ".join(sorted(feeder_cable_upgrades)))
    if rebalance_phases:
        labels.append(WHAT_IF_LABELS_RO["rebalance"])
    if enable_volt_watt_all:
        labels.append("Volt-Watt P(U) activat la toate invertoarele")
    if fix_all_batteries:
        labels.append("Bateriile clienților setate conform intenției declarate")
    return " + ".join(labels) or "Fără modificări"


def run_what_if(nb: Neighborhood, tap_setting_pct=None, transformer_kva=None, feeder_cable_upgrades=None,
                rebalance_phases=False, enable_volt_watt_all=False, fix_all_batteries=False) -> NeighborhoodGridAnalysis:
    alt = build_what_if_neighborhood(
        nb,
        tap_setting_pct=tap_setting_pct,
        transformer_kva=transformer_kva,
        feeder_cable_upgrades=feeder_cable_upgrades,
        rebalance_phases=rebalance_phases,
        enable_volt_watt_all=enable_volt_watt_all,
        battery_overrides=fix_all_batteries_overrides(nb) if fix_all_batteries else None,
    )
    label = what_if_label(tap_setting_pct, transformer_kva, feeder_cable_upgrades, rebalance_phases,
                          enable_volt_watt_all, fix_all_batteries)
    return analyze_neighborhood(alt, simulate_neighborhood(alt), what_if_label=label, with_recommendations=False)
