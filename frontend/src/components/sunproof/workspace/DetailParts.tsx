import type { ReactNode } from "react";
import type { QuestionAnswer } from "@/lib/case-questions";
import { fmt } from "@/lib/format";
import { responsibleLabel } from "@/lib/i18n";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionButton, type Action } from "./CaseActions";
import { SeverityTag, sevText } from "./SeverityTag";

/** Section opener: the question, the engine's answer in one line, who acts and what it costs. */
export function QuestionHead({
  n,
  q,
  lossRon,
}: {
  n: number;
  q: QuestionAnswer;
  lossRon?: number | null | undefined;
}) {
  return (
    <header className="space-y-3">
      <div>
        <p className="eyebrow text-fog">Întrebarea {n} din 3</p>
        <h2 className="mt-1 font-display text-[18px] leading-snug text-bone">{q.question}</h2>
      </div>
      <div className="space-y-2 rounded-lg border border-iron bg-graphite p-3">
        <div className="flex items-start justify-between gap-3">
          <p className={cn("text-[14px] font-medium leading-snug", sevText[q.s])}>{q.answer}</p>
          <SeverityTag s={q.s} />
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
          <div className="flex gap-1.5">
            <dt className="text-fog">Cine acționează:</dt>
            <dd className="text-bone">
              {q.party === "NONE" ? "nimeni" : responsibleLabel[q.party]}
            </dd>
          </div>
          {lossRon ? (
            <div className="flex gap-1.5">
              <dt className="text-fog">Pierdere:</dt>
              <dd className={cn("num", sevText[q.s])}>{fmt(lossRon)} RON/lună</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </header>
  );
}

/** One piece of evidence: what the chart is, the chart, and one sentence on how to read it. */
export function Evidence({
  title,
  value,
  tone = "text-fog",
  how,
  children,
}: {
  title: string;
  value?: string;
  tone?: string;
  how: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[12.5px] font-medium text-bone">{title}</h3>
        {value && <span className={cn("num text-[12px]", tone)}>{value}</span>}
      </div>
      {children}
      <figcaption className="text-[11.5px] leading-relaxed text-smoke">
        <span className="text-fog">Cum citești: </span>
        {how}
      </figcaption>
    </figure>
  );
}

/** Small legend chip for a coloured mark. */
export function Key({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className={cn("inline-block size-2 rounded-[2px] align-middle", className)} />
      {children}
    </span>
  );
}

export function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-border rounded-[4px] border border-border text-[12px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 px-3 py-1.5">
          <dt className="text-fog">{k}</dt>
          <dd className="num text-right text-bone">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The engine's own sentence behind the verdict. */
export function EngineText({ o, fallback }: { o: object; fallback: string }) {
  const text = (o as { headline_ro?: string }).headline_ro || fallback;
  if (!text) return null;
  return (
    <p className="border-l-2 border-iron pl-3 text-[12.5px] leading-relaxed text-fog">{text}</p>
  );
}

export function SectionActions({ d, actions }: { d: HouseholdDetail; actions: Action[] }) {
  if (!actions.length) return null;
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="eyebrow text-fog">Ce facem</p>
      <div className="flex flex-col gap-2">
        {actions.map((a, i) => (
          <ActionButton key={a.id} a={a} household={d.analysis.household_id} primary={i === 0} />
        ))}
      </div>
    </div>
  );
}
