import { useEffect, useMemo } from "react";
import type { ExpressionSpecification, GeoJSONSource } from "maplibre-gl";
import { VOLTAGE_STOPS, type FeederRun, type LngLat } from "@/lib/geo";
import { feederFeatures, heatFeatures } from "@/lib/geo-features";
import type { FeederHouse, TransformerPoint } from "@/lib/types";
import { useMapApi } from "./MapCanvas";

export interface LayerToggles {
  feeders: boolean;
  heat: boolean;
  flow: boolean;
}

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#a4a19b";
const EMPTY = { type: "FeatureCollection" as const, features: [] };

// MapLibre's dashed-line animation: cycle through offsets of a 4-unit dash pattern.
const DASH_SEQ: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];

/** Congestion layers: voltage-coloured feeder trunks (width = loading), service drops, flow dashes and a voltage-rise heatmap. */
export function GridLayers({
  center,
  runs,
  houses,
  day,
  slot,
  toggles,
}: {
  center: LngLat;
  runs: FeederRun[];
  houses: FeederHouse[];
  day: TransformerPoint[];
  slot: number;
  toggles: LayerToggles;
}) {
  const api = useMapApi();
  const feeders = useMemo(() => feederFeatures(center, runs, day, slot), [center, runs, day, slot]);
  const heat = useMemo(() => heatFeatures(center, houses, slot), [center, houses, slot]);

  // one-time source + layer setup
  useEffect(() => {
    if (!api) return;
    const { map } = api;
    const vColor = [
      "interpolate",
      ["linear"],
      ["get", "v"],
      ...VOLTAGE_STOPS.flatMap(([v, c]) => [v, cssVar(c)]),
    ] as unknown as ExpressionSpecification;
    map.addSource("sp-feeders", { type: "geojson", data: EMPTY });
    map.addSource("sp-heat", { type: "geojson", data: EMPTY });
    map.addLayer({
      id: "sp-heat",
      type: "heatmap",
      source: "sp-heat",
      minzoom: 12,
      paint: {
        "heatmap-weight": ["get", "w"],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 12, 0.6, 17, 1.6],
        "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 12, 12, 18, 160],
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
    map.addLayer({
      id: "sp-drop",
      type: "line",
      source: "sp-feeders",
      filter: ["==", ["get", "kind"], "drop"],
      minzoom: 14,
      paint: { "line-color": vColor, "line-width": 1, "line-opacity": 0.7 },
    });
    map.addLayer({
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
    map.addLayer({
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
    map.addLayer({
      id: "sp-flow",
      type: "line",
      source: "sp-feeders",
      filter: ["all", ["==", ["get", "kind"], "trunk"], [">", ["get", "load"], 2]],
      paint: {
        "line-color": cssVar("--bone"),
        "line-width": 1.6,
        "line-opacity": 0.75,
        "line-dasharray": DASH_SEQ[0]!,
      },
    });

    let step = -1;
    let raf = 0;
    const animate = (t: number) => {
      const next = Math.floor(t / 70) % DASH_SEQ.length;
      if (
        next !== step &&
        map.getLayer("sp-flow") &&
        map.getLayoutProperty("sp-flow", "visibility") !== "none"
      ) {
        map.setPaintProperty("sp-flow", "line-dasharray", DASH_SEQ[next]!);
        step = next;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      if (!map.getStyle()) return;
      ["sp-flow", "sp-trunk", "sp-trunk-casing", "sp-drop", "sp-heat"].forEach(
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
    set("sp-flow", toggles.feeders && toggles.flow);
    set("sp-heat", toggles.heat);
  }, [api, toggles]);

  return null;
}
