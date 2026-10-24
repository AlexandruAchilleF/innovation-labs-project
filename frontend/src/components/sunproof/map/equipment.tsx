import type { HouseStatus } from "@/lib/geo";
import { layoutArray, ledFill, moduleFill, type Box } from "./equipment-geometry";

/**
 * Top-down 2D models of the prosumer's equipment, drawn in a shared SVG unit space (roof = 100 wide).
 * Colour carries state only: module tone and inverter LED follow the inverter status, everything else is achromatic.
 */

/** PV array: aluminium-framed modules with a half-cut cell grid and a glass glint that follows irradiance. */
export function PvArray({
  count,
  area,
  status,
  sun,
}: {
  count: number;
  area: Box;
  status: HouseStatus;
  sun: number;
}) {
  if (count <= 0) return null;
  const { cols, rows, mw, mh, x0, y0 } = layoutArray(count, area);
  let frames = "";
  let cells = "";
  let glint = "";
  for (let i = 0; i < count; i++) {
    const x = x0 + (i % cols) * mw + 0.6;
    const y = y0 + Math.floor(i / cols) * mh + 0.6;
    const w = mw - 1.2;
    const h = mh - 1.2;
    frames += `M${x} ${y}h${w}v${h}h${-w}Z`;
    cells += `M${x + w / 2} ${y}v${h}M${x} ${y + h / 3}h${w}M${x} ${y + (2 * h) / 3}h${w}`;
    glint += `M${x} ${y}h${w * 0.55}L${x} ${y + h * 0.45}Z`;
  }
  const lit = status === "normal" || status === "derating";
  const opacity = status === "night" ? 1 : status === "trip" ? 0.85 : 0.6 + 0.4 * sun;
  const thin = Math.max(0.3, Math.min(0.6, mw / 22));
  return (
    <g opacity={opacity}>
      <path d={frames} fill={moduleFill[status]} stroke="var(--fog)" strokeWidth={thin * 1.4} />
      <path d={cells} stroke="var(--obsidian)" strokeOpacity={0.55} strokeWidth={thin} />
      {lit && sun > 0.15 && <path d={glint} fill="var(--bone)" opacity={0.08 + 0.14 * sun} />}
      {status === "trip" && (
        <path
          d={`M${x0} ${y0}L${x0 + cols * mw} ${y0 + rows * mh}M${x0 + cols * mw} ${y0}L${x0} ${y0 + rows * mh}`}
          stroke="var(--obsidian)"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/** Lit top and shaded right face of a box, so wall-mounted and standing gear reads as a volume. */
function BoxDepth({ x, y, w, h, d }: { x: number; y: number; w: number; h: number; d: number }) {
  return (
    <>
      <path
        d={`M${x} ${y}l${d} ${-d * 0.75}h${w}l${-d} ${d * 0.75}z`}
        fill="var(--pewter)"
        stroke="var(--fog)"
        strokeWidth={0.6}
      />
      <path
        d={`M${x + w} ${y}l${d} ${-d * 0.75}v${h}l${-d} ${d * 0.75}z`}
        fill="var(--obsidian)"
        stroke="var(--fog)"
        strokeWidth={0.6}
      />
    </>
  );
}

/** String inverter: finned enclosure, AC sine on the front, status LED. */
export function Inverter({ x, y, status }: { x: number; y: number; status: HouseStatus }) {
  const w = 22;
  const h = 17;
  return (
    <g>
      <BoxDepth x={x} y={y} w={w} h={h} d={3} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="var(--graphite)"
        stroke="var(--fog)"
        strokeWidth={1.1}
      />
      <path
        d={`M${x + 3} ${y + 2.5}v${h - 5}M${x + 5} ${y + 2.5}v${h - 5}`}
        stroke="var(--pewter)"
        strokeWidth={0.9}
      />
      {status === "trip" ? (
        <path
          d={`M${x + 9} ${y + 5}l7 7M${x + 16} ${y + 5}l-7 7`}
          stroke="var(--critical)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M${x + 8} ${y + 9.5}q2 -5 4 0t4 0`}
          fill="none"
          stroke={status === "night" ? "var(--smoke)" : "var(--bone)"}
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      )}
      <circle cx={x + w - 3} cy={y + 3} r={1.8} fill={ledFill[status]} />
    </g>
  );
}

/** Home battery: free-standing cabinet with a bolt on the front. */
export function Battery({ x, y }: { x: number; y: number }) {
  const w = 13;
  const h = 18;
  return (
    <g>
      <BoxDepth x={x} y={y} w={w} h={h} d={4} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="var(--graphite)"
        stroke="var(--fog)"
        strokeWidth={1.1}
      />
      <path d={`M${x + 7.5} ${y + 3}l-3.5 6h3l-1.5 5l4 -7h-3z`} fill="var(--bone)" />
    </g>
  );
}

/** Smart meter (the SunProof measuring point): round housing with a register window. */
export function Meter({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={8.5}
        fill="var(--graphite)"
        stroke="var(--bone)"
        strokeWidth={1.1}
      />
      <rect
        x={cx - 5}
        y={cy - 3.5}
        width={10}
        height={4}
        rx={0.6}
        fill="var(--obsidian)"
        stroke="var(--fog)"
        strokeWidth={0.6}
      />
      <path
        d={`M${cx - 3.5} ${cy + 3.5}h7`}
        stroke="var(--fog)"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </g>
  );
}

export type EquipmentKind = "pv" | "inverter" | "battery" | "meter";

/** Stand-alone 20 px glyph for legends and lists. */
export function EquipmentIcon({
  kind,
  status = "normal",
}: {
  kind: EquipmentKind;
  status?: HouseStatus;
}) {
  return (
    <svg width={20} height={20} viewBox="-2 -2 28 28" className="block shrink-0" aria-hidden>
      {kind === "pv" && (
        <PvArray count={4} area={{ x: 0, y: 2, w: 24, h: 20 }} status={status} sun={0.9} />
      )}
      {kind === "inverter" && <Inverter x={1} y={3.5} status={status} />}
      {kind === "battery" && <Battery x={5.5} y={5} />}
      {kind === "meter" && <Meter cx={12} cy={12} />}
    </svg>
  );
}

/** Low-zoom house pictogram in the same 3/4 view: PV roof tinted by inverter state, status-lit facade, battery box. */
export function HousePin({
  status,
  selected,
  monitored,
  hasBattery,
}: {
  status: HouseStatus;
  selected?: boolean | undefined;
  monitored?: boolean | undefined;
  hasBattery?: boolean | undefined;
}) {
  const edge = selected ? "var(--voltage)" : monitored ? "var(--bone)" : "var(--obsidian)";
  return (
    <svg width={24} height={22} viewBox="0 0 24 22" className="block" aria-hidden>
      <path d="M3 20.5h16l4 -3H7z" fill="var(--obsidian)" opacity={0.5} />
      <path d="M17 20V12.5l4 -3V17z" fill="var(--graphite)" stroke={edge} strokeWidth={0.8} />
      <path d="M17 12.5l4 -3l-1 -5z" fill="var(--slate)" stroke={edge} strokeWidth={0.8} />
      <rect
        x={3}
        y={12.5}
        width={14}
        height={7.5}
        fill="var(--iron)"
        stroke={edge}
        strokeWidth={0.8}
      />
      <rect
        x={5}
        y={14.5}
        width={6}
        height={3}
        fill={ledFill[status]}
        opacity={status === "night" ? 0.6 : 1}
      />
      <path
        d="M1.5 13.5h17L20 4.5H3.5z"
        fill={moduleFill[status]}
        stroke={edge}
        strokeWidth={selected ? 1.6 : 1}
        strokeLinejoin="round"
      />
      <path
        d="M2.7 9h16.6M7.5 4.5l-1.8 9M12 4.5l-1.5 9M16.3 4.5l-1.3 9"
        stroke="var(--fog)"
        strokeWidth={0.4}
      />
      {hasBattery && <rect x={19} y={17} width={3} height={4} fill="var(--fog)" />}
    </svg>
  );
}
