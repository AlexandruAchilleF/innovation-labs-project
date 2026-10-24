import { describe, expect, it } from "vitest";
import { OUTSIDE_ROMANIA } from "@/lib/romania-map";
import geography from "@/lib/map-geometry.json";

const insideRing = ([x, y]: number[], ring: number[][]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (
      a[1]! > y! !== b[1]! > y! &&
      x! < ((b[0]! - a[0]!) * (y! - a[1]!)) / (b[1]! - a[1]!) + a[0]!
    )
      inside = !inside;
  }
  return inside;
};
const masked = (point: number[]) =>
  insideRing(point, OUTSIDE_ROMANIA.geometry.coordinates[0]!) &&
  !OUTSIDE_ROMANIA.geometry.coordinates.slice(1).some((ring) => insideRing(point, ring));

describe("Romania-only map", () => {
  it("keeps every mapped demo house visible", () => {
    for (const nb of Object.values(geography.neighborhoods)) {
      for (const house of Object.values(nb.houses)) expect(masked(house.at)).toBe(false);
    }
  });
  it.each([
    [26.1025, 44.4268],
    [21.229, 45.7489],
    [23.6236, 46.7712],
    [28.64, 44.18],
  ])("keeps Romanian locations visible at %s, %s", (lon, lat) => {
    expect(masked([lon, lat])).toBe(false);
  });
  it.each([
    [20.46, 44.82],
    [28.84, 47.01],
    [23.32, 42.7],
    [19.04, 47.5],
    [30.52, 50.45],
  ])("hides neighboring countries at %s, %s", (lon, lat) => {
    expect(masked([lon, lat])).toBe(true);
  });
});
