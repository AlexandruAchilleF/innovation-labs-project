import { afterEach, expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";
import { createMapNavigation } from "@/lib/map-navigation";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const destination = [
  [21, 45],
  [22, 46],
] as [[number, number], [number, number]];
function fixture(reducedMotion = false) {
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: reducedMotion } as MediaQueryList);
  const wrapper = document.createElement("div");
  const container = document.createElement("div");
  const canvas = document.createElement("canvas");
  container.append(canvas);
  wrapper.append(container);
  document.body.append(wrapper);
  const listeners = new globalThis.Map<string, Set<() => void>>();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  const map = {
    getContainer: () => container,
    getCanvas: () => canvas,
    getCenter: () => ({ lng: 21.2, lat: 45.7 }),
    getZoom: () => 18,
    getBearing: () => 0,
    getPitch: () => 0,
    getPadding: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    cameraForBounds: () => ({ center: [21.5, 45.5], zoom: 18, bearing: 0 }),
    redraw: vi.fn(),
    stop: vi.fn(),
    jumpTo: vi.fn(),
    fitBounds: vi.fn(),
    on: (event: string, cb: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    },
    off: (event: string, cb: () => void) => {
      listeners.get(event)?.delete(cb);
    },
  };
  const emit = (event: string) => [...(listeners.get(event) ?? [])].forEach((cb) => cb());
  return { map, emit, listeners, navigation: createMapNavigation(map as unknown as Map) };
}

it("preloads behind the current view, then animates through the whole of Romania to the client", () => {
  const { map, emit, navigation } = fixture();
  navigation.fitBounds(destination, { maxZoom: 18 });
  expect(document.querySelector("[data-map-transition]")).not.toBeNull();
  // Country overview, a middle zoom for fallback imagery, then the destination.
  emit("idle");
  emit("idle");
  expect(document.querySelector("[data-map-transition]")).not.toBeNull();
  emit("idle");
  expect(document.querySelector("[data-map-transition]")).toBeNull();
  expect(map.jumpTo).toHaveBeenLastCalledWith(
    expect.objectContaining({ center: { lng: 21.2, lat: 45.7 }, zoom: 18 }),
  );
  expect(map.fitBounds).toHaveBeenLastCalledWith(
    [
      [20.2, 43.6],
      [29.8, 48.3],
    ],
    expect.objectContaining({ duration: 1400 }),
  );
  emit("moveend");
  expect(map.fitBounds).toHaveBeenLastCalledWith(
    destination,
    expect.objectContaining({ duration: 2000, maxZoom: 18 }),
  );
  navigation.dispose();
});

it("cancels a pending flight when the user drags or a newer client is selected", () => {
  const { map, emit, navigation } = fixture();
  navigation.fitBounds(destination, {});
  const next = [
    [24, 46],
    [25, 47],
  ] as typeof destination;
  navigation.fitBounds(next, {});
  emit("idle");
  emit("idle");
  emit("idle");
  emit("moveend");
  expect(map.fitBounds).toHaveBeenLastCalledWith(next, expect.objectContaining({ duration: 2000 }));
  navigation.fitBounds(destination, {});
  emit("dragstart");
  expect(document.querySelector("[data-map-transition]")).toBeNull();
  const calls = map.fitBounds.mock.calls.length;
  emit("idle");
  emit("moveend");
  expect(map.fitBounds).toHaveBeenCalledTimes(calls);
  navigation.dispose();
});

it("respects reduced motion and removes pending callbacks on disposal", () => {
  const { map, emit, listeners, navigation } = fixture(true);
  navigation.fitBounds(destination, {});
  expect(map.fitBounds).toHaveBeenLastCalledWith(
    destination,
    expect.objectContaining({ duration: 0 }),
  );
  emit("idle");
  expect(document.querySelector("[data-map-transition]")).toBeNull();
  navigation.dispose();
  expect([...listeners.values()].every((set) => set.size === 0)).toBe(true);
});
