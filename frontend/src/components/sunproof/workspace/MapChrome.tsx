import { Globe2, Layers, LocateFixed, Minus, Plus, ScanSearch } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EquipmentIcon, type EquipmentKind } from "@/components/sunproof/map/equipment";
import type { LayerToggles } from "@/components/sunproof/map/GridLayers";
import { useMapApi, type Basemap } from "@/components/sunproof/map/MapCanvas";
import { ROMANIA_CENTER, VOLTAGE_STOPS, housePlanXY, toLngLat, type LngLat } from "@/lib/geo";
import type { FeederHouse, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";

export const glass = "border border-iron bg-obsidian/85 backdrop-blur-sm shadow-overlay";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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
    ["heat", "Hartă termică", "creșterea tensiunii"],
  ];
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-10 items-center gap-2 rounded-[4px] px-3 text-[13px] text-bone hover:bg-slate",
          glass,
        )}
      >
        Straturi <Layers className="size-4 text-fog" strokeWidth={1.5} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 border-iron bg-slate p-3">
        <div className="text-[12px] text-fog">Hartă de bază</div>
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
        <div className="pt-1 text-[12px] text-fog">Straturi de congestie</div>
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
        <div className="space-y-1.5 border-t border-iron pt-3">
          <div className="text-[12px] text-fog">Tensiune la branșament</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-fog">
            {VOLTAGE_STOPS.map(([v, token], i) => (
              <span key={v} className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-[1px]" style={{ background: `var(${token})` }} />
                <span className="num">{i === VOLTAGE_STOPS.length - 1 ? `≥${v} V` : `${v} V`}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 border-t border-iron pt-3">
          <div className="text-[12px] text-fog">Echipament client</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-fog">
            {equipment.map(([k, l]) => (
              <span key={k} className="flex items-center gap-1.5">
                <EquipmentIcon kind={k} />
                {l}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-fog">
            {inverterStates.map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: `var(${c})` }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const equipment: [EquipmentKind, string][] = [
  ["pv", "Panouri PV"],
  ["inverter", "Invertor"],
  ["battery", "Baterie"],
  ["meter", "Contor inteligent"],
];

const inverterStates: [string, string][] = [
  ["--success", "Produce"],
  ["--warning", "Derating"],
  ["--critical", "Deconectat"],
  ["--smoke", "Noapte"],
];

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
    api.map.flyTo({ center: c, zoom, duration: prefersReducedMotion() ? 0 : 1600 });
  return (
    <div
      className={cn(
        "absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1 rounded-[8px] p-1",
        glass,
      )}
    >
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
                {
                  padding: { top: 140, bottom: 200, left: 90, right: 90 },
                  duration: prefersReducedMotion() ? 0 : 1600,
                },
              )
            : fly(ROMANIA_CENTER, 6.2)
        }
      >
        <Globe2 className="size-4" strokeWidth={1.5} />
      </RailButton>
    </div>
  );
}

export function ZoomRail() {
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
      <RailButton label="Micșorează" onClick={() => api.map.zoomOut()}>
        <Minus className="size-4" strokeWidth={1.5} />
      </RailButton>
    </div>
  );
}
