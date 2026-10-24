import type { ReactNode } from "react";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Small Altitude data marks: hairline tracks, status colour only where it carries meaning.
 * Every number drawn here is passed in by the caller from the engine verdicts.
 */
export type Tone = "bone" | "fog" | "critical" | "warning" | "success" | "voltage";

export const toneText: Record<Tone, string> = {
  bone: "text-bone",
  fog: "text-fog",
  critical: "text-critical",
  warning: "text-warning",
  success: "text-success",
  voltage: "text-voltage",
};
export const toneBg: Record<Tone, string> = {
  bone: "bg-bone",
  fog: "bg-smoke",
  critical: "bg-critical",
  warning: "bg-warning",
  success: "bg-success",
  voltage: "bg-voltage",
};
const zoneBg = { warning: "bg-warning-soft", critical: "bg-critical-soft" } as const;

export const pctOf = (v: number, min: number, max: number) =>
  Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));

/** Label anchored on a % position, kept inside the track near its ends. */
export function Pin({
  at,
  className,
  children,
}: {
  at: number;
  className?: string;
  children: ReactNode;
}) {
  const align = at < 12 ? "translate-x-0" : at > 88 ? "-translate-x-full" : "-translate-x-1/2";
  return (
    <span className={cn("absolute whitespace-nowrap", align, className)} style={{ left: `${at}%` }}>
      {children}
    </span>
  );
}

export interface Marker {
  value: number;
  label: string;
  tone?: Tone;
  side?: "top" | "bottom";
}

/** A value scale (volts, % SoC …) with tinted zones, a hairline limit and labelled markers. */
export function ScaleBar({
  min,
  max,
  zones = [],
  markers = [],
  limit,
  span,
  hatch,
  label,
}: {
  min: number;
  max: number;
  zones?: { from: number; to: number; tone: keyof typeof zoneBg }[];
  markers?: Marker[];
  limit?: { value: number; label: string } | undefined;
  /** highlighted stretch between two values (e.g. the internal cable rise); caller labels it */
  span?: { from: number; to: number; label: string; tone?: Tone } | undefined;
  /** hatched segment (e.g. battery energy locked behind the reserve) */
  hatch?: { from: number; to: number } | undefined;
  label: string;
}) {
  const top = markers.filter((m) => m.side !== "bottom");
  const bottom = markers.filter((m) => m.side === "bottom");
  return (
    <div role="img" aria-label={label} className="relative pb-5 pt-5">
      <div className="relative h-2 rounded-[2px] bg-slate">
        {zones.map((z) => (
          <span
            key={z.from}
            className={cn("absolute inset-y-0", zoneBg[z.tone])}
            style={{
              left: `${pctOf(z.from, min, max)}%`,
              width: `${pctOf(z.to, min, max) - pctOf(z.from, min, max)}%`,
            }}
          />
        ))}
        {hatch && (
          <span
            className="hatch absolute inset-y-0 border-x border-warning"
            style={{
              left: `${pctOf(hatch.from, min, max)}%`,
              width: `${pctOf(hatch.to, min, max) - pctOf(hatch.from, min, max)}%`,
            }}
          />
        )}
        {span && (
          <span
            title={span.label}
            className={cn(
              "absolute top-1/2 h-[3px] -translate-y-1/2",
              toneBg[span.tone ?? "warning"],
            )}
            style={{
              left: `${pctOf(Math.min(span.from, span.to), min, max)}%`,
              width: `${Math.abs(pctOf(span.to, min, max) - pctOf(span.from, min, max))}%`,
            }}
          />
        )}
        {limit && (
          <span
            className="absolute -inset-y-1.5 w-px bg-critical"
            style={{ left: `${pctOf(limit.value, min, max)}%` }}
          />
        )}
        {markers.map((m) => (
          <span
            key={m.label}
            className={cn(
              "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-graphite",
              toneBg[m.tone ?? "bone"],
            )}
            style={{ left: `${pctOf(m.value, min, max)}%` }}
          />
        ))}
      </div>
      {top.map((m) => (
        <Pin
          key={m.label}
          at={pctOf(m.value, min, max)}
          className={cn("num top-0 text-[11px]", toneText[m.tone ?? "bone"])}
        >
          {m.label}
        </Pin>
      ))}
      {bottom.map((m) => (
        <Pin
          key={m.label}
          at={pctOf(m.value, min, max)}
          className={cn("num bottom-0 text-[11px]", toneText[m.tone ?? "bone"])}
        >
          {m.label}
        </Pin>
      ))}
      {limit && !bottom.length && (
        <Pin at={pctOf(limit.value, min, max)} className="num bottom-0 text-[10.5px] text-critical">
          {limit.label}
        </Pin>
      )}
    </div>
  );
}

export interface BarRow {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  tone?: Tone;
}

/** Horizontal bars on one shared scale, so a missing quantity reads as a visibly shorter bar. */
export function CompareBars({ rows, max }: { rows: BarRow[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <dl className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[minmax(0,7.5rem)_1fr_4.5rem] items-center gap-3"
        >
          <dt className="truncate text-[12px] text-fog">{r.label}</dt>
          <div className="h-2 rounded-[2px] bg-slate">
            <div
              className={cn("h-full rounded-[2px]", toneBg[r.tone ?? "bone"])}
              style={{ width: `${pctOf(r.value, 0, top)}%` }}
            />
          </div>
          <dd className={cn("num text-right text-[12.5px]", toneText[r.tone ?? "bone"])}>
            {fmt(r.value, r.decimals ?? 0)}
            {r.unit && <span className="text-[11px] text-fog"> {r.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
