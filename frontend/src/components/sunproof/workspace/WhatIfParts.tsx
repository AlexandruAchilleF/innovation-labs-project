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
  // [label, before, after, decimals, unit, scale floor]: bars share one scale per metric
  const rows: [string, number, number, number, string, number][] = [
    ["Tensiune maximă", sim.before.peak_voltage_v, sim.after.peak_voltage_v, 1, " V", 230],
    ["Case deconectate", sim.before.houses_tripped, sim.after.houses_tripped, 0, "", 0],
    ["Vârf încărcare trafo", peak(sim.before, kvaBefore), peak(sim.after, kvaAfter), 0, "%", 0],
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
      <dl className="space-y-3 pt-1">
        {rows.map(([k, b, a, dec, u, lo]) => {
          const hi = Math.max(b, a, lo + 1);
          const w = (v: number) => `${Math.max(2, ((v - lo) / (hi - lo)) * 100)}%`;
          return (
            <div key={k}>
              <dt className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="text-fog">{k}</span>
                <span className="num">
                  <span className="text-fog">{fmt(b, dec)}</span>
                  <span className="text-smoke"> → </span>
                  <span className={a < b ? "text-success" : a > b ? "text-critical" : "text-fog"}>
                    {fmt(a, dec)}
                    {u}
                  </span>
                </span>
              </dt>
              <dd className="mt-1 space-y-0.5" aria-hidden>
                <span className="block h-1 rounded-[2px] bg-smoke" style={{ width: w(b) }} />
                <span
                  className={cn("block h-1 rounded-[2px]", a <= b ? "bg-bone" : "bg-critical")}
                  style={{ width: w(a) }}
                />
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
