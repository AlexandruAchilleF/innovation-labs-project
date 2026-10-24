"""Fleet assembly: ordered HouseholdScenario registry and per-household simulation ground truth."""

from __future__ import annotations

from typing import Dict

from sunproof.data.archetypes import STORY_HOUSEHOLD_IDS
from sunproof.data.scenario_builders import _scenarios_for_neighborhood, _truth_battery_status
from sunproof.grid import NeighborhoodSimulation, truth_grid_cause
from sunproof.models import HouseholdGroundTruth, HouseholdScenario, Neighborhood


def build_scenarios_dict(specs: Dict[str, Neighborhood], sims: Dict[str, NeighborhoodSimulation]) -> Dict[str, HouseholdScenario]:
    """All monitored households: the 5 curated stories first, then the rest of the fleet by neighborhood."""
    all_scenarios: Dict[str, HouseholdScenario] = {}
    for nb_id, sim in sims.items():
        for s in _scenarios_for_neighborhood(specs[nb_id], sim):
            all_scenarios[s.household_id] = s
    ordered = {hid: all_scenarios[hid] for hid in STORY_HOUSEHOLD_IDS}
    ordered.update({hid: s for hid, s in all_scenarios.items() if hid not in ordered})
    return ordered


def build_ground_truth(household_id: str, neighborhood_id: str, sim: NeighborhoodSimulation) -> HouseholdGroundTruth:
    trace = next(t for t in sim.traces.values() if t.house.client and t.house.client.household_id == household_id)
    house = trace.house
    return HouseholdGroundTruth(
        household_id=household_id,
        neighborhood_id=neighborhood_id,
        installation_fault=house.fault,
        grid_cause=truth_grid_cause(trace),
        battery_status=_truth_battery_status(house),
        billing_status=house.client.billing_anomaly,
    )
