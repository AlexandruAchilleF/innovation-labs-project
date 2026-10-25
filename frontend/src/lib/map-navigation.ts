import type { FitBoundsOptions, LngLatBoundsLike, Map } from "maplibre-gl";

/** Hold the last rendered basemap while the destination's raster tiles load. */
export function createMapNavigation(map: Map) {
  let cover: HTMLCanvasElement | undefined;
  const reveal = () => {
    cover?.remove();
    cover = undefined;
  };
  map.on("idle", reveal);
  map.on("dragstart", reveal);
  map.on("wheel", reveal);

  return {
    fitBounds(bounds: LngLatBoundsLike, options: FitBoundsOptions) {
      // Reuse the last complete view if another client is selected while loading.
      map.stop();
      if (!cover) {
        const canvas = map.getCanvas();
        const snapshot = document.createElement("canvas");
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        const ctx = snapshot.getContext("2d");
        if (ctx) {
          // Copy synchronously after drawing: no permanent preserveDrawingBuffer cost,
          // and no asynchronous image decoding that could expose an empty frame.
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
      // Request the destination directly rather than downloading intermediate flight tiles.
      map.fitBounds(bounds, { ...options, duration: 0 });
    },
    dispose() {
      reveal();
      map.off("idle", reveal);
      map.off("dragstart", reveal);
      map.off("wheel", reveal);
    },
  };
}
