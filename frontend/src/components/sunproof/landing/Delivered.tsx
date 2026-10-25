import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { householdQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useInView } from "./motion";

/** The two outputs of a grid case, rendered from the demo household: the distributor dossier and the O&M alert. */
export function Delivered() {
  const hydrated = useHydrated();
  const a = useQuery(householdQuery("RO-TM-001")).data?.analysis;
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  if (!hydrated || !a) return <Skeleton className="h-64" />;
  const rise = (delay: string) => ({
    className: seen ? "lp-rise" : "opacity-0",
    style: { "--lp-delay": delay } as React.CSSProperties,
  });
  return (
    <div ref={ref} className="grid items-start gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div {...rise("0s")}>
        <article
          aria-label="Dosar PDF pentru distribuitor"
          className="rounded-[4px] bg-[var(--paper)] p-6 text-[var(--paper-ink)] sm:p-8"
        >
          <header className="flex items-start justify-between gap-4 border-b border-[var(--paper-line)] pb-4">
            <div>
              <span className="font-display block text-[20px] leading-tight">Dosar tehnic</span>
              <span className="mt-1 block text-[12px] text-[var(--paper-muted)]">
                {a.distribution_operator}
              </span>
            </div>
            <span className="num rounded-[3px] border border-[var(--paper-line)] px-2 py-0.5 text-[11px] text-[var(--paper-muted)]">
              PDF
            </span>
          </header>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-[var(--paper-line)] py-4 text-[12px]">
            {(
              [
                ["Loc de consum", a.household_id],
                ["Post trafo", a.transformer_id],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[var(--paper-muted)]">{k}</dt>
                <dd className="num truncate">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 line-clamp-[10] text-[13px] leading-relaxed">
            {a.distributor_complaint_text}
          </p>
        </article>
      </div>
      <div {...rise("0.5s")} className={cn(rise("0.5s").className, "md:mt-16")}>
        <div
          aria-label="Alertă către tehnicianul O&M"
          className="rounded-[8px] border border-pewter bg-graphite p-5"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-voltage/20">
              <Send className="size-4 text-voltage" />
            </span>
            <span className="text-[13px] font-medium">Tehnician O&amp;M</span>
            <span className="ml-auto size-2 rounded-full bg-critical" />
          </div>
          <p className="mt-4 rounded-[6px] rounded-tl-none bg-slate px-4 py-3 text-[14px] leading-relaxed text-bone">
            {a.one_line_triage_ro}
          </p>
        </div>
      </div>
    </div>
  );
}
