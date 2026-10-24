import { useEffect, useReducer, useState } from "react";
import { flushSync } from "react-dom";
import {
  housePlanXY,
  houseStatusAt,
  houseVoltageAt,
  solarFactor,
  toLngLat,
  type LngLat,
} from "@/lib/geo";
import { fmt } from "@/lib/format";
import { DERATING_START_V, LEGAL_LIMIT_V } from "@/lib/sim";
import { layoutMapLabels, MAP_LABEL_WIDTH, MAP_LABEL_HEIGHT } from "@/lib/map-label-layout";
import type { FeederHouse, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMapApi } from "./MapCanvas";
import { HousePin } from "./equipment";
import { SolarRoof } from "./SolarRoof";

export interface ActiveGrid {
  nb: Neighborhood;
  center: LngLat;
  houses: FeederHouse[];
  roofSizes?: Map<string, number>;
  bearings: Map<string, number>;
  kva: number;
  loadingPct: number;
  reverse: boolean;
}

// Mapped roofs use their footprint size; standalone schematic callers keep a legible fallback.
// Below ROOF_ZOOM houses become compact pictograms.
const ROOF_M = 36;
export const ROOF_ZOOM = 16.5;

/** HTML layer over the map: neighbourhood pins, the active transformer and one 2D solar roof per connection. */
export function MapOverlay({
  pins,
  active,
  slot,
  selectedId,
  onPin,
  onHouse,
}: {
  pins: { nb: Neighborhood; center: LngLat; index: number }[];
  active: ActiveGrid | null;
  slot: number;
  selectedId: string | null;
  onPin: (id: string) => void;
  onHouse: (h: FeederHouse) => void;
}) {
  const api = useMapApi();
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    const onMove = () => {
      // MapLibre already animates the camera on its render frame. Commit the HTML
      // positions in that same frame so roofs cannot trail behind the basemap.
      flushSync(tick);
    };
    api.map.on("move", onMove);
    api.map.on("resize", onMove);
    return () => {
      api.map.off("move", onMove);
      api.map.off("resize", onMove);
    };
  }, [api]);

  if (!api) return null;
  const { map } = api;
  const zoom = map.getZoom();
  const px = (ll: LngLat) => map.project(ll);
  const sun = solarFactor(slot);
  const viewport = pins.length ? map.getContainer() : null;
  const visiblePins = pins
    .filter((p) => zoom < 12.5 || p.nb.neighborhood_id !== active?.nb.neighborhood_id)
    .map((pin) => ({ ...pin, anchor: px(pin.center) }))
    .filter(
      ({ anchor }) =>
        viewport &&
        anchor.x >= 0 &&
        anchor.x <= viewport.clientWidth &&
        anchor.y >= 0 &&
        anchor.y <= viewport.clientHeight,
    );
  const labels = new Map(
    layoutMapLabels(
      visiblePins.map(({ nb, anchor }) => ({ id: nb.neighborhood_id, x: anchor.x, y: anchor.y })),
      viewport?.clientWidth ?? 0,
      viewport?.clientHeight ?? 0,
      active?.nb.neighborhood_id,
    ).map((label) => [label.id, label]),
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        {visiblePins.map(({ nb, anchor }) => {
          const label = labels.get(nb.neighborhood_id)!;
          if (label.compact) return null;
          const x = Math.max(label.x, Math.min(label.x + MAP_LABEL_WIDTH, anchor.x));
          const y = Math.max(label.y, Math.min(label.y + MAP_LABEL_HEIGHT, anchor.y));
          if (x === anchor.x && y === anchor.y) return null;
          return (
            <g key={nb.neighborhood_id}>
              <line
                x1={anchor.x}
                y1={anchor.y}
                x2={x}
                y2={y}
                stroke="var(--fog)"
                strokeOpacity={0.65}
              />
              <circle cx={anchor.x} cy={anchor.y} r={2.5} fill="var(--bone)" />
            </g>
          );
        })}
      </svg>
      {visiblePins.map(({ nb, index }) => {
        const p = labels.get(nb.neighborhood_id)!;
        const isActive = nb.neighborhood_id === active?.nb.neighborhood_id;
        return (
          <button
            key={nb.neighborhood_id}
            onClick={() => onPin(nb.neighborhood_id)}
            aria-label={`${nb.city} ${fmt(nb.peak_voltage_v, 1)} V · ${nb.transformer_kva} kVA`}
            title={`${nb.city} · ${fmt(nb.peak_voltage_v, 1)} V · ${nb.transformer_kva} kVA`}
            style={{
              transform: `translate(${p.x}px, ${p.y}px)`,
              width: p.compact ? 12 : MAP_LABEL_WIDTH,
              height: p.compact ? 12 : MAP_LABEL_HEIGHT,
            }}
            className={cn(
              "pointer-events-auto absolute left-0 top-0 whitespace-nowrap border bg-obsidian/85 text-left backdrop-blur-sm transition-colors hover:bg-slate",
              p.compact ? "rounded-full" : "rounded-[4px] px-2 py-1",
              isActive ? "border-voltage" : "border-iron",
            )}
          >
            {!p.compact && (
              <>
                <span className="block text-[11px] font-medium text-bone">{nb.city}</span>
                <span className="num flex items-center gap-1.5 text-[11px] text-fog">
                  <span
                    className={cn(
                      "size-1.5 rounded-[1px]",
                      index >= 100 ? "bg-critical" : index >= 80 ? "bg-warning" : "bg-fog",
                    )}
                  />
                  {fmt(nb.peak_voltage_v, 1)} V · {nb.transformer_kva} kVA
                </span>
              </>
            )}
          </button>
        );
      })}

      {active && zoom >= 12.5 && <Transformer active={active} at={px(active.center)} />}

      {active &&
        zoom >= 13.5 &&
        active.houses.map((h) => {
          const xy = housePlanXY(h);
          const p = px(toLngLat(active.center, xy.x, xy.y));
          const id = h.household_id ?? h.house_id;
          const selected = id === selectedId;
          const status = houseStatusAt(h, slot);
          const mpp = (156543.03392 * Math.cos((active.center[1] * Math.PI) / 180)) / 2 ** zoom;
          const roofM = active.roofSizes?.get(h.house_id) ?? ROOF_M;
          const roofScale = zoom >= ROOF_ZOOM ? 1.25 : 1;
          // Detailed houses start larger than the 30 px pin, then keep growing with zoom.
          const minSize = zoom >= ROOF_ZOOM ? 48 * 2 ** ((zoom - ROOF_ZOOM) / 2) : 8;
          const size = Math.min(150, Math.max(minSize, (roofM * roofScale) / mpp));
          const v = houseVoltageAt(h, slot);
          return (
            <div
              key={h.house_id}
              style={{
                transform: `translate(${p.x}px, ${p.y}px)`,
                zIndex: selected ? 3 : hover === h.house_id ? 2 : 1,
              }}
              className="absolute left-0 top-0"
            >
              <button
                onClick={() => onHouse(h)}
                onMouseEnter={() => setHover(h.house_id)}
                onMouseLeave={() => setHover(null)}
                className="pointer-events-auto block -translate-x-1/2 -translate-y-1/2"
                aria-label={`${h.label} ${fmt(v, 1)} V`}
              >
                {zoom >= ROOF_ZOOM ? (
                  <SolarRoof
                    pvKw={h.pv_kw}
                    status={status}
                    sun={sun}
                    hasBattery={h.has_battery}
                    selected={selected}
                    monitored={!!h.household_id || h.monitored}
                    size={size}
                  />
                ) : (
                  <HousePin
                    status={status}
                    selected={selected}
                    monitored={!!h.household_id || h.monitored}
                    hasBattery={h.has_battery}
                  />
                )}
              </button>
              {(selected || hover === h.house_id) && (
                <div
                  className="pointer-events-none absolute left-1/2 top-0 mt-[calc(var(--s)*0.36+8px)] -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-iron bg-obsidian/90 px-2 py-1 shadow-overlay"
                  style={{ ["--s" as string]: `${size}px` }}
                >
                  <div className="text-[11px] font-medium text-bone">
                    {selected
                      ? "Clientul analizat"
                      : h.household_id
                        ? "Client monitorizat"
                        : "Vecin"}{" "}
                    · {id}
                  </div>
                  <div className="num text-[11px] text-fog">
                    <span
                      className={cn(
                        v >= LEGAL_LIMIT_V
                          ? "text-critical"
                          : v >= DERATING_START_V
                            ? "text-warning"
                            : "text-bone",
                      )}
                    >
                      {fmt(v, 1)} V
                    </span>{" "}
                    · {h.pv_kw} kWp · {h.phase} · {h.distance_m} m
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

function Transformer({ active, at }: { active: ActiveGrid; at: { x: number; y: number } }) {
  const pct = Math.min(130, active.loadingPct);
  const r = 17;
  const c = 2 * Math.PI * r;
  const tone =
    active.loadingPct >= 100
      ? "var(--critical)"
      : active.loadingPct >= 80
        ? "var(--warning)"
        : "var(--bone)";
  return (
    <div
      style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
      className="absolute left-0 top-0 z-[4]"
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <svg width={44} height={44} viewBox="0 0 44 44" className="block">
          <circle cx={22} cy={22} r={21} fill="var(--obsidian)" opacity={0.9} />
          <circle cx={22} cy={22} r={r} fill="none" stroke="var(--iron)" strokeWidth={3} />
          <circle
            cx={22}
            cy={22}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth={3}
            strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`}
            transform="rotate(-90 22 22)"
          />
          <circle cx={18} cy={22} r={5.5} fill="none" stroke="var(--bone)" strokeWidth={1.3} />
          <circle cx={26} cy={22} r={5.5} fill="none" stroke="var(--bone)" strokeWidth={1.3} />
        </svg>
      </div>
      <div
        className="num absolute left-0 top-0 ml-6 -translate-y-1/2 whitespace-nowrap rounded-[4px] border border-iron bg-obsidian/90 px-2 py-0.5 text-[11px] text-fog"
        title={`${active.kva} kVA · ${active.reverse ? "flux invers" : "consum"}`}
      >
        {active.nb.transformer_id} <span style={{ color: tone }}>{fmt(active.loadingPct, 0)}%</span>
      </div>
    </div>
  );
}
