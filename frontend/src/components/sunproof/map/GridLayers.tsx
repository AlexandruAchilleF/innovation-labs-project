import { useEffect, useMemo } from "react";
import type { ExpressionSpecification, GeoJSONSource, LayerSpecification } from "maplibre-gl";
import { VOLTAGE_STOPS, type FeederRun, type LngLat } from "@/lib/geo";
import { feederFeatures, heatFeatures } from "@/lib/geo-features";
import type { FeederHouse, TransformerPoint } from "@/lib/types";
import type { MapPlacement } from "@/lib/map-geography";
import { COUNTRY_MASK_LAYER_ID } from "@/lib/romania-map";
import { useMapApi } from "./MapCanvas";

export interface LayerToggles {
  feeders: boolean;
  heat: boolean;
}

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#a4a19b";
const EMPTY = { type: "FeatureCollection" as const, features: [] };

/** Congestion layers: voltage-coloured feeder trunks (width = loading), service drops and a voltage-rise heatmap. */
export function GridLayers({
  center,
  runs,
  houses,
  day,
  slot,
  toggles,
  placements,
}: {
  center: LngLat;
  runs: FeederRun[];
  houses: FeederHouse[];
  day: TransformerPoint[];
  slot: number;
  toggles: LayerToggles;
  placements?: Record<string, MapPlacement>;
}) {
  const api = useMapApi();
  const feeders = useMemo(
    () => feederFeatures(center, runs, day, slot, placements),
    [center, runs, day, slot, placements],
  );
  const heat = useMemo(() => heatFeatures(center, houses, slot), [center, houses, slot]);

  // one-time source + layer setup
  useEffect(() => {
    if (!api) return;
    const { map } = api;
    const addLayer = (layer: LayerSpecification) => map.addLayer(layer, COUNTRY_MASK_LAYER_ID);
    const vColor = [
      "interpolate",
      ["linear"],
      ["get", "v"],
      ...VOLTAGE_STOPS.flatMap(([v, c]) => [v, cssVar(c)]),
    ] as unknown as ExpressionSpecification;
    map.addSource("sp-feeders", { type: "geojson", data: EMPTY });
    map.addSource("sp-heat", { type: "geojson", data: EMPTY });
    addLayer({
      id: "sp-heat",
      type: "heatmap",
      source: "sp-heat",
      minzoom: 0,
      paint: {
        "heatmap-weight": ["get", "w"],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 12, 0.6, 17, 1.6],
        "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 0, 18, 12, 24, 18, 160],
        "heatmap-opacity": 0.55,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(0,0,0,0)",
          0.35,
          cssVar("--smoke"),
          0.65,
          cssVar("--warning"),
          1,
          cssVar("--critical"),
        ],
      },
    });
    addLayer({
      id: "sp-drop",
      type: "line",
      source: "sp-feeders",
      filter: ["==", ["get", "kind"], "drop"],
      minzoom: 14,
      paint: { "line-color": vColor, "line-width": 1, "line-opacity": 0.7 },
    });
    addLayer({
      id: "sp-trunk-casing",
      type: "line",
      source: "sp-feeders",
      filter: ["==", ["get", "kind"], "trunk"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": cssVar("--obsidian"),
        "line-width": ["interpolate", ["linear"], ["get", "load"], 0, 5, 100, 15],
        "line-opacity": 0.8,
      },
    });
    addLayer({
      id: "sp-trunk",
      type: "line",
      source: "sp-feeders",
      filter: ["==", ["get", "kind"], "trunk"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": vColor,
        "line-width": ["interpolate", ["linear"], ["get", "load"], 0, 2.5, 100, 11],
      },
    });
    return () => {
      if (!map.getStyle()) return;
      ["sp-trunk", "sp-trunk-casing", "sp-drop", "sp-heat"].forEach(
        (id) => map.getLayer(id) && map.removeLayer(id),
      );
      ["sp-feeders", "sp-heat"].forEach((id) => map.getSource(id) && map.removeSource(id));
    };
  }, [api]);

  useEffect(() => {
    (api?.map.getSource("sp-feeders") as GeoJSONSource | undefined)?.setData(feeders);
  }, [api, feeders]);
  useEffect(() => {
    (api?.map.getSource("sp-heat") as GeoJSONSource | undefined)?.setData(heat);
  }, [api, heat]);

  useEffect(() => {
    if (!api) return;
    const vis = (on: boolean) => (on ? "visible" : "none");
    const set = (id: string, on: boolean) =>
      api.map.getLayer(id) && api.map.setLayoutProperty(id, "visibility", vis(on));
    ["sp-trunk", "sp-trunk-casing", "sp-drop"].forEach((id) => set(id, toggles.feeders));
    set("sp-heat", toggles.heat);
  }, [api, toggles]);

  return null;
}
