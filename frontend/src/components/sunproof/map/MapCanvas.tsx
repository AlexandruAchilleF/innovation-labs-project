import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Map as MlMap, StyleSpecification } from "maplibre-gl";
import { ROMANIA_CENTER } from "@/lib/geo";

type MapLib = typeof import("maplibre-gl");
export interface MapApi {
  map: MlMap;
  lib: MapLib;
}
export type Basemap = "satellite" | "dark";

const MapCtx = createContext<MapApi | null>(null);
export const useMapApi = () => useContext(MapCtx);

// Raster basemaps only (no API key, no glyph server): Esri imagery for real roofs, CARTO dark for a calm canvas.
const style: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
    labels: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    dark: {
      type: "raster",
      tiles: ["a", "b", "c"].map(
        (s) => `https://${s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png`,
      ),
      tileSize: 256,
      maxzoom: 20,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    // muted + darkened imagery so data layers stay legible on the Altitude canvas
    {
      id: "base-satellite",
      type: "raster",
      source: "satellite",
      paint: { "raster-saturation": -0.35, "raster-brightness-max": 0.78, "raster-contrast": 0.08 },
    },
    { id: "base-labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.85 } },
    { id: "base-dark", type: "raster", source: "dark", layout: { visibility: "none" } },
  ],
};

export function MapCanvas({
  basemap,
  children,
  onMove,
}: {
  basemap: Basemap;
  children?: ReactNode;
  onMove?: (map: MlMap) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<MapApi | null>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  useEffect(() => {
    let map: MlMap | undefined;
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    void import("maplibre-gl").then((mod) => {
      const lib = ((mod as unknown as { default?: MapLib }).default ?? mod) as MapLib;
      if (cancelled || !el.current) return;
      map = new lib.Map({
        container: el.current,
        style,
        center: ROMANIA_CENTER,
        zoom: 6,
        maxPitch: 0,
        dragRotate: false,
        attributionControl: { compact: true },
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new lib.ScaleControl({ unit: "metric", maxWidth: 90 }), "bottom-left");
      map.on("move", () => moveRef.current?.(map!));
      ro = new ResizeObserver(() => map?.resize());
      ro.observe(el.current);
      map.on("load", () => {
        if (!cancelled) setApi({ map: map!, lib });
        moveRef.current?.(map!);
      });
    });
    return () => {
      cancelled = true;
      ro?.disconnect();
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    const sat = basemap === "satellite" ? "visible" : "none";
    api.map.setLayoutProperty("base-satellite", "visibility", sat);
    api.map.setLayoutProperty("base-labels", "visibility", sat);
    api.map.setLayoutProperty("base-dark", "visibility", basemap === "dark" ? "visible" : "none");
  }, [api, basemap]);

  return (
    <div className="absolute inset-0">
      {/* maplibre forces position:relative on its container, so it fills a sized wrapper instead */}
      <div ref={el} className="h-full w-full" />
      {api && <MapCtx.Provider value={api}>{children}</MapCtx.Provider>}
    </div>
  );
}
