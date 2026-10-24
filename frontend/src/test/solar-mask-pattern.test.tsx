import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SolarMaskPattern } from "@/components/sunproof/map/SolarMaskPattern";

const camera = vi.hoisted(() => {
  const listeners = new Map<string, Set<() => void>>();
  const state = { scale: 50, lon: 25, lat: 46 };
  return {
    state,
    listeners,
    api: {
      map: {
        getContainer: () => ({ clientWidth: 1000, clientHeight: 600 }),
        project: ([lon, lat]: number[]) => ({
          x: 500 + (lon! - state.lon) * state.scale,
          y: 300 - (lat! - state.lat) * state.scale,
        }),
        on: (event: string, fn: () => void) => {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)!.add(fn);
        },
        off: (event: string, fn: () => void) => listeners.get(event)?.delete(fn),
      },
    },
  };
});
vi.mock("@/components/sunproof/map/MapCanvas", () => ({ useMapApi: () => camera.api }));
afterEach(() => {
  cleanup();
  Object.assign(camera.state, { scale: 50, lon: 25, lat: 46 });
});

it("keeps the decorative cutout aligned during map movement without waiting for another frame", () => {
  const { container, unmount } = render(<SolarMaskPattern />);
  const path = container.querySelector("path")!;
  const initial = path.getAttribute("d");
  expect(path.getAttribute("fill-rule")).toBe("evenodd");
  expect(initial).toContain("M0 0H1000V600H0Z");
  act(() => {
    camera.state.lon = 26;
    camera.listeners.get("move")!.forEach((fn) => fn());
  });
  expect(path.getAttribute("d")).not.toBe(initial);
  unmount();
  expect(camera.listeners.get("move")!.size).toBe(0);
  expect(camera.listeners.get("resize")!.size).toBe(0);
});

it("pauses and hides the pattern when zoomed into the Romanian interior", () => {
  const { container } = render(<SolarMaskPattern />);
  const svg = container.querySelector("svg")!;
  expect(svg.style.display).toBe("block");
  act(() => {
    Object.assign(camera.state, { scale: 10000, lon: 25, lat: 46 });
    camera.listeners.get("move")!.forEach((fn) => fn());
  });
  expect(svg.style.display).toBe("none");
  expect(svg.style.animationPlayState).toBe("paused");
});
