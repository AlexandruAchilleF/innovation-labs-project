// GeoJSON builders for the congestion map layers (pure; consumed by components/sunproof/map/GridLayers).
import {
  feederLoadingAt,
  housePlanXY,
  houseVoltageAt,
  toLngLat,
  type FeederRun,
  type LngLat,
} from "./geo";
import type { FeederHouse, TransformerPoint } from "./types";

type Props = Record<string, string | number | boolean>;
export interface Feature {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: LngLat[] } | { type: "Point"; coordinates: LngLat };
  properties: Props;
}
export interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
}

const fc = (features: Feature[]): FeatureCollection => ({ type: "FeatureCollection", features });

/**
 * Feeder trunk segments + service drops for one slot.
 * Segment voltage = the downstream house (voltage rises away from the PT under reverse flow);
 * coordinates run in the direction power flows so the animated dash shows reverse flow toward the PT.
 */
export function feederFeatures(
  center: LngLat,
  runs: FeederRun[],
  day: TransformerPoint[],
  slot: number,
): FeatureCollection {
  const reverse = (day[slot]?.active_power_kw ?? 0) < 0;
  const features: Feature[] = [];
  for (const run of runs) {
    const load = feederLoadingAt(run, day, slot);
    const pts = run.trunk.map((p) => toLngLat(center, p.x, p.y));
    run.houses.forEach((h, i) => {
      const v = houseVoltageAt(h, slot);
      const [a, b] = [pts[i]!, pts[i + 1]!];
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: reverse ? [b, a] : [a, b] },
        properties: { kind: "trunk", feeder: run.key, v, load },
      });
      const hp = housePlanXY(h);
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [pts[i + 1]!, toLngLat(center, hp.x, hp.y)] },
        properties: { kind: "drop", feeder: run.key, v, load: 0 },
      });
    });
  }
  return fc(features);
}

/** Heat points weighted by how much of the 230 -> 253 V headroom each connection point uses. */
export function heatFeatures(
  center: LngLat,
  houses: FeederHouse[],
  slot: number,
): FeatureCollection {
  return fc(
    houses.map((h) => {
      const v = houseVoltageAt(h, slot);
      const p = housePlanXY(h);
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: toLngLat(center, p.x, p.y) },
        properties: { w: Math.max(0, Math.min(1, (v - 236) / 17)), v },
      };
    }),
  );
}

/** Street bearing (degrees, screen-clockwise) of each house's trunk segment, used to rotate roof glyphs. */
export function houseBearings(runs: FeederRun[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const run of runs) {
    run.houses.forEach((h, i) => {
      const a = run.trunk[i]!;
      const b = run.trunk[i + 1]!;
      const deg = (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
      out.set(h.house_id, Math.round(((deg % 180) + 180) % 180));
    });
  }
  return out;
}
