import { useEffect, useMemo, useState } from "react";
import { GridLayers, type LayerToggles } from "@/components/sunproof/map/GridLayers";
import { MapCanvas, useMapApi, type Basemap } from "@/components/sunproof/map/MapCanvas";
import { MapOverlay } from "@/components/sunproof/map/MapOverlay";
import {
  congestionAt,
  feederRuns,
  housePlanXY,
  nbCenter,
  nbStressIndex,
  toLngLat,
  transformerDay,
  type LngLat,
} from "@/lib/geo";
import { houseBearings } from "@/lib/geo-features";
import type { GridState, HouseholdSummary, Neighborhood } from "@/lib/types";
import type { CompareView } from "@/routes/harta";
import { LayersMenu, ToolRail, ZoomRail } from "./MapChrome";
import { MapSearch } from "./MapSearch";
import { TimeScrubber } from "./TimeScrubber";

export function MapStage({
  neighborhoods,
  households,
  nb,
  grid,
  kva,
  slot,
  onSlot,
  selectedId,
  onSelectHousehold,
  onPickNeighborhood,
  simulating,
  view,
}: {
  neighborhoods: Neighborhood[];
  households: HouseholdSummary[];
  nb: Neighborhood | undefined;
  grid: Neighborhood | GridState | undefined;
  kva: number;
  slot: number;
  onSlot: (s: number) => void;
  selectedId: string;
  onSelectHousehold: (id: string) => void;
  onPickNeighborhood: (id: string) => void;
  simulating: boolean;
  view: CompareView;
}) {
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [toggles, setToggles] = useState<LayerToggles>({ feeders: true, heat: true, flow: true });

  const center = useMemo<LngLat | null>(() => (nb ? nbCenter(nb) : null), [nb]);
  const houses = useMemo(() => grid?.houses ?? [], [grid]);
  const runs = useMemo(() => (grid ? feederRuns(grid, houses) : []), [grid, houses]);
  const day = useMemo(() => (grid ? transformerDay(grid, kva) : []), [grid, kva]);
  const bearings = useMemo(() => houseBearings(runs), [runs]);
  const congestion = useMemo(
    () => (grid ? congestionAt(grid, houses, kva, slot, day) : null),
    [grid, houses, kva, slot, day],
  );
  const pins = useMemo(
    () => neighborhoods.map((x) => ({ nb: x, center: nbCenter(x), index: nbStressIndex(x) })),
    [neighborhoods],
  );

  return (
    <section className="relative min-w-0 flex-1 overflow-hidden bg-obsidian">
      <MapCanvas basemap={basemap}>
        <Camera nb={nb} center={center} selectedId={selectedId} />
        {grid && center && (
          <GridLayers
            center={center}
            runs={runs}
            houses={houses}
            day={day}
            slot={slot}
            toggles={toggles}
          />
        )}
        <MapOverlay
          pins={pins}
          active={
            grid && center && nb && congestion
              ? {
                  nb,
                  center,
                  houses,
                  bearings,
                  kva,
                  loadingPct: congestion.transformerLoadingPct,
                  reverse: congestion.reverseFlow,
                }
              : null
          }
          slot={slot}
          selectedId={selectedId}
          onPin={onPickNeighborhood}
          onHouse={(h) => h.household_id && onSelectHousehold(h.household_id)}
        />
        <ToolRail
          nb={nb}
          center={center}
          fleet={pins.map((p) => p.center)}
          selectedHouse={houses.find((h) => (h.household_id ?? h.house_id) === selectedId)}
        />
        <ZoomRail />
      </MapCanvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3">
        <div className="w-24" />
        <div className="pointer-events-auto flex w-full max-w-[460px] flex-col items-center gap-2">
          <MapSearch
            households={households}
            neighborhoods={neighborhoods}
            onHousehold={onSelectHousehold}
            onNeighborhood={onPickNeighborhood}
          />
        </div>
        <div className="pointer-events-auto">
          <LayersMenu
            basemap={basemap}
            onBasemap={setBasemap}
            toggles={toggles}
            onToggles={setToggles}
          />
        </div>
      </div>

      {grid && congestion && (
        <TimeScrubber
          houses={houses}
          day={day}
          slot={slot}
          onSlot={onSlot}
          congestion={congestion}
          label={
            simulating
              ? view === "after"
                ? "Simulare: după măsuri"
                : "Simulare: înainte"
              : "Măsurat · 18 aug 2026"
          }
        />
      )}
    </section>
  );
}

/**
 * Frames the client's stretch of street (client +/- 3 neighbours on its feeder, plus the PT when close) so the
 * 2D roofs are readable on arrival; falls back to the whole neighbourhood when the client is not on this PT.
 */
function Camera({
  nb,
  center,
  selectedId,
}: {
  nb: Neighborhood | undefined;
  center: LngLat | null;
  selectedId: string;
}) {
  const api = useMapApi();
  const id = nb?.neighborhood_id;
  useEffect(() => {
    if (!api || !nb || !center) return;
    const client = nb.houses.find((h) => (h.household_id ?? h.house_id) === selectedId);
    let focus = nb.houses;
    if (client) {
      const run = feederRuns(nb, nb.houses).find((r) => r.houses.includes(client));
      const i = run ? run.houses.indexOf(client) : -1;
      if (run && i >= 0) focus = run.houses.slice(Math.max(0, i - 3), i + 4);
    }
    const pts = focus.map((h) => housePlanXY(h)).map((p) => toLngLat(center, p.x, p.y));
    const lons = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    api.map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      {
        padding: { top: 140, bottom: 190, left: 80, right: 80 },
        maxZoom: 18,
        duration: 2400,
        essential: true,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, id, selectedId]);
  return null;
}
