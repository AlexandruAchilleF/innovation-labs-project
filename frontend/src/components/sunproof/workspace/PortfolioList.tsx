import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import type { HouseholdSummary, PortfolioSummaryMetrics, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusDot } from "./SeverityTag";

const TILES: { label: string; hint: string; test: (h: HouseholdSummary) => boolean }[] = [
  {
    label: "Supratensiune",
    hint: "Invertoare deconectate de protecția la supratensiune (rețea JT sau instalație interioară)",
    test: (h) =>
      h.scenario_code === "GRID_OVERVOLTAGE" || h.scenario_code === "LOCAL_OVERVOLTAGE_SENSITIVITY",
  },
  {
    label: "Stocare blocată",
    hint: "SoC minim configurat peste cel solicitat: bateria nu se descarcă în vârful de seară",
    test: (h) => h.scenario_code === "MISCONFIGURED_MODE",
  },
  {
    label: "Export nefacturat",
    hint: "Facturi care nu compensează integral energia injectată măsurată",
    test: (h) => h.scenario_code === "MISSING_EXPORT_INDEX",
  },
];
const RANK: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2, OK: 3 };

export function PortfolioList({
  households,
  metrics,
  selected,
  onSelect,
}: {
  households: HouseholdSummary[] | undefined;
  metrics?: PortfolioSummaryMetrics | undefined;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (households ?? [])
      .filter((h) => filter === null || TILES[filter]!.test(h))
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
      <div className="shrink-0 space-y-3 border-b border-border px-4 py-3">
        {metrics && (
          <p className="num text-[12px] text-fog">
            <span className="text-[15px] text-bone">
              {fmt(metrics.fleet_total_supplier_monthly_value_ron)}
            </span>{" "}
            RON/lună recuperabili
          </p>
        )}
        <div role="group" aria-label="Abateri în portofoliu" className="grid grid-cols-3 gap-1.5">
          {TILES.map((t, i) => {
            const n = (households ?? []).filter(t.test).length;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => setFilter(filter === i ? null : i)}
                aria-pressed={filter === i}
                title={`${t.hint} · apasă pentru a filtra lista`}
                className={cn(
                  "rounded-[4px] border px-2 py-1.5 text-left transition-colors hover:bg-slate",
                  filter === i ? "border-voltage bg-slate" : "border-iron",
                )}
              >
                <span
                  className={cn(
                    "num block text-[18px] leading-tight",
                    n ? "text-bone" : "text-fog",
                  )}
                >
                  {n}
                </span>
                <span className="block text-[11px] leading-tight text-fog">{t.label}</span>
              </button>
            );
          })}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filtrează portofoliul"
          placeholder="Caută după nume, ID sau oraș…"
          className="h-8 w-full rounded-[4px] border border-iron bg-graphite px-3 text-[12.5px] text-bone outline-none placeholder:text-fog focus:border-voltage"
        />
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {rows.map((h) => (
          <li key={h.household_id}>
            <button
              onClick={() => onSelect(h.household_id)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-1.5 text-left transition-colors hover:bg-slate",
                h.household_id === selected && "bg-iron hover:bg-iron",
              )}
            >
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-bone">
                {h.customer_name}
              </span>
              <span className="shrink-0 text-[11.5px] text-fog">{h.city}</span>
              <StatusDot s={h.overall_severity} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
