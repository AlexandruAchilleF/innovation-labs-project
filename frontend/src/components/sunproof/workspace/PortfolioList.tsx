import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import { useOpenTickets } from "@/lib/tickets";
import type { HouseholdSummary, PortfolioSummaryMetrics, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sevText } from "./SeverityTag";

const TILES: { label: string; hint: string; test: (h: HouseholdSummary) => boolean }[] = [
  {
    label: "Opriri la prânz",
    hint: "Invertoare deconectate de supratensiune (rețea sau instalație)",
    test: (h) =>
      h.scenario_code === "GRID_OVERVOLTAGE" || h.scenario_code === "LOCAL_OVERVOLTAGE_SENSITIVITY",
  },
  {
    label: "Baterii blocate",
    hint: "Baterii care nu livrează în vârful de seară",
    test: (h) => h.scenario_code === "MISCONFIGURED_MODE",
  },
  {
    label: "Facturi greșite",
    hint: "Facturi care nu compensează exportul măsurat",
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
  const openTickets = useOpenTickets();
  const ticketed = useMemo(() => new Set(openTickets.map((t) => t.household_id)), [openTickets]);
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
          <p className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="text-fog">Valoare recuperabilă / lună</span>
            <span className="num text-bone">
              {fmt(metrics.fleet_total_supplier_monthly_value_ron)}
              <span className="text-[11px] text-fog"> RON furnizor</span>
              {" · "}
              {fmt(metrics.fleet_total_customer_monthly_value_ron)}
              <span className="text-[11px] text-fog"> RON clienți</span>
            </span>
          </p>
        )}
        <div role="group" aria-label="Probleme în portofoliu" className="grid grid-cols-3 gap-1.5">
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
      <div className="grid shrink-0 grid-cols-[1fr_auto] border-b border-border px-4 py-1.5">
        <span className="eyebrow">
          {filter === null ? "Toți clienții" : TILES[filter]!.label} · {rows.length}
        </span>
        <span
          className="eyebrow"
          title="Suma dintre beneficiul lunar furnizor și beneficiul lunar client"
        >
          Impact RON/lună
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
                  {ticketed.has(h.household_id) && (
                    <span className="eyebrow shrink-0 rounded-[4px] border border-voltage/70 px-1.5 py-0.5 text-[10px] text-bone">
                      Tichet activ
                    </span>
                  )}
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
