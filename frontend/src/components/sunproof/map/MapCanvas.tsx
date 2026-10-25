import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Map as MlMap, StyleSpecification } from "maplibre-gl";
import { ROMANIA_CENTER } from "@/lib/geo";
import { COUNTRY_MASK_LAYER_ID, OUTSIDE_ROMANIA, ROMANIA_BOUNDARY } from "@/lib/romania-map";
import { createMapNavigation } from "@/lib/map-navigation";
import { SolarMaskPattern } from "./SolarMaskPattern";

type MapLib = typeof import("maplibre-gl");
export interface MapApi {
  map: MlMap;
  lib: MapLib;
  fitBounds: ReturnType<typeof createMapNavigation>["fitBounds"];
}
export type Basemap = "satellite" | "dark";

const MapCtx = createContext<MapApi | null>(null);
export const useMapApi = () => useContext(MapCtx);

// Raster basemaps only (no API key, no glyph server): Esri imagery for real roofs, Esri dark canvas for a clean dark background.
// Note: Esri World_Dark_Gray_Base tile pyramid in Europe is rendered up to zoom 16.
// Setting maxzoom: 16 on the dark raster source instructs MapLibre to overscale (zoom in without re-requesting missing higher-level tiles),
// preventing the "Map data not yet available" placeholder tile from appearing at street/roof level zoom (17-20).
const style: StyleSpecification = {
  version: 8,
  sources: {
    "outside-romania": { type: "geojson", data: OUTSIDE_ROMANIA },
    "romania-boundary": { type: "geojson", data: ROMANIA_BOUNDARY },
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
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
      attribution: "© Esri, HERE, Garmin, © OpenStreetMap contributors",
    },
    darkLabels: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    { id: "base-background", type: "background", paint: { "background-color": "#111111" } },
    // muted + darkened imagery so data layers stay legible on the Altitude canvas
    {
      id: "base-satellite",
      type: "raster",
      source: "satellite",
      paint: { "raster-saturation": -0.35, "raster-brightness-max": 0.78, "raster-contrast": 0.08 },
    },
    { id: "base-labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.85 } },
    { id: "base-dark", type: "raster", source: "dark", layout: { visibility: "none" } },
    {
      id: "base-dark-labels",
      type: "raster",
      source: "darkLabels",
      layout: { visibility: "none" },
      paint: { "raster-opacity": 0.85 },
    },
    {
      id: COUNTRY_MASK_LAYER_ID,
      type: "fill",
      source: "outside-romania",
      paint: { "fill-color": "#111111", "fill-opacity": 1, "fill-antialias": false },
    },
    {
      id: "romania-outline",
      type: "line",
      source: "romania-boundary",
      paint: { "line-color": "#a4a19b", "line-width": 1, "line-opacity": 0.65 },
    },
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
    let navigation: ReturnType<typeof createMapNavigation> | undefined;
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
        cancelPendingTileRequestsWhileZooming: false,
        // Retain the country, intermediate and roof tiles while replaying the flight.
        maxTileCacheZoomLevels: 16,
        renderWorldCopies: false,
        attributionControl: { compact: true },
      });
      map.touchZoomRotate.disableRotation();
      // top-left sits in the empty slot beside the search bar; the bottom edge belongs to the time scrubber
      map.addControl(new lib.ScaleControl({ unit: "metric", maxWidth: 90 }), "top-left");
      map.on("move", () => moveRef.current?.(map!));
      ro = new ResizeObserver(() => map?.resize());
      ro.observe(el.current);
      map.on("load", () => {
        // compact attribution opens expanded on wide maps and slides under the scrubber; start collapsed (the ⓘ stays)
        el.current
          ?.querySelector(".maplibregl-ctrl-attrib")
          ?.classList.remove("maplibregl-compact-show");
        if (!cancelled) {
          navigation = createMapNavigation(map!);
          setApi({ map: map!, lib, fitBounds: navigation.fitBounds });
        }
        moveRef.current?.(map!);
      });
    });
    return () => {
      cancelled = true;
      ro?.disconnect();
      navigation?.dispose();
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    const sat = basemap === "satellite" ? "visible" : "none";
    const dark = basemap === "dark" ? "visible" : "none";
    api.map.setLayoutProperty("base-satellite", "visibility", sat);
    api.map.setLayoutProperty("base-labels", "visibility", sat);
    api.map.setLayoutProperty("base-dark", "visibility", dark);
    api.map.setLayoutProperty("base-dark-labels", "visibility", dark);
  }, [api, basemap]);

  return (
    <div className="absolute inset-0">
      {/* maplibre forces position:relative on its container, so it fills a sized wrapper instead */}
      <div ref={el} className="h-full w-full" />
      {api && (
        <MapCtx.Provider value={api}>
          <SolarMaskPattern />
          {children}
        </MapCtx.Provider>
      )}
    </div>
  );
}
