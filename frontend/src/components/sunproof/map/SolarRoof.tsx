import { memo } from "react";
import { ArrowDown, ZapOff } from "lucide-react";
import type { HouseStatus } from "@/lib/geo";
import { Battery, Inverter, Meter, PvArray } from "./equipment";
import { MODULE_KWP } from "./equipment-geometry";

/**
 * Prosumer house in a 3/4 (cabinet oblique) view: gable roof with the PV array laid onto the south slope
 * (module count follows installed kWp, module tone follows inverter state), the inverter, battery and smart meter
 * on the facade, and a ground shadow. Drawn upright like a map sprite, so it is never rotated.
 */
export interface SolarRoofProps {
  pvKw: number;
  status: HouseStatus;
  /** 0-1 irradiance, dims the modules toward dusk */
  sun: number;
  hasBattery?: boolean | undefined;
  selected?: boolean | undefined;
  monitored?: boolean | undefined;
  size?: number;
  title?: string;
}

// Unit space. Depth recedes up-right; eave E0-E1 at y=67, ridge R0-R1 at y=36.
const VIEW = { x: -2, y: 14, w: 132, h: 92 };
const WALL = { x: 10, y: 64, w: 80, h: 30 };
const DEPTH = { x: 16, y: -12 };
const E0 = { x: 5, y: 67 };
const E1 = { x: 95, y: 67 };
const R0 = { x: 14, y: 36 };
const R1 = { x: 104, y: 36 };
const BACK_EAVE = { x: 113, y: 53.5 };
// Slope-local space: x 0..100 along the eave, y 0..50 from ridge down to eave (true proportions for the modules).
const SLOPE_MATRIX = `matrix(${(E1.x - E0.x) / 100} 0 ${(E0.x - R0.x) / 50} ${(E0.y - R0.y) / 50} ${R0.x} ${R0.y})`;
const ARRAY = { x: 4, y: 4, w: 92, h: 42 };
const TILES = Array.from({ length: 6 }, (_, i) => `M0 ${8 * (i + 1)}H100`).join("");
const pts = (...p: { x: number; y: number }[]) => p.map((q) => `${q.x},${q.y}`).join(" ");

