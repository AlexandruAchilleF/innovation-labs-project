import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapOverlay } from "@/components/sunproof/map/MapOverlay";
import { neighborhoods } from "@/lib/mock/neighborhoods";

const camera = vi.hoisted(() => {
  const listeners = new Map<string, Set<() => void>>();
  const state = { x: 100, y: 200, zoom: 18 };
  return {
    state,
    listeners,
    api: {
      map: {
        getZoom: () => state.zoom,
        project: () => ({ x: state.x, y: state.y }),
        on: (event: string, fn: () => void) => {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)!.add(fn);
        },
        off: (event: string, fn: () => void) => listeners.get(event)?.delete(fn),
      },
    },
  };
});

// WebGL is unavailable in jsdom; keep the real overlay and equipment components.
vi.mock("@/components/sunproof/map/MapCanvas", () => ({ useMapApi: () => camera.api }));

afterEach(() => {
  cleanup();
  camera.state.zoom = 18;
  vi.unstubAllGlobals();
});

describe("map overlay camera synchronization", () => {
  it("replaces the pin with a larger detailed house and grows it as zoom increases", () => {
    camera.state.zoom = 16.49;
    const nb = neighborhoods[0]!;
    const house = nb.houses[0]!;
    render(
      <MapOverlay
        pins={[]}
        active={{
          nb,
          center: [21, 45],
          houses: [house],
          roofSizes: new Map([[house.house_id, 8]]),
          bearings: new Map(),
          kva: 250,
          loadingPct: 50,
          reverse: false,
        }}
        slot={48}
        selectedId={null}
        onPin={() => {}}
        onHouse={() => {}}
      />,
    );
    const dimensions = () => {
      const svg = screen.getByRole("button").querySelector("svg")!;
      return [Number(svg.getAttribute("width")), Number(svg.getAttribute("height"))];
    };
    let previous = dimensions();
    for (const zoom of [16.5, 17.5, 18.5]) {
      act(() => {
        camera.state.zoom = zoom;
        camera.listeners.get("move")!.forEach((fn) => fn());
      });
      const current = dimensions();
      expect(current[0]).toBeGreaterThan(previous[0]!);
      expect(current[1]).toBeGreaterThan(previous[1]!);
      previous = current;
    }
  });

  it.each(["move", "resize"])(
    "anchors roofs and transformer during %s, before the next browser frame",
    (event) => {
      camera.state.x = 100;
      camera.state.y = 200;
      // Model a busy animation: callbacks queued for the next frame cannot update this frame.
      vi.stubGlobal(
        "requestAnimationFrame",
        vi.fn(() => 1),
      );
      vi.stubGlobal("cancelAnimationFrame", vi.fn());
      const nb = neighborhoods[0]!;
      const house = nb.houses[0]!;
      const { container, unmount } = render(
        <MapOverlay
          pins={[]}
          active={{
            nb,
            center: [21, 45],
            houses: [house],
            bearings: new Map(),
            kva: 250,
            loadingPct: 50,
            reverse: false,
          }}
          slot={48}
          selectedId={null}
          onPin={() => {}}
          onHouse={() => {}}
        />,
      );
      const roof = screen.getByRole("button").parentElement!;
      const transformer = container.querySelector(".z-\\[4\\]") as HTMLElement;
      expect(roof.style.transform).toBe("translate(100px, 200px)");
      for (const [x, y] of [
        [120, 220],
        [150, 260],
        [190, 300],
      ]) {
        act(() => {
          Object.assign(camera.state, { x, y });
          camera.listeners.get(event)!.forEach((fn) => fn());
          // Must already be committed inside the map event, not after React yields.
          expect(roof.style.transform).toBe(`translate(${x}px, ${y}px)`);
          expect(transformer.style.transform).toBe(`translate(${x}px, ${y}px)`);
        });
      }
      unmount();
      expect(camera.listeners.get(event)?.size).toBe(0);
    },
  );
});
