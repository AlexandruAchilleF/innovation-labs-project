import { memo } from "react";
import type { HouseStatus } from "@/lib/geo";

/** Top-down 2D roof with its PV array: module count follows installed kWp, module tone follows inverter state. */
export interface SolarRoofProps {
  pvKw: number;
  status: HouseStatus;
  /** 0-1 irradiance, dims the modules toward dusk */
  sun: number;
  hasBattery?: boolean | undefined;
  selected?: boolean | undefined;
  monitored?: boolean | undefined;
  size?: number;
  /** Street bearing in degrees, so roofs line up along the feeder */
  rotation?: number;
  title?: string;
}

const MODULE_KWP = 0.45;
const COLS = 6;

const moduleFill: Record<HouseStatus, string> = {
  night: "var(--obsidian)",
  normal: "var(--navy)",
  derating: "var(--warning)",
  trip: "var(--critical)",
};

export const SolarRoof = memo(function SolarRoof({
  pvKw,
  status,
  sun,
  hasBattery,
  selected,
  monitored,
  size = 40,
  rotation = 0,
  title,
}: SolarRoofProps) {
  const modules = Math.max(0, Math.min(36, Math.round(pvKw / MODULE_KWP)));
  const rows = Math.max(1, Math.ceil(modules / COLS));
  // 100 x 80 roof; array sits on the south slope (lower half) and grows up the roof as kWp rises
  const W = 100;
  const H = 80;
  const mw = 12.4;
  const mh = Math.min(9, 54 / rows);
  const x0 = (W - COLS * mw) / 2;
  const y0 = H - 8 - rows * mh;
  const active = status === "normal" || status === "derating";
  const opacity = status === "night" ? 1 : status === "trip" ? 0.85 : 0.55 + 0.45 * sun;
  const outline = selected ? "var(--voltage)" : monitored ? "var(--bone)" : "var(--pewter)";

  return (
    <svg
      width={size}
      height={size * (H / W)}
      viewBox={`-6 -6 ${W + 12} ${H + 12}`}
      style={{ transform: `rotate(${rotation}deg)`, overflow: "visible" }}
      role="img"
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {selected && (
        <rect
          x={-5}
          y={-5}
          width={W + 10}
          height={H + 10}
          rx={6}
          fill="none"
          stroke="var(--voltage)"
          strokeWidth={2.5}
          strokeDasharray="6 4"
        />
      )}
      {/* roof footprint + hip lines */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        rx={3}
        fill="var(--slate)"
        stroke={outline}
        strokeWidth={selected ? 3 : 1.6}
      />
      <path
        d={`M0 0 L22 ${H / 2} L${W - 22} ${H / 2} L${W} 0 M0 ${H} L22 ${H / 2} M${W} ${H} L${W - 22} ${H / 2}`}
        fill="none"
        stroke="var(--iron)"
        strokeWidth={1.4}
      />
      {/* PV modules */}
      <g opacity={opacity}>
        {Array.from({ length: modules }, (_, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          return (
            <rect
              key={i}
              x={x0 + c * mw + 0.8}
              y={y0 + r * mh + 0.8}
              width={mw - 1.6}
              height={mh - 1.6}
              fill={moduleFill[status]}
              stroke={active ? "var(--fog)" : "var(--smoke)"}
              strokeWidth={0.5}
            />
          );
        })}
      </g>
      {status === "trip" && modules > 0 && (
        <path
          d={`M${x0} ${y0} L${x0 + COLS * mw} ${y0 + rows * mh} M${x0 + COLS * mw} ${y0} L${x0} ${y0 + rows * mh}`}
          stroke="var(--obsidian)"
          strokeWidth={3}
        />
      )}
      {hasBattery && (
        <g>
          <rect
            x={W - 16}
            y={6}
            width={10}
            height={16}
            rx={1.5}
            fill="var(--obsidian)"
            stroke="var(--fog)"
            strokeWidth={1.2}
          />
          <rect x={W - 13} y={3} width={4} height={3} fill="var(--fog)" />
        </g>
      )}
    </svg>
  );
});
