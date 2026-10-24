import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HouseholdSummary, Severity } from "@/lib/types";

const RANK: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2, OK: 3 };

export function HouseholdList({
  households,
  selected,
  onSelect,
}: {
  households: HouseholdSummary[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"demo" | "all">("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return households
      .filter((h) => (filter === "demo" ? h.is_flagship : true))
      .filter(
        (h) =>
          !term ||
          `${h.customer_name} ${h.city} ${h.household_id} ${h.scenario_badge_ro}`
            .toLowerCase()
            .includes(term),
      )
      .sort(
        (x, y) =>
          RANK[x.overall_severity] - RANK[y.overall_severity] ||
          y.monthly_impact_ron - x.monthly_impact_ron,
      );
  }, [households, filter, q]);

  return (
    <aside className="flex max-h-[calc(100vh-80px)] flex-col overflow-hidden rounded-lg border border-border bg-card lg:sticky lg:top-3">
      <div className="space-y-2 border-b border-border p-2.5">
        <div className="flex gap-4 px-1 text-[12.5px]">
          {(["all", "demo"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "border-b py-1 transition-colors",
                filter === f
                  ? "border-bone text-bone"
                  : "border-transparent text-fog hover:text-bone",
              )}
            >
              {f === "demo" ? <>Cazuri demo (5)</> : <>Toată flota ({households.length})</>}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută client, oraș, ID…"
            className="h-8 pl-8 text-[12.5px]"
          />
        </div>
      </div>
      <ul className="flex-1 divide-y divide-border overflow-y-auto">
        {list.map((h) => (
          <li key={h.household_id}>
            <button
              onClick={() => onSelect(h.household_id)}
              title={h.scenario_badge_ro}
              className={cn(
                "w-full px-4 py-3 text-left transition-colors",
                selected === h.household_id ? "bg-slate" : "hover:bg-slate/50",
              )}
            >
              <span className="block truncate text-[13px] text-bone">{h.customer_name}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="p-4 text-center text-xs text-muted-foreground">Niciun rezultat.</li>
        )}
      </ul>
    </aside>
  );
}
