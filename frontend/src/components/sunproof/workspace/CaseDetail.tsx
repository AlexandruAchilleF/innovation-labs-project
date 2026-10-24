import { Skeleton } from "@/components/ui/skeleton";
import { answers, QUESTION_IDS, type QuestionId } from "@/lib/case-questions";
import { severityLabel } from "@/lib/i18n";
import type { GridState, HouseholdDetail, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCaseActions } from "./CaseActions";
import { ClientTicketBox } from "./ClientTicketBox";
import { DetailBattery } from "./DetailBattery";
import { DetailBilling } from "./DetailBilling";
import { DetailGrid } from "./DetailGrid";
import type { NetworkPanelProps } from "./NetworkPanel";
import { sevDot } from "./SeverityTag";

/**
 * Detailed analysis split in the three questions SunProof answers; one is shown at a time,
 * each with its answer first, then the evidence charts, then the action.
 */
export function CaseDetail({
  d,
  tab,
  onTab,
  grid,
  slot,
  network,
}: {
  d: HouseholdDetail | undefined;
  tab: QuestionId;
  onTab: (t: QuestionId) => void;
  grid: Neighborhood | GridState | undefined;
  slot: number;
  network?: NetworkPanelProps | undefined;
}) {
  if (!d) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  return <CaseDetailBody d={d} tab={tab} onTab={onTab} grid={grid} slot={slot} network={network} />;
}

function CaseDetailBody({
  d,
  tab,
  onTab,
  grid,
  slot,
  network,
}: {
  d: HouseholdDetail;
  tab: QuestionId;
  onTab: (t: QuestionId) => void;
  grid: Neighborhood | GridState | undefined;
  slot: number;
  network?: NetworkPanelProps | undefined;
}) {
  const qs = answers(d);
  const acts = useCaseActions(d);
  return (
    <>
      <div
        role="tablist"
        aria-label="Cele trei verificări"
        className="grid shrink-0 grid-cols-3 gap-1 border-b border-border p-2"
      >
        {QUESTION_IDS.map((id, i) => {
          const q = qs[id];
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => onTab(id)}
              title={`${q.question} · ${severityLabel[q.s]}`}
              className={cn(
                "rounded-[4px] border px-2 py-1.5 text-left transition-colors",
                tab === id ? "border-voltage bg-slate" : "border-transparent hover:bg-slate",
              )}
            >
              <span className="flex items-center gap-1.5 text-[11.5px] text-bone">
                <span className="num text-fog">{i + 1}</span>
                <span className="truncate">{q.label}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fog">
                <span className={cn("size-1.5 shrink-0 rounded-full", sevDot[q.s])} />
                <span className="sr-only">{severityLabel[q.s]}: </span>
                <span className="truncate">{q.short}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="mb-4 empty:hidden">
          <ClientTicketBox householdId={d.analysis.household_id} />
        </div>
        {tab === "grid" && (
          <DetailGrid d={d} q={qs.grid} grid={grid} slot={slot} network={network} actions={acts} />
        )}
        {tab === "battery" && <DetailBattery d={d} q={qs.battery} guide={acts.guide} />}
        {tab === "billing" && <DetailBilling d={d} q={qs.billing} bill={acts.bill} />}
      </div>
      {acts.dialog}
    </>
  );
}
