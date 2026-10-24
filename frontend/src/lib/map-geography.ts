// Display-only OSM geography. Electrical simulation distances and topology stay untouched.
import snapshot from "./map-geometry.json";
import { nbCenter, type LngLat } from "./geo";
import type { FeederHouse, Neighborhood } from "./types";

export interface MapPlacement {
  buildingId: number;
  at: LngLat;
  footprint: LngLat[];
  sizeM: number;
  street: string;
  roadId: number;
  path: LngLat[];
  feeder: string;
}
interface GeographicSnapshot {
  neighborhoods: Record<
    string,
    {
      center: LngLat;
      sourceCenter: LngLat;
      houses: Record<string, MapPlacement>;
    }
  >;
}
const geography = snapshot as unknown as GeographicSnapshot;

export function resolveMapGeometry(nb: Neighborhood, input: FeederHouse[]) {
  const saved = geography.neighborhoods[nb.neighborhood_id];
  const center = saved?.center ?? nbCenter(nb);
  const houses: FeederHouse[] = [];
  const placements: Record<string, MapPlacement> = {};
  const roofSizes = new Map<string, number>();
  const missing: string[] = [];
  const cos = Math.cos((center[1] * Math.PI) / 180);
  for (const h of input) {
    const p = saved?.houses[h.household_id ?? h.house_id];
    // Feeder reassignment needs a refreshed snapshot, never a misleading old route.
    if (!p || p.feeder !== (h.feeder_id ?? String(h.feeder))) {
      missing.push(h.household_id ?? h.house_id);
      continue;
    }
    houses.push({
      ...h,
      x_m: (p.at[0] - center[0]) * 111320 * cos,
      y_m: (p.at[1] - center[1]) * 110540,
    });
    placements[h.house_id] = p;
    roofSizes.set(h.house_id, p.sizeM);
  }
  return { center, houses, placements, roofSizes, missing, available: !!saved };
}
