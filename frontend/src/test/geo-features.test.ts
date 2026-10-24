import { describe, expect, it } from "vitest";
import { feederRuns, transformerDay } from "@/lib/geo";
import { feederFeatures, heatFeatures, houseBearings } from "@/lib/geo-features";
import { neighborhoods } from "@/lib/mock/neighborhoods";

const nb = neighborhoods[0]!;
const runs = feederRuns(nb, nb.houses);
const day = transformerDay(nb, nb.transformer_kva);
const center: [number, number] = [21.243, 45.7975];

describe("congestion map features", () => {
  it("emits one trunk segment and one service drop per house", () => {
    const fc = feederFeatures(center, runs, day, 54);
    const kinds = fc.features.map((f) => f.properties["kind"]);
    expect(kinds.filter((k) => k === "trunk")).toHaveLength(nb.houses.length);
    expect(kinds.filter((k) => k === "drop")).toHaveLength(nb.houses.length);
  });

  it("orients trunk segments with the power flow (toward the PT under reverse flow)", () => {
    const midday = day.findIndex((p) => p.active_power_kw < 0);
    const night = day.findIndex((p) => p.active_power_kw > 0);
    const first = (slot: number) =>
      feederFeatures(center, runs, day, slot).features[0]!.geometry.coordinates as [
        number,
        number,
      ][];
    expect(first(midday)[1]).toEqual(center); // ends at the transformer
    expect(first(night)[0]).toEqual(center); // starts at the transformer
  });

  it("weights heat points by voltage headroom used and gives every house a bearing", () => {
    const heat = heatFeatures(center, nb.houses, 54);
    for (const f of heat.features) {
      expect(f.properties["w"]).toBeGreaterThanOrEqual(0);
      expect(f.properties["w"]).toBeLessThanOrEqual(1);
    }
    expect(houseBearings(runs).size).toBe(nb.houses.length);
  });
});
