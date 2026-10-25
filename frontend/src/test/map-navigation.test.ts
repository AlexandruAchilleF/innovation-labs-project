import { afterEach, expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";
import { createMapNavigation } from "@/lib/map-navigation";

afterEach(() => document.body.replaceChildren());

function fixture() {
  const container = document.createElement("div");
  const canvas = document.createElement("canvas");
  container.append(canvas);
  document.body.append(container);
  const listeners = new globalThis.Map<string, () => void>();
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  const map = {
    getContainer: () => container,
    getCanvas: () => canvas,
    redraw: vi.fn(),
    stop: vi.fn(),
    fitBounds: vi.fn(() => {
      // The last loaded view must cover the map before its camera changes.
      expect(container.parentElement!.querySelector("canvas[data-map-transition]")).not.toBeNull();
    }),
    on: vi.fn((event: string, cb: () => void) => listeners.set(event, cb)),
    off: vi.fn((event: string) => listeners.delete(event)),
  };
  return {
    map,
    container,
    canvas,
    drawImage,
    listeners,
    navigation: createMapNavigation(map as unknown as Map),
  };
}

it("keeps the loaded view visible until destination tiles finish, including rapid selections", () => {
  const { navigation, map, drawImage, listeners } = fixture();
  navigation.fitBounds(
    [
      [21, 45],
      [22, 46],
    ],
    { maxZoom: 18 },
  );
  const cover = document.querySelector("canvas[data-map-transition]");
  expect(cover).not.toBeNull();
  expect(map.fitBounds).toHaveBeenLastCalledWith(
    [
      [21, 45],
      [22, 46],
    ],
    { maxZoom: 18, duration: 0 },
  );
  navigation.fitBounds(
    [
      [23, 46],
      [24, 47],
    ],
    { maxZoom: 18 },
  );
  expect(document.querySelector("canvas[data-map-transition]")).toBe(cover);
  expect(drawImage).toHaveBeenCalledTimes(1);
  listeners.get("idle")!();
  expect(document.querySelector("canvas[data-map-transition]")).toBeNull();
  navigation.dispose();
});

it("clears the retained view on manual interaction and on unmount", () => {
  const { navigation, listeners } = fixture();
  navigation.fitBounds(
    [
      [21, 45],
      [22, 46],
    ],
    {},
  );
  listeners.get("dragstart")!();
  expect(document.querySelector("canvas[data-map-transition]")).toBeNull();
  navigation.fitBounds(
    [
      [23, 46],
      [24, 47],
    ],
    {},
  );
  navigation.dispose();
  expect(document.querySelector("canvas[data-map-transition]")).toBeNull();
  expect(listeners.size).toBe(0);
});
