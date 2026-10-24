import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Camera } from "@/components/sunproof/workspace/MapStage";
import { neighborhoods } from "@/lib/mock/neighborhoods";
import { resolveMapGeometry } from "@/lib/map-geography";

const api = vi.hoisted(() => ({
  map: { fitBounds: vi.fn(), getContainer: () => ({ clientWidth: 1200 }) },
}));
vi.mock("@/components/sunproof/map/MapCanvas", () => ({ useMapApi: () => api }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("frames the new neighborhood when geometry recovers after stale simulation data", () => {
  const first = neighborhoods[0]!;
  const next = neighborhoods[1]!;
  const initial = resolveMapGeometry(first, first.houses);
  const ready = resolveMapGeometry(next, next.houses);
  const { rerender } = render(
    <Camera nb={{ ...first, houses: initial.houses }} center={initial.center} selectedId="" />,
  );
  expect(api.map.fitBounds).toHaveBeenCalledTimes(1);
  rerender(<Camera nb={{ ...next, houses: [] }} center={ready.center} selectedId="" />);
  expect(api.map.fitBounds).toHaveBeenCalledTimes(1);
  rerender(<Camera nb={{ ...next, houses: ready.houses }} center={ready.center} selectedId="" />);
  expect(api.map.fitBounds).toHaveBeenCalledTimes(2);
  expect(api.map.fitBounds.mock.calls[1]?.[0]).not.toEqual(api.map.fitBounds.mock.calls[0]?.[0]);
});
