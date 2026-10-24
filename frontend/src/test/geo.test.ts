import { describe, expect, it } from "vitest";
import {
  SLOTS,
  congestionAt,
  feederRuns,
  houseStatusAt,
  houseVoltageAt,
  housePlanXY,
  nbCenter,
  slotLabel,
  toLngLat,
  transformerAt,
  worstSlot,
} from "@/lib/geo";
import { neighborhoods } from "@/lib/mock/neighborhoods";
import type { FeederHouse, Neighborhood } from "@/lib/types";

const live: FeederHouse = {
  house_id: "RO-TM-001",
  label: "RO-TM-001",
  feeder: 1,
  feeder_id: "PT04-F1",
  distance_m: 524,
  phase: "3P",
  pv_kw: 8,
  voltage_v: 258,
  x_m: 509.8,
  y_m: 122.1,
  pcc_voltage_15m: Array.from({ length: SLOTS }, (_, i) => (i === 55 ? 258 : 235)),
  worst_status_15m: Array.from({ length: SLOTS }, (_, i) =>
    i === 55 ? "TRIPPED_OVERVOLTAGE" : i < 26 ? "STANDBY_NIGHT" : "NORMAL",
  ),
};

describe("geo helpers", () => {
  it("formats 15-minute slots", () => {
    expect(slotLabel(0)).toBe("00:00");
    expect(slotLabel(55)).toBe("13:45");
    expect(slotLabel(95)).toBe("23:45");
  });

  it("uses backend plan coordinates and converts metres to degrees", () => {
    expect(housePlanXY(live)).toEqual({ x: 509.8, y: 122.1 });
    const [lon, lat] = toLngLat([21.243, 45.7975], 1000, 1000);
    expect(lat - 45.7975).toBeCloseTo(1000 / 110540, 6);
    expect(lon - 21.243).toBeGreaterThan(1000 / 111320); // degrees of longitude shrink with latitude
  });

  it("falls back to deterministic positions and neighborhood metadata for mocks", () => {
    const nb = neighborhoods[0]!;
    const h = nb.houses[3]!;
    expect(housePlanXY(h)).toEqual(housePlanXY(h));
    expect(Math.hypot(housePlanXY(h).x, housePlanXY(h).y)).toBeGreaterThan(h.distance_m - 1);
    expect(nbCenter(nb)[1]).toBeCloseTo(45.796, 2);
  });

  it("reads per-slot voltage and inverter status from the backend series", () => {
    expect(houseVoltageAt(live, 55)).toBe(258);
    expect(houseStatusAt(live, 55)).toBe("trip");
    expect(houseStatusAt(live, 10)).toBe("night");
    expect(houseStatusAt(live, 40)).toBe("normal");
  });

  it("builds feeder trunks that start at the transformer", () => {
    const runs = feederRuns(neighborhoods[0]!, neighborhoods[0]!.houses);
    expect(runs.length).toBeGreaterThan(1);
    for (const r of runs) {
      expect(r.trunk[0]).toEqual({ x: 0, y: 0 });
      expect(r.trunk).toHaveLength(r.houses.length + 1);
      expect(r.houses.map((h) => h.distance_m)).toEqual(
        [...r.houses.map((h) => h.distance_m)].sort((a, b) => a - b),
      );
    }
  });

  it("samples the 5-minute transformer series and scores congestion", () => {
    const nb: Neighborhood = {
      ...neighborhoods[0]!,
      transformer_kva: 160,
      transformer_timeseries: Array.from({ length: 288 }, (_, i) => ({
        minute_of_day: i * 5,
        timestamp: "",
        active_power_kw: i === 168 ? -170 : 10,
        loading_pct: i === 168 ? 106.5 : 6,
        max_house_voltage_v: 240,
        pv_production_kw: 0,
        houses_tripped: 0,
        houses_derating: 0,
      })),
    };
    expect(transformerAt(nb, 160, 56).loading_pct).toBe(106.5);
    const c = congestionAt(nb, nb.houses, 160, 56);
    expect(c.reverseFlow).toBe(true);
    expect(c.index).toBe(100);
    expect(congestionAt(nb, nb.houses, 160, 4).reverseFlow).toBe(false);
  });

  it("puts the default scrubber on the midday stress window", () => {
    const nb = neighborhoods[0]!;
    const s = worstSlot(nb, nb.houses, nb.transformer_kva);
    expect(s).toBeGreaterThan(40);
    expect(s).toBeLessThan(70);
    expect(worstSlot({ ...nb, peak_voltage_minute: 827 }, nb.houses, nb.transformer_kva)).toBe(55);
  });
});
