import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { answers, mainQuestion, QUESTION_IDS, type QuestionId } from "@/lib/case-questions";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCaseActions } from "./CaseActions";
import { ClientTicketBox } from "./ClientTicketBox";
import { DetailBattery } from "./DetailBattery";
import { DetailBilling } from "./DetailBilling";
import { DetailGrid } from "./DetailGrid";
import type { NetworkPanelProps } from "./NetworkPanel";

/** A request to bring one check into view; a fresh object re-scrolls even to the same check. */
export interface DetailFocus {
  q: QuestionId;
}

/**
 * Detailed analysis as one continuous read: the case's main finding first, the other checks
 * after it, separated only by hairlines. Each section leads with its conclusion, then the
 * evidence, then the action.
 */
export function CaseDetail({
  d,
  focus,
  network,
}: {
  d: HouseholdDetail | undefined;
  focus?: DetailFocus | null | undefined;
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
  return <CaseDetailBody d={d} focus={focus} network={network} />;
}

function CaseDetailBody({
  d,
  focus,
  network,
}: {
  d: HouseholdDetail;
  focus?: DetailFocus | null | undefined;
  network?: NetworkPanelProps | undefined;
}) {
  const qs = answers(d);
  const acts = useCaseActions(d);
  const main = mainQuestion(d);
  const order = [main, ...QUESTION_IDS.filter((id) => id !== main)];
  const refs = useRef<Partial<Record<QuestionId, HTMLElement | null>>>({});
  useEffect(() => {
    if (focus) refs.current[focus.q]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="mb-6 empty:hidden">
          <ClientTicketBox householdId={d.analysis.household_id} />
        </div>
        {order.map((id, i) => (
          <section
            key={id}
            ref={(el) => {
              refs.current[id] = el;
            }}
            aria-label={qs[id].question}
            className={cn(
              "scroll-mt-4",
              i > 0 && "scroll-reveal mt-10 border-t border-border pt-8",
            )}
          >
            {id === "grid" && <DetailGrid d={d} q={qs.grid} network={network} actions={acts} />}
            {id === "battery" && <DetailBattery d={d} q={qs.battery} guide={acts.guide} />}
            {id === "billing" && <DetailBilling d={d} q={qs.billing} bill={acts.bill} />}
          </section>
        ))}
      </div>
      {acts.dialog}
    </>
  );
}
