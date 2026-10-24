"""
SunProof scenario facade: the ONLY public entry point to the simulated prosumer fleet.

Heavy data/simulation code lives in sunproof/data/* (do not read it when implementing engines).
Fleet = 8 simulated LV neighborhoods (~220 houses); only supplier clients that gave consent are visible
as HouseholdScenario (5 curated stories first, then the generated fleet). Results are cached in-process.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from sunproof.data.archetypes import STORY_HOUSEHOLD_IDS
from sunproof.data.neighborhood_analysis import analyze_neighborhood, run_what_if
from sunproof.data.opcom_and_physics import build_opcom_pzu_august_curve
from sunproof.data.fleet import build_ground_truth, build_scenarios_dict
from sunproof.data.scenario_builders import _scenarios_for_neighborhood
from sunproof.grid import NeighborhoodSimulation, simulate_neighborhood
from sunproof.models import (
    BatteryMode,
    HouseholdGroundTruth,
    HouseholdScenario,
    Neighborhood,
    NeighborhoodGridAnalysis,
)
from sunproof.neighborhoods import build_what_if_neighborhood, get_neighborhood_specs

__all__ = [
    "STORY_HOUSEHOLD_IDS", "build_opcom_pzu_august_curve", "get_scenarios_dict", "get_all_scenarios",
    "get_scenario_by_id", "get_ground_truth", "get_neighborhoods", "get_neighborhood_analysis",
    "get_all_neighborhood_analyses", "simulate_neighborhood_what_if", "simulate_scenario_with_battery_override",
]

_SIMULATIONS: Optional[Dict[str, NeighborhoodSimulation]] = None
_SCENARIO_CACHE: Optional[Dict[str, HouseholdScenario]] = None
_ANALYSIS_CACHE: Dict[str, NeighborhoodGridAnalysis] = {}


def _simulations() -> Dict[str, NeighborhoodSimulation]:
    global _SIMULATIONS
    if _SIMULATIONS is None:
        _SIMULATIONS = {nb_id: simulate_neighborhood(nb) for nb_id, nb in get_neighborhood_specs().items()}
    return _SIMULATIONS


def get_scenarios_dict() -> Dict[str, HouseholdScenario]:
    """All monitored households, the 5 curated stories first, then the rest of the fleet by neighborhood."""
    global _SCENARIO_CACHE
    if _SCENARIO_CACHE is None:
        _SCENARIO_CACHE = build_scenarios_dict(get_neighborhood_specs(), _simulations())
    return _SCENARIO_CACHE


def get_all_scenarios() -> List[HouseholdScenario]:
    """All monitored prosumer households in presentation order (5 curated stories first)."""
    return list(get_scenarios_dict().values())


def get_scenario_by_id(household_id: str) -> HouseholdScenario:
    """Looks up a scenario by household_id (raises KeyError if not found)."""
    scenarios = get_scenarios_dict()
    if household_id not in scenarios:
        raise KeyError(f"Unknown household_id '{household_id}'. Available IDs: {list(scenarios.keys())}")
    return scenarios[household_id]


def get_ground_truth(household_id: str) -> HouseholdGroundTruth:
    """What was injected in the simulation for this household (for engine tests only)."""
    nb_id = get_scenario_by_id(household_id).neighborhood_id
    return build_ground_truth(household_id, nb_id, _simulations()[nb_id])


def get_neighborhoods() -> List[Neighborhood]:
    """Topology of every simulated LV network (transformer, feeders, houses)."""
    return list(get_neighborhood_specs().values())


def get_neighborhood_analysis(neighborhood_id: str) -> NeighborhoodGridAnalysis:
    """Day simulation of one LV network with the distributor-facing diagnosis (cached)."""
    specs = get_neighborhood_specs()
    if neighborhood_id not in specs:
        raise KeyError(f"Unknown neighborhood_id '{neighborhood_id}'. Available IDs: {list(specs.keys())}")
    if neighborhood_id not in _ANALYSIS_CACHE:
        _ANALYSIS_CACHE[neighborhood_id] = analyze_neighborhood(specs[neighborhood_id], _simulations()[neighborhood_id])
    return _ANALYSIS_CACHE[neighborhood_id]


def get_all_neighborhood_analyses() -> List[NeighborhoodGridAnalysis]:
    return [get_neighborhood_analysis(nb_id) for nb_id in get_neighborhood_specs()]


def simulate_neighborhood_what_if(
    neighborhood_id: str,
    tap_setting_pct: Optional[float] = None,
    transformer_kva: Optional[float] = None,
    feeder_cable_upgrades: Optional[Dict[str, str]] = None,
    rebalance_phases: bool = False,
    enable_volt_watt_all: bool = False,
    fix_all_batteries: bool = False,
) -> NeighborhoodGridAnalysis:
    """Re-simulates a street with a distributor fix (tap, transformer, conductor, phases) or corrected batteries."""
    return run_what_if(get_neighborhood_specs()[neighborhood_id], tap_setting_pct, transformer_kva,
                       feeder_cable_upgrades, rebalance_phases, enable_volt_watt_all, fix_all_batteries)


def simulate_scenario_with_battery_override(
    household_id: str,
    new_min_soc_pct: float,
    new_mode: Optional[BatteryMode] = None,
) -> HouseholdScenario:
    """Re-runs the household's whole neighborhood with a new battery SoC reserve / mode (street is coupled)."""
    base = get_scenario_by_id(household_id)
    if not base.battery_config.has_battery:
        return base.model_copy(deep=True)
    nb = get_neighborhood_specs()[base.neighborhood_id]
    alt = build_what_if_neighborhood(nb, battery_overrides={household_id: (new_min_soc_pct, new_mode)})
    for s in _scenarios_for_neighborhood(alt, simulate_neighborhood(alt)):
        if s.household_id == household_id:
            return s
    raise KeyError(household_id)
