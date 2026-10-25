import type { JumpToOptions, FitBoundsOptions, LngLatBoundsLike, Map } from "maplibre-gl";

// Includes the entire Romanian boundary, with room for map controls.
const ROMANIA_BOUNDS: LngLatBoundsLike = [
  [20.2, 43.6],
  [29.8, 48.3],
];
const overview: FitBoundsOptions = {
  padding: { top: 90, bottom: 180, left: 40, right: 40 },
  maxZoom: 6.5,
};

/** Warm the flight's key zoom levels before showing the zoom-out / zoom-in animation. */
export function createMapNavigation(map: Map) {
  let cover: HTMLCanvasElement | undefined;
  let origin: JumpToOptions | undefined;
  let idle: (() => void) | undefined;
  let arrival: (() => void) | undefined;
  const reveal = () => {
    cover?.remove();
    cover = undefined;
  };
  const clearCallbacks = () => {
    if (idle) map.off("idle", idle);
    if (arrival) map.off("moveend", arrival);
    idle = arrival = undefined;
  };
  const cancel = () => {
    clearCallbacks();
    reveal();
    origin = undefined;
  };
  const whenReady = (next: () => void) => {
    idle = () => {
      map.off("idle", idle!);
      idle = undefined;
      next();
    };
    map.on("idle", idle);
  };
  map.on("dragstart", cancel);
  map.on("wheel", cancel);

  return {
    fitBounds(bounds: LngLatBoundsLike, options: FitBoundsOptions) {
      const target = map.cameraForBounds(bounds, options);
      if (!target) return;
      clearCallbacks();
      map.stop();
      if (!origin) {
        origin = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          padding: map.getPadding(),
        };
      }
      if (!cover) {
        const canvas = map.getCanvas();
        const snapshot = document.createElement("canvas");
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        const ctx = snapshot.getContext("2d");
        if (ctx) {
          map.redraw();
          ctx.drawImage(canvas, 0, 0);
          snapshot.dataset["mapTransition"] = "";
          snapshot.setAttribute("aria-hidden", "true");
          Object.assign(snapshot.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: "5",
          });
          map.getContainer().parentElement?.append(snapshot);
          cover = snapshot;
        }
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        whenReady(() => {
          reveal();
          origin = undefined;
        });
        map.fitBounds(bounds, { ...options, duration: 0 });
        return;
      }
      // Keep coarse imagery and destination tiles in the same MapLibre cache. A middle
      // zoom supplies parent-tile fallbacks during the long approach to roof level.
      whenReady(() => {
        whenReady(() => {
          whenReady(() => {
            map.jumpTo(origin!);
            origin = undefined;
            map.redraw();
            reveal();
            arrival = () => {
              map.off("moveend", arrival!);
              arrival = undefined;
              map.fitBounds(bounds, { ...options, duration: 2000 });
            };
            map.on("moveend", arrival);
            map.fitBounds(ROMANIA_BOUNDS, { ...overview, duration: 1400 });
          });
          map.fitBounds(bounds, { ...options, duration: 0 });
        });
        map.jumpTo({ ...target, zoom: Math.min(12, target.zoom ?? 12) });
      });
      map.fitBounds(ROMANIA_BOUNDS, { ...overview, duration: 0 });
    },
    dispose() {
      cancel();
      map.off("dragstart", cancel);
      map.off("wheel", cancel);
    },
  };
}
