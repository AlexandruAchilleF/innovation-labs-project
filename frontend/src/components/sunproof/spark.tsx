import { Home } from "lucide-react";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Pin, pctOf, toneBg, toneText, type Tone } from "./viz";

/**
 * Self-labelling marks: every line, limit and band is named on the mark itself, so no caption is needed.
 */
export interface DayPoint {
  m: number;
  v: number;
}

const W = 320;
const H = 100;

/** A day curve with a named limit line, a named shaded band and red stretches (e.g. inverter off). */
export function DayLine({
  points,
  min,
  max,
  from = 360,
  to = 1200,
  limit,
  band,
  danger = [],
  peak,
  unit,
  label,
}: {
  points: DayPoint[];
  min: number;
  max: number;
  from?: number;
  to?: number;
  limit?: { v: number; label: string; tone?: Tone };
  band?: { from: number; to: number; label: string };
  danger?: [number, number][];
  /** label the highest point with its value */
  peak?: boolean;
  unit: string;
  label: string;
}) {
  const x = (m: number) => (pctOf(m, from, to) / 100) * W;
  const y = (v: number) => H - (pctOf(v, min, max) / 100) * H;
  const pts = points.filter((p) => p.m >= from && p.m <= to);
  const d = pts.map((p) => `${x(p.m).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const top = pts.reduce<DayPoint | null>((a, p) => (!a || p.v > a.v ? p : a), null);
  const ltone = limit?.tone ?? "critical";
  const hours = [6, 9, 12, 15, 18, 21].filter((h) => h * 60 >= from && h * 60 <= to);
  return (
    <div role="img" aria-label={label} className="relative">
      <div className="relative h-24">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {band && (
            <rect
              x={x(band.from)}
              width={x(band.to) - x(band.from)}
              y={0}
              height={H}
              fill="var(--slate)"
            />
          )}
          {danger.map(([a, b]) => (
            <rect
              key={a}
              x={x(a)}
              width={Math.max(1.5, x(b) - x(a))}
              y={0}
              height={H}
              fill="var(--critical-soft)"
            />
          ))}
          {limit && (
            <line
              x1={0}
              x2={W}
              y1={y(limit.v)}
              y2={y(limit.v)}
              stroke={`var(--${ltone})`}
              strokeDasharray="4 3"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <polyline
            points={d}
            fill="none"
            stroke="var(--bone)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {band && (
          <span
            className="absolute top-0 text-[10.5px] text-fog"
            style={{ left: `${(x(band.from) / W) * 100}%`, paddingLeft: 4 }}
          >
            {band.label}
          </span>
        )}
        {limit && (
          <span
            className={cn(
              "num absolute right-0 -translate-y-full pb-0.5 text-[10.5px]",
              toneText[ltone],
            )}
            style={{ top: `${(y(limit.v) / H) * 100}%` }}
          >
            {limit.label}
          </span>
        )}
        {peak && top && (
          <span
            className="absolute -translate-x-1/2 -translate-y-full pb-1"
            style={{ left: `${(x(top.m) / W) * 100}%`, top: `${(y(top.v) / H) * 100}%` }}
          >
            <span className="num whitespace-nowrap text-[11px] text-bone">
              {fmt(top.v, 1)} {unit}
            </span>
          </span>
        )}
      </div>
      <div className="relative mt-1 h-3">
        {hours.map((h) => (
          <Pin key={h} at={pctOf(h * 60, from, to)} className="num text-[10px] text-smoke">
            {String(h).padStart(2, "0")}
          </Pin>
        ))}
      </div>
    </div>
  );
}

/** Tiny axis-less trend for tabs and list rows; the dashed line is the limit. */
export function Spark({
  values,
  limit,
  min,
  max,
  tone = "bone",
  className,
}: {
  values: number[];
  limit?: number;
  min: number;
  max: number;
  tone?: Tone;
  className?: string;
}) {
  const w = 80;
  const h = 22;
  const n = Math.max(1, values.length - 1);
  const y = (v: number) => h - (pctOf(v, min, max) / 100) * h;
  const d = values.map((v, i) => `${((i / n) * w).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("h-[22px] w-20 overflow-visible", className)}
      aria-hidden
    >
      {limit !== undefined && (
        <line
          x1={0}
          x2={w}
          y1={y(limit)}
          y2={y(limit)}
          stroke="var(--critical)"
          strokeDasharray="2 2"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <polyline
        points={d}
        fill="none"
        stroke={`var(--${tone === "fog" ? "smoke" : tone})`}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Houses on the same transformer: red ones went off in the same minute; the client is outlined. */
export function HouseRow({ hit, total }: { hit: number; total: number }) {
  return (
    <span className="flex flex-wrap items-end gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <Home
          key={i}
          strokeWidth={1.5}
          className={cn("size-4", i < hit ? "text-critical" : "text-iron")}
        />
      ))}
    </span>
  );
}

/** One bar split in labelled parts (where the produced energy went). */
export function SplitBar({ parts }: { parts: { label: string; value: number; tone: Tone }[] }) {
  const sum = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div>
      <div className="flex h-2 gap-px overflow-hidden rounded-[2px]">
        {shown.map((p) => (
          <span
            key={p.label}
            className={toneBg[p.tone]}
            style={{ width: `${(p.value / sum) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-px">
        {shown.map((p) => (
          <span
            key={p.label}
            className="min-w-0 truncate text-[11px]"
            style={{ width: `${(p.value / sum) * 100}%` }}
          >
            <span className="text-fog">{p.label} </span>
            <span className="num text-bone">{fmt(p.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
