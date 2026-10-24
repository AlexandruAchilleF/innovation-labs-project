import { useState } from "react";
import { Link, useHydrated } from "@tanstack/react-router";
import { ChevronRight, List } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/format";
import type { GridState, HouseholdDetail, HouseholdSummary, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CaseFile } from "./CaseFile";
import { glass } from "./MapChrome";
import { PortfolioList } from "./PortfolioList";
import { SeverityTag } from "./SeverityTag";

export function CasePanel({
  households,
  selected,
  detail,
  nb,
  grid,
  slot,
  onSelect,
}: {
  households: HouseholdSummary[] | undefined;
  selected: string;
  detail: HouseholdDetail | undefined;
  nb: Neighborhood | undefined;
  grid: Neighborhood | GridState | undefined;
  slot: number;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<"case" | "list">("case");
  const hydrated = useHydrated();
  return (
    <aside className="hidden w-[380px] shrink-0 flex-col border-r border-border bg-canvas lg:flex">
      <div className="flex h-10 shrink-0 items-stretch gap-1.5 border-b border-border px-4 text-[13px]">
        <button
          onClick={() => setMode(mode === "list" ? "case" : "list")}
          aria-pressed={mode === "list"}
          className={cn(
            "-ml-2 flex items-center gap-1.5 rounded-[4px] px-2 transition-colors hover:text-bone",
            mode === "list" ? "text-bone" : "text-fog",
          )}
        >
          <List className="size-3.5" />
          Portofoliu
          {hydrated && households && (
            <span className="num text-[11px] text-fog">{households.length}</span>
          )}
        </button>
        {mode === "case" && (
          <span className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0 text-smoke" />
            <span className="num truncate text-[12px] text-bone">{selected}</span>
          </span>
        )}
      </div>
      {mode === "list" ? (
        <PortfolioList
          households={households}
          selected={selected}
          onSelect={(id) => (onSelect(id), setMode("case"))}
        />
      ) : detail ? (
        <CaseFile key={selected} d={detail} nb={nb} grid={grid} slot={slot} />
      ) : (
        <div className="space-y-3 p-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      )}
    </aside>
  );
}

/** Below lg the case panel is hidden: a one-line case strip over the map keeps the verdict and the way to the full file. */
export function CaseChip({ detail }: { detail: HouseholdDetail | undefined }) {
  if (!detail) return null;
  const a = detail.analysis;
  return (
    <Link
      to="/triaj"
      search={{ household: a.household_id }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[4px] px-3 py-2 text-left transition-colors hover:bg-slate lg:hidden",
        glass,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-bone">{a.customer_name}</span>
        <span className="num block truncate text-[11px] text-fog">
          {a.city} · {fmt(a.installed_pv_kw, 1)} kWp
        </span>
      </span>
      <SeverityTag s={a.overall_severity} />
      <span className="flex shrink-0 items-center text-[12px] text-fog">
        Diagnostic
        <ChevronRight className="size-3.5" />
      </span>
    </Link>
  );
}
