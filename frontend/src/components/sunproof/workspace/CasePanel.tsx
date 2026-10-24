import { useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { ChevronRight, List } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/format";
import type {
  GridState,
  GridWhatIfResult,
  HouseholdDetail,
  HouseholdSummary,
  Neighborhood,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import type { CompareView } from "@/routes/harta";
import { CaseFile } from "./CaseFile";
import { glass } from "./MapChrome";
import { NetworkContent, type NetworkParams } from "./NetworkPanel";
import { PortfolioList } from "./PortfolioList";
import { SeverityTag } from "./SeverityTag";

export function CasePanel({
  households,
  selected,
  detail,
  nb,
  grid,
  kva,
  slot,
  params,
  onParams,
  sim,
  loading,
  view,
  onView,
  onSelect,
}: {
  households: HouseholdSummary[] | undefined;
  selected: string;
  detail: HouseholdDetail | undefined;
  nb: Neighborhood | undefined;
  grid: Neighborhood | GridState | undefined;
  kva: number;
  slot: number;
  params: NetworkParams | null;
  onParams: (p: NetworkParams | null) => void;
  sim: GridWhatIfResult | null;
  loading: boolean;
  view: CompareView;
  onView: (v: CompareView) => void;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<"case" | "list">("case");
  const [panelTab, setPanelTab] = useState<"client" | "network">("client");
  const hydrated = useHydrated();
  return (
    <aside className="hidden w-[380px] shrink-0 flex-col border-r border-border bg-canvas lg:flex">
      <div className="flex h-10 shrink-0 items-stretch gap-1.5 border-b border-border px-4 text-[13px]">
        <button
          onClick={() => {
            if (panelTab === "network") {
              setPanelTab("client");
              setMode("list");
            } else {
              setMode(mode === "list" ? "case" : "list");
            }
          }}
          aria-pressed={panelTab === "client" && mode === "list"}
          className={cn(
            "-ml-2 flex items-center gap-1.5 rounded-[4px] px-2 transition-colors hover:text-bone",
            panelTab === "client" && mode === "list" ? "text-bone" : "text-fog",
          )}
        >
          <List className="size-3.5" />
          Portofoliu
          {hydrated && households && (
            <span className="num text-[11px] text-fog">{households.length}</span>
          )}
        </button>
        {panelTab === "client" && mode === "case" && (
          <span className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0 text-fog" />
            <span className="num truncate text-[12px] text-bone">{selected}</span>
          </span>
        )}
        {panelTab === "network" && nb && (
          <span className="flex min-w-0 items-center gap-1.5 xl:hidden">
            <ChevronRight className="size-3.5 shrink-0 text-fog" />
            <span className="num truncate text-[12px] text-bone">{nb.transformer_id}</span>
          </span>
        )}
        <div
          role="group"
          aria-label="Secțiune panou"
          className="ml-auto flex shrink-0 items-center self-center rounded-[4px] border border-iron bg-obsidian p-0.5 text-[11px] xl:hidden"
        >
          <button
            type="button"
            aria-pressed={panelTab === "client"}
            onClick={() => setPanelTab("client")}
            className={cn(
              "rounded-[3px] px-2 py-0.5 transition-colors",
              panelTab === "client" ? "bg-slate text-bone" : "text-fog hover:text-bone",
            )}
          >
            Client
          </button>
          <button
            type="button"
            aria-pressed={panelTab === "network"}
            onClick={() => setPanelTab("network")}
            className={cn(
              "rounded-[3px] px-2 py-0.5 transition-colors",
              panelTab === "network" ? "bg-slate text-bone" : "text-fog hover:text-bone",
            )}
          >
            Rețea
          </button>
        </div>
      </div>
      {panelTab === "network" ? (
        <NetworkContent
          nb={nb}
          grid={grid}
          kva={kva}
          slot={slot}
          params={params}
          onParams={onParams}
          sim={sim}
          loading={loading}
          view={view}
          onView={onView}
        />
      ) : mode === "list" ? (
        <PortfolioList
          households={households}
          selected={selected}
          onSelect={(id) => {
            onSelect(id);
            setMode("case");
            setPanelTab("client");
          }}
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

/** Below lg the case panel is hidden: a one-line case strip over the map opens a bottom sheet with the full CaseFile. */
export function CaseChip({
  detail,
  nb,
  grid,
  slot,
}: {
  detail: HouseholdDetail | undefined;
  nb: Neighborhood | undefined;
  grid: Neighborhood | GridState | undefined;
  slot: number;
}) {
  if (!detail) return null;
  const a = detail.analysis;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
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
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[82vh] flex-col gap-0 rounded-t-[8px] border-t border-iron bg-canvas p-0 text-bone lg:hidden"
      >
        <SheetTitle className="sr-only">Dosar client {a.customer_name}</SheetTitle>
        <SheetDescription className="sr-only">
          Diagnostic și acțiuni pentru {a.household_id}
        </SheetDescription>
        <div className="flex h-10 shrink-0 items-center border-b border-border px-4 pr-12 text-[12px]">
          <span className="num text-fog">{a.household_id}</span>
        </div>
        <CaseFile key={a.household_id} d={detail} nb={nb} grid={grid} slot={slot} />
      </SheetContent>
    </Sheet>
  );
}