export const SolarRoof = memo(function SolarRoof({
  pvKw,
  status,
  sun,
  hasBattery,
  selected,
  monitored,
  size = 48,
  title,
}: SolarRoofProps) {
  const modules = Math.max(0, Math.min(40, Math.round(pvKw / MODULE_KWP)));
  const producing = (status === "normal" || status === "derating") && sun > 0;
  const edge = selected ? "var(--voltage)" : monitored ? "var(--bone)" : "var(--obsidian)";
  const edgeW = selected ? 2.4 : 1.2;
  const { x: wx, y: wy, w: ww, h: wh } = WALL;
  const base = { x: wx, y: wy + wh };
  const ground = pts(
    { x: base.x - 10, y: base.y + 6 },
    { x: base.x + ww + 12, y: base.y + 6 },
    { x: base.x + ww + 12 + DEPTH.x * 1.6, y: base.y + 6 + DEPTH.y * 1.6 },
    { x: base.x - 10 + DEPTH.x * 1.6, y: base.y + 6 + DEPTH.y * 1.6 },
  );
  const height = size * (VIEW.h / VIEW.w);

  return (
    <span className="relative inline-block align-top" style={{ width: size, height }}>
      <svg
        width={size}
        height={height}
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        style={{ overflow: "visible" }}
        className="block"
        role="img"
        aria-label={title}
      >
        {title && <title>{title}</title>}
        {/* lot + cast shadow (sun from the south-west, shadow falls up-right) */}
        <polygon
          points={ground}
          fill="var(--obsidian)"
          opacity={selected ? 0.75 : 0.45}
          stroke={selected ? "var(--voltage)" : "none"}
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        <path
          d={`M${base.x + 4} ${base.y + 2}H${base.x + ww + 8}L${BACK_EAVE.x + 18} ${BACK_EAVE.y + 14}L${BACK_EAVE.x + 4} ${BACK_EAVE.y + 4}Z`}
          fill="var(--obsidian)"
          opacity={0.55}
        />

        {/* walls: lit facade, shaded east side, gable end */}
        <polygon
          points={pts(
            { x: wx + ww, y: wy },
            { x: wx + ww + DEPTH.x, y: wy + DEPTH.y },
            { x: wx + ww + DEPTH.x, y: wy + wh + DEPTH.y },
            { x: wx + ww, y: wy + wh },
          )}
          fill="var(--graphite)"
          stroke={edge}
          strokeWidth={edgeW * 0.6}
        />
        <polygon
          points={pts(E1, BACK_EAVE, R1)}
          fill="var(--slate)"
          stroke={edge}
          strokeWidth={edgeW * 0.6}
        />
        <rect
          x={wx}
          y={wy}
          width={ww}
          height={wh}
          fill="var(--iron)"
          stroke={edge}
          strokeWidth={edgeW * 0.6}
        />

        {/* south roof slope with tile courses and the PV array mapped onto it */}
        <polygon
          points={pts(E0, E1, R1, R0)}
          fill="var(--pewter)"
          stroke={edge}
          strokeWidth={edgeW}
          strokeLinejoin="round"
        />
        <g transform={SLOPE_MATRIX}>
          <path d={TILES} stroke="var(--smoke)" strokeWidth={0.9} />
          <PvArray count={modules} area={ARRAY} status={status} sun={sun} />
        </g>
        <path
          d={`M${R0.x} ${R0.y}H${R1.x}`}
          stroke="var(--fog)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path d={`M${E0.x} ${E0.y}H${E1.x}`} stroke="var(--obsidian)" strokeWidth={1.4} />
        {/* chimney on the back slope */}
        <path d="M76 25l3 -2.25h7l-3 2.25z" fill="var(--smoke)" />
        <path d="M83 25l3 -2.25V32l-3 2.25z" fill="var(--obsidian)" />
        <rect x={76} y={25} width={7} height={11} fill="var(--iron)" />

        {/* facade: inverter, battery (or window), door, smart meter */}
        <path
          d={`M27 ${E0.y}V72`}
          stroke={producing ? "var(--bone)" : "var(--smoke)"}
          strokeWidth={1.6}
          className={producing ? "flow-dash" : undefined}
          style={producing ? { strokeDasharray: "3 3" } : undefined}
        />
        <Inverter x={16} y={72} status={status} />
        {hasBattery ? (
          <>
            <path d="M38 84H42" stroke="var(--smoke)" strokeWidth={1.2} />
            <Battery x={42} y={76} />
          </>
        ) : (
          <g>
            <rect
              x={42}
              y={71}
              width={13}
              height={11}
              fill="var(--obsidian)"
              stroke="var(--fog)"
              strokeWidth={0.8}
            />
            <path d="M48.5 71v11M42 76.5h13" stroke="var(--pewter)" strokeWidth={0.8} />
          </g>
        )}
        <rect
          x={58}
          y={75}
          width={11}
          height={19}
          fill="var(--obsidian)"
          stroke="var(--smoke)"
          strokeWidth={0.8}
        />
        <circle cx={66.5} cy={85} r={0.9} fill="var(--fog)" />
        {monitored && <Meter cx={80.5} cy={77} />}
      </svg>
      {(status === "trip" || status === "derating") && size >= 28 && (
        <span
          className={
            "pointer-events-none absolute right-0 top-0 flex size-4 items-center justify-center rounded-full border border-obsidian " +
            (status === "trip" ? "bg-critical" : "bg-warning")
          }
        >
          {status === "trip" ? (
            <ZapOff className="size-2.5 text-obsidian" strokeWidth={2.5} />
          ) : (
            <ArrowDown className="size-2.5 text-obsidian" strokeWidth={2.5} />
          )}
        </span>
      )}
    </span>
  );
});
