import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import type { HouseholdSummary, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sevText } from "./SeverityTag";

const FILTERS: [string, (h: HouseholdSummary) => boolean][] = [
  ["Toate", () => true],
  ["Rețea", (h) => h.scenario_code === "GRID_OVERVOLTAGE"],
  ["Local", (h) => h.scenario_code === "LOCAL_OVERVOLTAGE_SENSITIVITY"],
  ["Baterie", (h) => h.scenario_code === "MISCONFIGURED_MODE"],
  ["Factură", (h) => h.scenario_code === "MISSING_EXPORT_INDEX"],
];
const RANK: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2, OK: 3 };

export function PortfolioList({
  households,
  selected,
  onSelect,
}: {
  households: HouseholdSummary[] | undefined;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState(0);
  const [q, setQ] = useState("");
  const nameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of households ?? []) {
      counts.set(h.customer_name, (counts.get(h.customer_name) ?? 0) + 1);
    }
    return counts;
  }, [households]);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (households ?? [])
      .filter(FILTERS[filter]![1])
      .filter(
        (h) => !t || `${h.household_id} ${h.customer_name} ${h.city}`.toLowerCase().includes(t),
      )
      .sort(
        (x, y) =>
          RANK[x.overall_severity] - RANK[y.overall_severity] ||
          y.monthly_impact_ron - x.monthly_impact_ron,
      );
  }, [households, filter, q]);
  return (
    <>
      <div className="shrink-0 space-y-2 border-b border-border px-4 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filtrează portofoliul"
          placeholder="Filtrează după nume, ID sau oraș…"
          className="h-9 w-full rounded-[4px] border border-iron bg-graphite px-3 text-[13px] text-bone outline-none placeholder:text-fog focus:border-voltage"
        />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(([l], i) => (
            <button
              key={l}
              onClick={() => setFilter(i)}
              aria-pressed={filter === i}
              className={cn(
                "rounded-[4px] border px-2 py-1 text-[12px]",
                filter === i ? "border-voltage text-bone" : "border-iron text-fog hover:text-bone",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-[1fr_auto] border-b border-border px-4 py-1.5">
        <span className="eyebrow">Client · {rows.length}</span>
        <span
          className="eyebrow"
          title="Suma dintre beneficiul lunar furnizor și beneficiul lunar client"
        >
          Furnizor + client (RON/lună)
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((h) => {
          const dup = (nameCounts.get(h.customer_name) ?? 0) > 1;
          return (
            <button
              key={h.household_id}
              onClick={() => onSelect(h.household_id)}
              className={cn(
                "grid w-full grid-cols-[1fr_auto] items-center gap-2 border-b border-border px-4 py-2.5 text-left transition-colors odd:bg-transparent even:bg-graphite hover:bg-slate",
                h.household_id === selected && "!bg-iron",
              )}
            >
              <span className="min-w-0">
                <span className="flex items-baseline gap-1.5 truncate text-[13px] text-bone">
                  <span className="truncate">{h.customer_name}</span>
                  {dup && (
                    <span className="num shrink-0 rounded-[4px] border border-iron bg-obsidian px-1.5 py-0.5 text-[11px] font-medium text-bone">
                      {h.household_id}
                    </span>
                  )}
                </span>
                <span className="block truncate text-[11px] text-fog">
                  {!dup && (
                    <>
                      <span className="num">{h.household_id}</span> ·{" "}
                    </>
                  )}
                  {h.city} ·{" "}
                  <span className={sevText[h.overall_severity]}>{h.scenario_badge_ro}</span>
                </span>
              </span>
              <span className="num text-[12px] text-bone">{fmt(h.monthly_impact_ron)}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
