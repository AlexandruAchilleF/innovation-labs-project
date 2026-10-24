import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { GridState, HouseholdDetail, HouseholdSummary, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CaseFile } from "./CaseFile";
import { PortfolioList } from "./PortfolioList";

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
  return (
    <aside className="hidden w-[380px] shrink-0 flex-col border-r border-border bg-canvas lg:flex">
      <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-border px-4 text-[13px]">
        <button
          onClick={() => setMode("list")}
          className={cn("hover:text-bone", mode === "list" ? "text-bone" : "text-fog")}
        >
          Portofoliu
        </button>
        {mode === "case" && (
          <>
            <ChevronRight className="size-3.5 text-smoke" />
            <span className="num truncate text-[12px] text-bone">{selected}</span>
          </>
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
