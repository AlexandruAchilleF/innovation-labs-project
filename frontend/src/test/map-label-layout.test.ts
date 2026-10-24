import { describe, expect, it } from "vitest";
import { layoutMapLabels, MAP_LABEL_WIDTH, MAP_LABEL_HEIGHT } from "@/lib/map-label-layout";

const closeCities = Array.from({ length: 8 }, (_, i) => ({
  id: `city-${i}`,
  x: 240 + i,
  y: 260 + i,
}));

describe("country map labels", () => {
  it.each([
    { width: 640, height: 720 },
    { width: 304, height: 720 },
  ])("separates nearby labels within a $width px map", ({ width, height }) => {
    const result = layoutMapLabels(closeCities, width, height);
    expect(result).toHaveLength(closeCities.length);
    for (const [i, a] of result.entries()) {
      if (a.compact) {
        expect(a.x + 6).toBe(closeCities[i]!.x);
        expect(a.y + 6).toBe(closeCities[i]!.y);
        continue;
      }
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.x + MAP_LABEL_WIDTH).toBeLessThanOrEqual(width);
      expect(a.y + MAP_LABEL_HEIGHT).toBeLessThanOrEqual(height);
      for (const b of result.slice(i + 1)) {
        if (b.compact) continue;
        const intersects =
          a.x < b.x + MAP_LABEL_WIDTH &&
          a.x + MAP_LABEL_WIDTH > b.x &&
          a.y < b.y + MAP_LABEL_HEIGHT &&
          a.y + MAP_LABEL_HEIGHT > b.y;
        expect(intersects).toBe(false);
      }
    }
  });

  it("keeps labels near their cities instead of scattering dense clusters", () => {
    const result = layoutMapLabels(closeCities, 640, 720);
    for (const label of result.filter((p) => !p.compact)) {
      const anchor = closeCities.find((a) => a.id === label.id)!;
      expect(
        Math.hypot(
          label.x + MAP_LABEL_WIDTH / 2 - anchor.x,
          label.y + MAP_LABEL_HEIGHT / 2 - anchor.y,
        ),
      ).toBeLessThanOrEqual(64);
    }
    expect(result.some((p) => p.compact)).toBe(true);
  });

  it("moves a nearby label only as far as needed to clear its neighbor", () => {
    const result = layoutMapLabels(
      [
        { id: "one", x: 250, y: 300 },
        { id: "two", x: 250, y: 340 },
      ],
      640,
      720,
    );
    const second = result.find((p) => p.id === "two")!;
    expect(second.compact).toBe(false);
    expect(Math.abs(second.y + MAP_LABEL_HEIGHT / 2 - 340)).toBeLessThanOrEqual(16);
  });

  it("preserves geographic anchors and keeps the active label nearest its location", () => {
    const input = closeCities.map((c) => ({ ...c }));
    const result = layoutMapLabels(input, 640, 720, "city-7");
    expect(input).toEqual(closeCities);
    const active = result.find((p) => p.id === "city-7")!;
    expect(active.x + MAP_LABEL_WIDTH / 2).toBe(closeCities[7]!.x);
    expect(active.y + MAP_LABEL_HEIGHT / 2).toBe(closeCities[7]!.y);
  });
});
