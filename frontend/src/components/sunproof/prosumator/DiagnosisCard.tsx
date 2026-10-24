import { caseKind, prosumerCause, prosumerSolution } from "@/lib/case-summary";
import { prosumerResponsibleLabel } from "@/lib/i18n";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BatteryFix } from "./BatteryFix";

/** Block 2: conclusion → cause → who fixes it. The battery fix lives here when it is the problem. */
export function DiagnosisCard({ d }: { d: HouseholdDetail }) {
  const a = d.analysis;
  const b = a.battery_verdict;
  const kind = caseKind(d);
  const party = a.primary_responsible_party;
  const ok = kind === "healthy" || kind === "billing_ok";
  // the battery is a second problem on some grid cases (e.g. kept at 80% backup)
  const batteryToo = kind !== "battery" && b.battery_kwh > 0 && b.status !== "OK";
  return (
    <section
      aria-labelledby="diag-title"
      className={cn("rounded-lg border bg-card p-5 sm:p-6", ok ? "border-border" : "border-iron")}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-3">
          <h2 id="diag-title" className="flex items-start gap-3">
            <span
              aria-hidden
              className={cn("mt-3 size-2 shrink-0 rounded-full", ok ? "bg-success" : "bg-warning")}
            />
            <span className="font-display max-w-[40ch] text-[22px] leading-snug text-bone sm:text-[24px]">
              {d.scenario.scenario_badge_ro}
            </span>
          </h2>
          <p className="max-w-[70ch] pl-5 text-[15px] leading-relaxed text-bone">
            {prosumerCause(d)}
          </p>
          {!ok && (
            <p className="max-w-[70ch] pl-5 text-[13px] leading-relaxed text-fog">
              {prosumerSolution(d)}
            </p>
          )}
        </div>
        <p
          className={cn(
            "rounded-[4px] border px-3 py-2 text-[13px] md:w-[220px]",
            party === "NONE" ? "border-iron text-fog" : "border-bone text-bone",
          )}
        >
          <span className="block text-[11.5px] text-fog">Cine rezolvă</span>
          {prosumerResponsibleLabel[party] ?? party}
          {party === "DISTRIBUTION_OPERATOR" && (
            <span className="block text-[11.5px] text-fog">{a.distribution_operator}</span>
          )}
        </p>
      </div>
      {kind === "battery" && (
        <div className="mt-6">
          <BatteryFix d={d} />
        </div>
      )}
      {batteryToo && (
        <details className="group mt-8 border-t border-border pt-6">
          <summary className="cursor-pointer list-none text-[14px] text-bone">
            <span className="eyebrow mr-2 text-warning">Și bateria</span>
            {b.verdict_text_ro.split(". ")[0]} —{" "}
            <span className="text-voltage group-open:hidden">vezi cum o deblochezi</span>
          </summary>
          <div className="mt-6">
            <BatteryFix d={d} />
          </div>
        </details>
      )}
    </section>
  );
}
