import { useMemo, useState } from "react";
import {
  Compass,
  Globe2,
  Layers,
  LocateFixed,
  Minus,
  MousePointer2,
  Plus,
  ScanSearch,
  Search,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LayerToggles } from "@/components/sunproof/map/GridLayers";
import { useMapApi, type Basemap } from "@/components/sunproof/map/MapCanvas";
import { ROMANIA_CENTER, housePlanXY, toLngLat, type LngLat } from "@/lib/geo";
import { fmt } from "@/lib/format";
import type { FeederHouse, HouseholdSummary, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";

export const glass = "border border-iron bg-obsidian/85 backdrop-blur-sm shadow-overlay";

export function LocationChip({
  center,
  nb,
  zoom,
}: {
  center: LngLat;
  nb: Neighborhood | undefined;
  zoom: number;
}) {
  const place = zoom >= 12 && nb ? `${nb.city}${nb.county ? `, ${nb.county}` : ""}` : "România";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[4px] px-2.5 py-1 text-[12px] text-bone",
        glass,
      )}
    >
      <span className="eyebrow !text-[9px] rounded-[2px] border border-iron px-1 !text-bone">
        RO
      </span>
      {place}
      <span className="num text-fog">
        {fmt(center[1], 4)}° N, {fmt(center[0], 4)}° E
      </span>
    </div>
  );
}

export function LayersMenu({
  basemap,
  onBasemap,
  toggles,
  onToggles,
}: {
  basemap: Basemap;
  onBasemap: (b: Basemap) => void;
  toggles: LayerToggles;
  onToggles: (t: LayerToggles) => void;
}) {
  const rows: [keyof LayerToggles, string, string][] = [
    ["feeders", "Fideri JT", "culoare = tensiune, grosime = încărcare"],
    ["flow", "Sensul puterii", "liniuțe animate spre PT la flux invers"],
    ["heat", "Hartă termică", "creșterea tensiunii peste 236 V"],
  ];
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-8 items-center gap-2 rounded-[4px] px-3 text-[13px] text-bone hover:bg-slate",
          glass,
        )}
      >
        Straturi <Layers className="size-4 text-fog" strokeWidth={1.5} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 border-iron bg-slate p-3">
        <div className="eyebrow">Hartă de bază</div>
        <div className="grid grid-cols-2 gap-1">
          {(["satellite", "dark"] as const).map((b) => (
            <button
              key={b}
              onClick={() => onBasemap(b)}
              className={cn(
                "rounded-[4px] border px-2 py-1.5 text-[12px]",
                basemap === b ? "border-voltage text-bone" : "border-iron text-fog hover:text-bone",
              )}
            >
              {b === "satellite" ? "Satelit" : "Întunecat"}
            </button>
          ))}
        </div>
        <div className="eyebrow pt-1">Congestie</div>
        {rows.map(([k, l, d]) => (
          <label key={k} className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-[13px] text-bone">{l}</span>
              <span className="block text-[11px] text-fog">{d}</span>
            </span>
            <Switch
              checked={toggles[k]}
              onCheckedChange={(v) => onToggles({ ...toggles, [k]: v })}
            />
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function RailButton({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          className={cn(
            "flex size-9 items-center justify-center rounded-[4px] text-fog transition-colors hover:bg-slate hover:text-bone",
            active && "border border-iron bg-slate text-bone",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ToolRail({
  nb,
  center,
  fleet,
  selectedHouse,
}: {
  nb: Neighborhood | undefined;
  center: LngLat | null;
  fleet: LngLat[];
  selectedHouse: FeederHouse | undefined;
}) {
  const api = useMapApi();
  if (!api) return null;
  const fly = (c: LngLat, zoom: number) =>
    api.map.flyTo({ center: c, zoom, essential: true, duration: 1600 });
  return (
    <div
      className={cn(
        "absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1 rounded-[8px] p-1",
        glass,
      )}
    >
      <RailButton label="Selectare" active>
        <MousePointer2 className="size-4" strokeWidth={1.5} />
      </RailButton>
      <RailButton
        label="Clientul analizat"
        onClick={() =>
          center &&
          selectedHouse &&
          fly(toLngLat(center, housePlanXY(selectedHouse).x, housePlanXY(selectedHouse).y), 18)
        }
      >
        <LocateFixed className="size-4" strokeWidth={1.5} />
      </RailButton>
      <RailButton
        label={nb ? `Tot cartierul (${nb.city})` : "Cartier"}
        onClick={() => center && fly(center, 16)}
      >
        <ScanSearch className="size-4" strokeWidth={1.5} />
      </RailButton>
      <RailButton
        label="Toată flota (România)"
        onClick={() =>
          fleet.length
            ? api.map.fitBounds(
                [
                  [Math.min(...fleet.map((c) => c[0])), Math.min(...fleet.map((c) => c[1]))],
                  [Math.max(...fleet.map((c) => c[0])), Math.max(...fleet.map((c) => c[1]))],
                ],
                { padding: { top: 140, bottom: 200, left: 90, right: 90 }, duration: 1600 },
              )
            : fly(ROMANIA_CENTER, 6.2)
        }
      >
        <Globe2 className="size-4" strokeWidth={1.5} />
      </RailButton>
    </div>
  );
}

export function ZoomRail({ zoom }: { zoom: number }) {
  const api = useMapApi();
  if (!api) return null;
  return (
    <div
      className={cn(
        "absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-[8px] p-1",
        glass,
      )}
    >
      <RailButton label="Mărește" onClick={() => api.map.zoomIn()}>
        <Plus className="size-4" strokeWidth={1.5} />
      </RailButton>
      <span className="num py-0.5 text-[11px] text-fog">{fmt(zoom, 0)}</span>
      <RailButton label="Micșorează" onClick={() => api.map.zoomOut()}>
        <Minus className="size-4" strokeWidth={1.5} />
      </RailButton>
      <div className="my-1 h-px w-6 bg-iron" />
      <RailButton label="Nord sus" onClick={() => api.map.resetNorth()}>
        <Compass className="size-4" strokeWidth={1.5} />
      </RailButton>
    </div>
  );
}
