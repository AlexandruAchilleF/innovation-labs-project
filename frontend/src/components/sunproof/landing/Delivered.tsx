import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Send } from "lucide-react";
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
          className="relative aspect-[1/1.1] overflow-hidden rounded-[6px] border border-pewter bg-slate p-6"
        >
          <header className="flex items-center gap-3 border-b border-iron pb-4">
            <FileText className="size-4 text-fog" />
            <span className="text-[13px] font-medium">Dosar tehnic</span>
            <span className="num ml-auto text-[12px] text-fog">{a.household_id}</span>
          </header>
          <p className="mt-4 text-[12px] leading-relaxed text-fog">
            {a.distributor_complaint_text}
          </p>
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate to-transparent"
          />
          <span className="num absolute bottom-4 right-4 rounded-[3px] border border-iron bg-graphite px-2 py-0.5 text-[11px] text-fog">
            PDF
          </span>
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
