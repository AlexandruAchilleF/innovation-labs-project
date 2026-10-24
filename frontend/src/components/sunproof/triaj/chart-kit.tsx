import type { ReactNode } from "react";
import { clock } from "@/lib/energy-day";
import { cn } from "@/lib/utils";

/** Shared look for the detailed-analysis day charts: numeric minute axis, hour ticks, direct legend. */
export const AXIS = {
  stroke: "var(--smoke)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  fontFamily: "var(--font-mono)",
} as const;

export const xMinutes = (from: number, to: number, everyH = 2) => ({
  dataKey: "m",
  type: "number" as const,
  domain: [from, to],
  ticks: Array.from(
    { length: Math.floor((to - from) / (everyH * 60)) + 1 },
    (_, i) => from + i * everyH * 60,
  ),
  tickFormatter: (m: number) => clock(m).slice(0, 5),
  allowDataOverflow: true,
  ...AXIS,
});

export interface LegendItem {
  color: string;
  label: string;
  kind?: "line" | "dash" | "area";
}

/** Card with the chart's conclusion as its title: the reader gets the point before reading axes. */
export function ChartFrame({
  eyebrow,
  takeaway,
  tone = "text-bone",
  legend,
  children,
  className,
}: {
  eyebrow: string;
  takeaway: ReactNode;
  tone?: string;
  legend: LegendItem[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2 className="eyebrow text-fog">{eyebrow}</h2>
          <p className={cn("mt-1 text-[15px] leading-snug", tone)}>{takeaway}</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fog">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block w-3.5",
                  l.kind === "dash" && "border-t border-dashed",
                  l.kind === "area" && "h-2.5 rounded-[2px]",
                  (!l.kind || l.kind === "line") && "h-[2px] rounded-full",
                )}
                style={l.kind === "dash" ? { borderColor: l.color } : { background: l.color }}
              />
              {l.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface TipProps {
  active?: boolean;
  label?: number;
  payload?: { payload: Record<string, unknown> }[];
  rows: (r: Record<string, unknown>) => [string, string | null][];
}

/** Tooltip body: time on top, then label/value pairs; rows returning null are skipped. */
export function ChartTip({ active, label, payload, rows }: TipProps) {
  const r = payload?.[0]?.payload;
  if (!active || !r || label == null) return null;
  return (
    <div className="rounded-[4px] border border-iron bg-obsidian px-3 py-2 text-[12px]">
      <div className="num text-fog">{clock(label).slice(0, 5)}</div>
      {rows(r)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 text-bone">
            <span className="text-fog">{k}</span>
            <span className="num">{v}</span>
          </div>
        ))}
    </div>
  );
}

/** Contiguous [start, end] minute ranges where `hit` holds. */
export function ranges<T extends { m: number }>(rows: T[], hit: (r: T) => boolean, step = 5) {
  const out: [number, number][] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (!hit(r)) continue;
    if (last && r.m - last[1] <= step) last[1] = r.m;
    else out.push([r.m, r.m]);
  }
  return out;
}
