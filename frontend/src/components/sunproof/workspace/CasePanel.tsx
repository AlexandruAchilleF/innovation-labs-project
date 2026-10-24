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
import { mainQuestion, type QuestionId } from "@/lib/case-questions";
import { fmt } from "@/lib/format";
import type {
  GridState,
  HouseholdDetail,
  HouseholdSummary,
  Neighborhood,
  PortfolioSummaryMetrics,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { CaseDetail } from "./CaseDetail";
import { CaseSummary } from "./CaseSummary";
import { glass } from "./MapChrome";
import { PortfolioList } from "./PortfolioList";
import { SeverityTag } from "./SeverityTag";
import { SidePanel } from "./SidePanel";

/** Left panel: the portfolio (problems, list) and the selected client's general picture. */
export function CasePanel({
  households,
  metrics,
  selected,
  detail,
  open,
  onOpen,
  onClose,
  onSelect,
  onDetail,
}: {
  households: HouseholdSummary[] | undefined;
  metrics: PortfolioSummaryMetrics | undefined;
  selected: string;
  detail: HouseholdDetail | undefined;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDetail: (q?: QuestionId) => void;
}) {
  const hydrated = useHydrated();
  return (
    <SidePanel
      side="left"
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      width="w-[360px]"
      title="Portofoliu"
      meta={
        hydrated && households ? (
          <span className="num text-[11px] text-fog">{households.length} clienți</span>
        ) : null
      }
      railIcon={<List />}
      railLabel="Portofoliu"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <PortfolioList
          households={households}
          metrics={metrics}
          selected={selected}
          onSelect={onSelect}
        />
      </div>
      <div className="max-h-[55%] shrink-0 overflow-y-auto border-t border-iron bg-graphite/40">
        <CaseSummary d={detail} onDetail={onDetail} />
      </div>
    </SidePanel>
  );
}

/** Below lg the side panels are hidden: a one-line case strip over the map opens a bottom sheet. */
export function CaseChip({
  detail,
  grid,
  slot,
}: {
  detail: HouseholdDetail | undefined;
  grid: Neighborhood | GridState | undefined;
  slot: number;
}) {
  const [tab, setTab] = useState<QuestionId | null>(null);
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
          <span className="truncate text-bone">{a.customer_name}</span>
          <span className="num ml-2 text-fog">{a.household_id}</span>
        </div>
        <CaseDetail
          key={a.household_id}
          d={detail}
          tab={tab ?? mainQuestion(detail)}
          onTab={setTab}
        />
      </SheetContent>
    </Sheet>
  );
}
