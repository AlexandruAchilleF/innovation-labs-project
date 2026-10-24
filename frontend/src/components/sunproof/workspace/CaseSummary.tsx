import { ChevronRight, Inbox, PanelRightOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { answers, QUESTION_IDS, type QuestionId } from "@/lib/case-questions";
import { supplierCase } from "@/lib/case-summary";
import { fmt } from "@/lib/format";
import { severityLabel } from "@/lib/i18n";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { openTicketFor, useTickets } from "@/lib/tickets";
import { SeverityTag, sevDot, sevText } from "./SeverityTag";

/**
 * General view of the selected client: who, the main problem and its cost, and the three answers
 * in one line each. Every row opens the detailed analysis on that question.
 */
export function CaseSummary({
  d,
  onDetail,
}: {
  d: HouseholdDetail | undefined;
  onDetail: (q?: QuestionId) => void;
}) {
  if (!d) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  const sc = supplierCase(d);
  const qs = answers(d);
  return <SummaryBody d={d} onDetail={onDetail} title={sc.title} lossRon={sc.lossRon} qs={qs} />;
}

function SummaryBody({
  d,
  onDetail,
  title,
  lossRon,
  qs,
}: {
  d: HouseholdDetail;
  onDetail: (q?: QuestionId) => void;
  title: string;
  lossRon: number | null;
  qs: ReturnType<typeof answers>;
}) {
  const a = d.analysis;
  const ticket = openTicketFor(useTickets(), a.household_id);
  return (
    <section aria-label="Clientul selectat" className="space-y-3 p-4">
      <div>
        <p className="eyebrow text-fog">Client selectat</p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h2 className="truncate font-display text-[18px] leading-tight text-bone">
            {a.customer_name}
          </h2>
          <SeverityTag s={a.overall_severity} />
        </div>
        <p className="mt-0.5 text-[11.5px] text-fog">
          <span className="num">{a.household_id}</span> · {a.city} ·{" "}
          <span className="num">{fmt(a.installed_pv_kw, 1)} kWp</span>
        </p>
      </div>

      {ticket && (
        <button
          type="button"
          onClick={() => onDetail()}
          className="flex w-full items-center gap-1.5 rounded-[4px] border border-voltage/60 px-3 py-1.5 text-left text-[12px] text-bone transition-colors hover:bg-slate"
        >
          <Inbox className="size-3.5 shrink-0 text-voltage" strokeWidth={1.5} />
          <span className="truncate">Tichet deschis: {ticket.topic_ro}</span>
          <ChevronRight className="ml-auto size-3.5 shrink-0 text-smoke" />
        </button>
      )}

      <div className="flex items-baseline justify-between gap-3 rounded-[4px] border border-iron bg-graphite px-3 py-2">
        <span className="text-[12.5px] leading-snug text-bone">{title}</span>
        {lossRon !== null && (
          <span className={cn("num shrink-0 text-[14px]", sevText[a.overall_severity])}>
            {fmt(lossRon)}
            <span className="text-[11px] text-fog"> RON/lună</span>
          </span>
        )}
      </div>

      <ul className="divide-y divide-border rounded-[4px] border border-border">
        {QUESTION_IDS.map((id, i) => {
          const q = qs[id];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onDetail(id)}
                title={q.question}
                className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-slate"
              >
                <span className={cn("size-1.5 rounded-full", sevDot[q.s])} />
                <span className="truncate text-fog">
                  <span className="num mr-1 text-smoke">{i + 1}</span>
                  {q.label}
                </span>
                <span className={cn("truncate", q.s === "OK" ? "text-fog" : sevText[q.s])}>
                  <span className="sr-only">{severityLabel[q.s]}: </span>
                  {q.short}
                </span>
                <ChevronRight className="size-3.5 text-smoke" />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => onDetail()}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-[4px] border border-bone bg-bone text-[12.5px] font-medium text-obsidian transition-colors hover:bg-bone/85"
      >
        <PanelRightOpen className="size-3.5" />
        Vezi analiza detaliată
      </button>
    </section>
  );
}
