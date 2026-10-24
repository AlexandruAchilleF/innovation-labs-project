import { describe, expect, it } from "vitest";
import { resolveMapGeometry } from "@/lib/map-geography";
import { neighborhoods } from "@/lib/mock/neighborhoods";
import { feederFeatures, heatFeatures } from "@/lib/geo-features";
import { feederRuns, housePlanXY, toLngLat, transformerDay } from "@/lib/geo";

const nb = neighborhoods[0]!;

describe("public demo map geometry", () => {
  it("places offline houses on distinct mapped buildings without changing simulation inputs", () => {
    for (const n of neighborhoods) {
      const original = structuredClone(n.houses);
      const resolved = resolveMapGeometry(n, n.houses);
      expect(resolved.missing).toEqual([]);
      expect(resolved.houses).toHaveLength(n.houses.length);
      expect(new Set(Object.values(resolved.placements).map((p) => p.buildingId)).size).toBe(
        n.houses.length,
      );
      for (const house of resolved.houses) {
        const at = resolved.placements[house.house_id]!.at;
        const p = housePlanXY(house);
        const ll = toLngLat(resolved.center!, p.x, p.y);
        expect(ll[0]).toBeCloseTo(at[0], 9);
        expect(ll[1]).toBeCloseTo(at[1], 9);
        const input = original.find((h) => h.house_id === house.house_id)!;
        expect(house.distance_m).toBe(input.distance_m);
        expect(house.voltage_v).toBe(input.voltage_v);
        expect(house.feeder).toBe(input.feeder);
      }
      expect(n.houses).toEqual(original);
    }
  });

  it("keeps placement stable across reordered, filtered and simulated results", () => {
    const initial = resolveMapGeometry(nb, nb.houses);
    const changed = resolveMapGeometry(
      nb,
      [...nb.houses]
        .reverse()
        .slice(0, 3)
        .map((h) => ({ ...h, voltage_v: 240 })),
    );
    for (const h of changed.houses) {
      expect(housePlanXY(h)).toEqual(
        housePlanXY(initial.houses.find((x) => x.house_id === h.house_id)!),
      );
      expect(changed.placements[h.house_id]).toEqual(initial.placements[h.house_id]);
    }
  });

  it("retains street bends and reverses entire polylines with power flow", () => {
    const resolved = resolveMapGeometry(nb, nb.houses);
    const runs = feederRuns(nb, resolved.houses);
    const day = transformerDay(nb, nb.transformer_kva);
    const forward = feederFeatures(resolved.center!, runs, day, 0, resolved.placements);
    const backward = feederFeatures(
      resolved.center!,
      runs,
      [{ ...day[0]!, active_power_kw: -10 }],
      0,
      resolved.placements,
    );
    const trunks = forward.features.filter((f) => f.properties["kind"] === "trunk");
    expect(trunks.some((f) => f.geometry.coordinates.length > 2)).toBe(true);
    for (let i = 0; i < forward.features.length; i += 2) {
      expect(backward.features[i]!.geometry.coordinates).toEqual(
        [...forward.features[i]!.geometry.coordinates].reverse(),
      );
      const drop = forward.features[i + 1]!.geometry.coordinates as [number, number][];
      const trunk = forward.features[i]!.geometry.coordinates as [number, number][];
      expect(drop[0]).toEqual(trunk.at(-1));
    }
    const heat = heatFeatures(resolved.center!, resolved.houses, 0);
    for (let i = 0; i < resolved.houses.length; i++) {
      const at = resolved.placements[resolved.houses[i]!.house_id]!.at;
      const point = heat.features[i]!.geometry.coordinates as [number, number];
      expect(point[0]).toBeCloseTo(at[0], 9);
      expect(point[1]).toBeCloseTo(at[1], 9);
    }
  });

  it("never displays generated coordinates when geographic coverage is missing", () => {
    expect(resolveMapGeometry({ ...nb, neighborhood_id: "UNKNOWN" }, nb.houses).houses).toEqual([]);
    const missing = {
      ...nb.houses[0]!,
      house_id: "new-unmapped-house",
      household_id: "new-unmapped-house",
    };
    const resolved = resolveMapGeometry(nb, [missing]);
    expect(resolved.houses).toEqual([]);
    expect(resolved.missing).toEqual(["new-unmapped-house"]);
  });
});
