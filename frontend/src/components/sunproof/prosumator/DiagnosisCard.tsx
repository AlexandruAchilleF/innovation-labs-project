import { useState } from "react";
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
      className={cn("rounded-lg border bg-card p-6 sm:p-8", ok ? "border-border" : "border-iron")}
    >
      <div className="grid gap-8 md:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          <div>
            <h2 id="diag-title" className="eyebrow text-fog">
              Ce am detectat
            </h2>
            <p className="font-display mt-3 max-w-[40ch] text-[24px] leading-snug text-bone sm:text-[28px]">
              {d.scenario.scenario_badge_ro}
            </p>
            <Explained text={d.scenario.customer_answer_ro} />
          </div>
          <div>
            <h3 className="eyebrow text-fog">Cauza exactă, pe înțelesul tău</h3>
            <p className="mt-2 max-w-[70ch] text-[16px] leading-relaxed text-bone">
              {prosumerCause(d)}
            </p>
          </div>
          <div>
            <h3 className="eyebrow text-fog">Ce urmează</h3>
            <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-fog">
              {prosumerSolution(d)}
            </p>
          </div>
        </div>
        <div className="md:w-[240px]">
          <h3 className="eyebrow text-fog">Cine trebuie să rezolve</h3>
          <p
            className={cn(
              "mt-3 rounded-[4px] border px-4 py-3 text-[16px] font-medium",
              party === "NONE" ? "border-iron text-fog" : "border-bone text-bone",
            )}
          >
            {prosumerResponsibleLabel[party] ?? party}
          </p>
          {party === "DISTRIBUTION_OPERATOR" && (
            <p className="mt-2 text-[12px] text-fog">{a.distribution_operator}</p>
          )}
        </div>
      </div>
      {kind === "battery" && (
        <div className="mt-8">
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

function Explained({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="mt-3 max-w-[70ch]">
      <p className={cn("text-[14px] leading-relaxed text-fog", !open && "line-clamp-2")}>{text}</p>
      {text.length > 160 && (
        <button
          onClick={() => setOpen(!open)}
          className="mt-1 text-[12px] text-voltage hover:underline"
        >
          {open ? "Mai puțin" : "Citește explicația completă"}
        </button>
      )}
    </div>
  );
}
