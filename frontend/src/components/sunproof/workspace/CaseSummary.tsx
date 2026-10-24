import { Inbox, PanelRightOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { answers, QUESTION_IDS, type QuestionId } from "@/lib/case-questions";
import { supplierCase } from "@/lib/case-summary";
import { fmt } from "@/lib/format";
import { severityLabel } from "@/lib/i18n";
import { openTicketFor, useTickets } from "@/lib/tickets";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sevDot, sevText } from "./SeverityTag";

/** Selected client at a glance: name, main problem and cost, the three checks as dots. */
export function CaseSummary({
  d,
  onDetail,
}: {
  d: HouseholdDetail | undefined;
  onDetail: (q?: QuestionId) => void;
}) {
  const tickets = useTickets();
  if (!d) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-10" />
      </div>
    );
  }
  const a = d.analysis;
  const sc = supplierCase(d);
  const qs = answers(d);
  const ticket = openTicketFor(tickets, a.household_id);
  return (
    <section aria-label="Clientul selectat" className="space-y-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="truncate font-display text-[18px] leading-tight text-bone">
          {a.customer_name}
        </h2>
        {ticket && (
          <Inbox
            className="size-3.5 shrink-0 text-voltage"
            strokeWidth={1.5}
            aria-label="Tichet deschis"
          />
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("text-[13px] leading-snug", sevText[a.overall_severity])}>
          {sc.title}
        </span>
        {sc.lossRon !== null && (
          <span className="num shrink-0 text-[14px] text-bone">
            {fmt(sc.lossRon)}
            <span className="text-[11px] text-fog"> RON/lună</span>
          </span>
        )}
      </div>

      <div className="flex gap-4">
        {QUESTION_IDS.map((id) => {
          const q = qs[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onDetail(id)}
              title={`${q.label} · ${severityLabel[q.s]}`}
              className="flex items-center gap-1.5 text-[12px] text-fog transition-colors hover:text-bone"
            >
              <span className={cn("size-1.5 rounded-full", sevDot[q.s])} />
              {q.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onDetail()}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-[4px] border border-bone bg-bone text-[12.5px] font-medium text-obsidian transition-colors hover:bg-bone/85"
      >
        <PanelRightOpen className="size-3.5" />
        Analiză detaliată
      </button>
    </section>
  );
}
