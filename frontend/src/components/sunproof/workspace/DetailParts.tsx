import type { ReactNode } from "react";
import type { QuestionAnswer } from "@/lib/case-questions";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionButton, type Action } from "./CaseActions";
import { sevText } from "./SeverityTag";

/** The conclusion in a few words, with the monthly cost beside it. */
export function Answer({ q, lossRon }: { q: QuestionAnswer; lossRon?: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className={cn("font-display text-[20px] leading-tight", sevText[q.s])}>{q.answer}</p>
      {lossRon ? (
        <p className="num shrink-0 text-[15px] text-bone">
          {fmt(lossRon)}
          <span className="text-[11px] text-fog"> RON/lună</span>
        </p>
      ) : null}
    </div>
  );
}

/** One self-labelled mark: a 1–2 word name, its key number, the mark. */
export function Mark({
  name,
  value,
  tone = "text-bone",
  children,
}: {
  name: string;
  value?: ReactNode;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow text-fog">{name}</span>
        {value !== undefined && <span className={cn("num text-[12.5px]", tone)}>{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function SectionActions({ d, actions }: { d: HouseholdDetail; actions: Action[] }) {
  if (!actions.length) return null;
  return (
    <div className="flex flex-col gap-2 pt-2">
      {actions.map((a, i) => (
        <ActionButton key={a.id} a={a} household={d.analysis.household_id} primary={i === 0} />
      ))}
    </div>
  );
}
