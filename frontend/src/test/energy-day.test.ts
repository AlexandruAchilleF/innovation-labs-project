import { describe, expect, it } from "vitest";
import {
  dayTotals,
  equipmentFor,
  flowsAt,
  keyMinute,
  pointAt,
  pulseSeconds,
} from "@/lib/energy-day";
import type { MinutePoint } from "@/lib/types";

const pt = (minute: number, o: Partial<MinutePoint> = {}): MinutePoint => ({
  minute_of_day: minute,
  time: "",
  ac_voltage_v: 230,
  pv_power_kw: 0,
  pvgis_expected_kw: 0,
  house_load_kw: 0,
  battery_power_kw: 0,
  battery_soc_pct: 50,
  grid_import_kw: 0,
  grid_export_kw: 0,
  status: "OK",
  ...o,
});

describe("energy-day", () => {
  it("opens the day on the first trip, then the locked evening, then the solar peak", () => {
    const sunny = [
      pt(600, { pv_power_kw: 2 }),
      pt(780, { pv_power_kw: 5 }),
      pt(1150, { grid_import_kw: 1 }),
    ];
    expect(keyMinute(sunny, false)).toBe(780);
    expect(keyMinute(sunny, true)).toBe(1150);
    expect(keyMinute([pt(780, { pv_power_kw: 5 })], true)).toBe(1200);
    expect(
      keyMinute([...sunny, pt(725, { status: "TRIP" }), pt(730, { status: "TRIP" })], true),
    ).toBe(725);
    expect(keyMinute([pt(0), pt(5)], false)).toBe(780);
  });

  it("finds the nearest sample in a downsampled series", () => {
    const s = [pt(0), pt(5), pt(10)];
    expect(pointAt(s, 7)?.minute_of_day).toBe(5);
    expect(pointAt(s, 9)?.minute_of_day).toBe(10);
    expect(pointAt([], 9)).toBeUndefined();
  });

  it("integrates kW samples into kWh using the sampling step", () => {
    const s = [0, 60, 120].map((m) => pt(m, { pv_power_kw: 3, grid_export_kw: 1 }));
    const t = dayTotals(s);
    expect(t.produced).toBeCloseTo(9);
    expect(t.exported).toBeCloseTo(3);
  });

  it("counts PV lost while tripped", () => {
    const s = [
      pt(0, { status: "TRIP", pvgis_expected_kw: 4 }),
      pt(5, { pv_power_kw: 4, pvgis_expected_kw: 4 }),
    ];
    const t = dayTotals(s);
    expect(t.tripMinutes).toBe(5);
    expect(t.lostToTrips).toBeCloseTo(4 / 12);
  });

  it("orients battery and grid flows by sign", () => {
    const f = flowsAt(pt(0, { battery_power_kw: -2, grid_import_kw: 1.5 }));
    expect(f.find((x) => x.key === "battery")).toMatchObject({ kw: 2, outward: false });
    expect(f.find((x) => x.key === "grid")).toMatchObject({ kw: 1.5, outward: false });
    const g = flowsAt(pt(0, { battery_power_kw: 1, grid_export_kw: 3 }));
    expect(g.find((x) => x.key === "battery")?.outward).toBe(true);
    expect(g.find((x) => x.key === "grid")).toMatchObject({ kw: 3, outward: true });
  });

  it("speeds pulses up with power and sizes equipment from the installation", () => {
    expect(pulseSeconds(5, 5)).toBeLessThan(pulseSeconds(1, 5));
    expect(equipmentFor(6, 0)).toEqual({ panels: 7, batteryModules: 0 });
    expect(equipmentFor(10, 10).batteryModules).toBe(2);
  });
});
