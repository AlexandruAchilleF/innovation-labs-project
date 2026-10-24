import type { ReactNode } from "react";
import { transformerDay } from "@/lib/geo";
import { fmt } from "@/lib/format";
import type { GridState, GridWhatIfResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { CompareView } from "@/routes/harta";

export function Step({
  title,
  value,
  children,
}: {
  title: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-fog">{title}</span>
        {value && <span className="num text-bone">{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function Compare({
  sim,
  view,
  onView,
  kvaBefore,
  kvaAfter,
}: {
  sim: GridWhatIfResult;
  view: CompareView;
  onView: (v: CompareView) => void;
  kvaBefore: number;
  kvaAfter: number;
}) {
  const peak = (s: GridState, kva: number) =>
    Math.max(...transformerDay(s, kva).map((x) => x.loading_pct));
  const rows: [string, number, number, number, string][] = [
    ["Case oprite (≥253 V)", sim.before.houses_tripped, sim.after.houses_tripped, 0, ""],
    ["Tensiune maximă", sim.before.peak_voltage_v, sim.after.peak_voltage_v, 1, " V"],
    ["Vârf încărcare trafo", peak(sim.before, kvaBefore), peak(sim.after, kvaAfter), 0, "%"],
  ];
  return (
    <div className="mt-4 space-y-2">
      <div className="grid grid-cols-2 gap-1">
        {(["before", "after"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={cn(
              "rounded-[4px] border py-1 text-[12px]",
              view === v ? "border-voltage text-bone" : "border-iron text-fog hover:text-bone",
            )}
          >
            Pe hartă: {v === "before" ? "înainte" : "după"}
          </button>
        ))}
      </div>
      <dl className="space-y-1 text-[12.5px]">
        {rows.map(([k, b, a, dec, u]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-fog">{k}</dt>
            <dd className="num">
              <span className="text-fog">{fmt(b, dec)}</span> →{" "}
              <span className={a < b ? "text-bone" : a > b ? "text-critical" : "text-fog"}>
                {fmt(a, dec)}
                {u}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
