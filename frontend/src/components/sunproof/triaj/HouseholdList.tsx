import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HouseholdSummary, Severity } from "@/lib/types";
import { StatusBadge } from "../primitives";

const accent: Record<Severity, string> = {
  CRITICAL: "border-l-critical",
  WARNING: "border-l-warning",
  OK: "border-l-success",
  INFO: "border-l-info",
};

export function HouseholdList({ households, selected, onSelect }: { households: HouseholdSummary[]; selected: string; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<"demo" | "all">("demo");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return households
      .filter((h) => (filter === "demo" ? h.is_flagship : true))
      .filter((h) => !term || `${h.customer_name} ${h.city} ${h.household_id} ${h.scenario_badge_ro}`.toLowerCase().includes(term));
  }, [households, filter, q]);

  return (
    <aside className="flex max-h-[calc(100vh-160px)] flex-col overflow-hidden rounded-xl border border-border bg-card lg:sticky lg:top-[112px]">
      <div className="space-y-2 border-b border-border p-2.5">
        <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5 text-[12px] font-medium">
          {(["demo", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("flex items-center justify-center gap-1 rounded-md px-2 py-1.5 transition-colors", filter === f ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {f === "demo" ? (
                <>
                  <Star className="size-3 fill-sun text-sun" /> 5 Cazuri Demo
                </>
              ) : (
                <>Toată Flota ({households.length})</>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută client, oraș, ID…" className="h-8 pl-8 text-[12.5px]" />
        </div>
      </div>
      <ul className="flex-1 divide-y divide-border overflow-y-auto">
        {list.map((h) => (
          <li key={h.household_id}>
            <button
              onClick={() => onSelect(h.household_id)}
              className={cn("w-full border-l-4 px-3 py-2 text-left transition-colors", accent[h.overall_severity], selected === h.household_id ? "bg-muted" : "hover:bg-muted/50")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-semibold">{h.customer_name}</span>
                <StatusBadge severity={h.overall_severity} />
              </div>
              <div className="num mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">
                  {h.city} · {fmt(h.installed_pv_kw ?? 0, 1)} kWp
                </span>
                {h.monthly_impact_ron > 0 ? (
                  <span className="shrink-0 rounded bg-success-soft px-1.5 py-px font-medium text-success">+{fmt(h.monthly_impact_ron)} RON</span>
                ) : (
                  <span className="shrink-0">—</span>
                )}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{h.scenario_badge_ro}</div>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">Niciun rezultat.</li>}
      </ul>
    </aside>
  );
}
