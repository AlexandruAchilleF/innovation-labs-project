import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GridLayers, type LayerToggles } from "@/components/sunproof/map/GridLayers";
import { MapCanvas, useMapApi, type Basemap } from "@/components/sunproof/map/MapCanvas";
import { MapOverlay } from "@/components/sunproof/map/MapOverlay";
import {
  congestionAt,
  feederRuns,
  housePlanXY,
  nbStressIndex,
  toLngLat,
  transformerDay,
  type LngLat,
} from "@/lib/geo";
import { houseBearings } from "@/lib/geo-features";
import { resolveMapGeometry } from "@/lib/map-geography";
import type { GridState, HouseholdSummary, Neighborhood } from "@/lib/types";
import type { CompareView } from "@/routes/harta";
import { LayersMenu, ToolRail, ZoomRail, prefersReducedMotion } from "./MapChrome";
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
  caseChip,
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
  /** compact case summary shown under the search bar when the side panel is hidden */
  caseChip?: ReactNode;
}) {
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [toggles, setToggles] = useState<LayerToggles>({ feeders: true, heat: true });

  const houses = useMemo(() => grid?.houses ?? [], [grid]);
  const geography = useMemo(() => (nb ? resolveMapGeometry(nb, houses) : null), [nb, houses]);
  const center = geography?.center ?? null;
  const mapNb = useMemo(
    () => (nb && geography ? { ...nb, houses: geography.houses } : undefined),
    [nb, geography],
  );
  const runs = useMemo(() => (grid ? feederRuns(grid, houses) : []), [grid, houses]);
  const day = useMemo(() => (grid ? transformerDay(grid, kva) : []), [grid, kva]);
  const bearings = useMemo(() => houseBearings(runs), [runs]);
  const congestion = useMemo(
    () => (grid ? congestionAt(grid, houses, kva, slot, day) : null),
    [grid, houses, kva, slot, day],
  );
  const pins = useMemo(
    () =>
      neighborhoods.map((x) => ({
        nb: x,
        center: resolveMapGeometry(x, []).center,
        index: nbStressIndex(x),
      })),
    [neighborhoods],
  );

  return (
    <section className="relative min-w-0 flex-1 overflow-hidden bg-obsidian max-sm:[&_.maplibregl-ctrl-top-left]:hidden">
      <MapCanvas basemap={basemap}>
        <Camera nb={mapNb} center={center} selectedId={selectedId} />
        {grid && center && geography && (
          <GridLayers
            center={center}
            runs={runs}
            houses={geography.houses}
            placements={geography.placements}
            day={day}
            slot={slot}
            toggles={toggles}
          />
        )}
        <MapOverlay
          pins={pins}
          active={
            grid && center && nb && congestion && geography?.houses.length
              ? {
                  nb,
                  center,
                  houses: geography.houses,
                  roofSizes: geography.roofSizes,
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
          selectedHouse={geography?.houses.find(
            (h) => (h.household_id ?? h.house_id) === selectedId,
          )}
        />
        <ZoomRail />
      </MapCanvas>

      {nb && geography && (
        <div className="absolute bottom-[190px] left-3 z-10 max-w-[min(360px,calc(100%-24px))] rounded border border-iron bg-obsidian/90 px-2 py-1 text-[10px] text-fog">
          {geography.available
            ? "Amplasare demo pe clădiri OSM · conexiuni electrice ilustrative"
            : "Geometrie stradală indisponibilă pentru acest cartier"}
          {geography.missing.length > 0 && (
            <span className="block">
              {geography.missing.length} conexiuni fără amplasare verificabilă pe hartă
            </span>
          )}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="ml-1 underline"
          >
            © OpenStreetMap contributors
          </a>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 sm:gap-3">
        <div className="hidden w-24 shrink-0 sm:block" />
        <div className="pointer-events-auto flex min-w-0 flex-1 max-w-[460px] flex-col items-center gap-2">
          <MapSearch
            households={households}
            neighborhoods={neighborhoods}
            onHousehold={onSelectHousehold}
            onNeighborhood={onPickNeighborhood}
          />
        </div>
        <div className="pointer-events-auto shrink-0">
          <LayersMenu
            basemap={basemap}
            onBasemap={setBasemap}
            toggles={toggles}
            onToggles={setToggles}
          />
        </div>
      </div>
      {/* own full-width row under the search; z-[9] keeps the search results dropdown above it */}
      {caseChip && <div className="absolute inset-x-3 top-[60px] z-[9] lg:hidden">{caseChip}</div>}

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
 * Frames the client's stretch of street (client +/- 2 neighbours on its feeder, plus the PT when close) so the
 * 2D roofs are readable on arrival; falls back to the whole neighbourhood when the client is not on this PT.
 */
export function Camera({
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
  const geometryReady = !!nb?.houses.length;
  const prevNb = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!api || !nb || !center || !geometryReady) return;
    const client = nb.houses.find((h) => (h.household_id ?? h.house_id) === selectedId);
    if (prevNb.current === id && client) {
      const clientPt = toLngLat(center, housePlanXY(client).x, housePlanXY(client).y);
      if (api.map.getZoom() >= 14 && api.map.getBounds().contains(clientPt)) return;
    }
    prevNb.current = id;
    let focus = nb.houses;
    let withPt = false;
    if (client) {
      const run = feederRuns(nb, nb.houses).find((r) => r.houses.includes(client));
      const i = run ? run.houses.indexOf(client) : -1;
      if (run && i >= 0) {
        focus = run.houses.slice(Math.max(0, i - 2), i + 3);
        withPt = i <= 2;
      }
    }
    const pts = focus.map((h) => housePlanXY(h)).map((p) => toLngLat(center, p.x, p.y));
    if (withPt) pts.push(center);
    const lons = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    // side padding clears the tool/zoom rails plus half of a roof label, so the client never lands under chrome
    // (less on the left when the PT anchors the frame: its ring is narrower than a centred label)
    const narrow = api.map.getContainer().clientWidth < 640;
    api.map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      {
        padding: narrow
          ? { top: 120, bottom: 200, left: 72, right: 72 }
          : { top: 140, bottom: 200, left: withPt ? 110 : 170, right: 130 },
        maxZoom: 18,
        duration: prefersReducedMotion() ? 0 : 2400,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, id, selectedId, geometryReady]);
  return null;
}
