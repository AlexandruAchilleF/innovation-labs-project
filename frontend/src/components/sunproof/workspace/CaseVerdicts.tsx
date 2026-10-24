import { useState } from "react";
import { fmt } from "@/lib/format";
import { severityLabel } from "@/lib/i18n";
import type { HouseholdDetail, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sevText } from "./SeverityTag";

const headline = (o: object, fallback: string) =>
  (o as { headline_ro?: string }).headline_ro || fallback;

interface Verdict {
  label: string;
  s: Severity;
  value: string;
  text: string;
  facts: string[][];
}

/** All three engine checks as one always-visible row; a click opens the one sentence and numbers behind it. */
export function CaseVerdicts({ d }: { d: HouseholdDetail }) {
  const { grid_verdict: g, battery_verdict: b, billing_verdict: f } = d.analysis;
  const [open, setOpen] = useState<string | null>(null);
  const verdicts: Verdict[] = [
    {
      label: "Rețea",
      s: g.status,
      value: g.trip_minutes > 0 ? `${g.trip_minutes} min oprit` : "fără opriri",
      text: headline(g, g.verdict_text_ro),
      facts: [
        ["Contor (PCC)", `${fmt(g.max_meter_voltage_v, 1)} V`],
        ["Cablu intern", `+${fmt(g.voltage_rise_internal_cable_v, 1)} V`],
        ["Vecini simultan", `${g.neighbors_affected_simultaneously}/${g.neighbors_total}`],
      ],
    },
    {
      label: "Baterie",
      s: b.battery_kwh ? b.status : "OK",
      value: !b.battery_kwh
        ? "—"
        : b.configured_min_soc_pct !== b.desired_min_soc_pct
          ? `${b.configured_min_soc_pct}% → ${b.desired_min_soc_pct}%`
          : "corectă",
      text: b.battery_kwh ? headline(b, b.verdict_text_ro) : "Fără baterie instalată.",
      facts: b.battery_kwh
        ? [
            ["Blocat", `${fmt(b.locked_kwh, 1)} kWh/zi`],
            ["Pierdere furnizor", `${fmt(b.monthly_pzu_loss_ron)} RON/lună`],
          ]
        : [],
    },
    {
      label: "Factură",
      s: f.status,
      value: f.delta_ron !== 0 ? `${fmt(Math.abs(f.delta_ron), 2)} RON` : "corectă",
      text: headline(f, f.verdict_text_ro),
      facts: [
        ["Facturat / corect", `${fmt(f.billed_ron)} / ${fmt(f.verified_ron)} RON`],
        [
          "Export contor / facturat",
          `${fmt(f.meter_export_kwh)} / ${fmt(f.billed_export_kwh)} kWh`,
        ],
      ],
    },
  ];
  const active = verdicts.find((v) => v.label === open);
  return (
    <section aria-label="Toate verificările">
      <div className="grid grid-cols-3 gap-1.5">
        {verdicts.map((v) => (
          <button
            key={v.label}
            type="button"
            aria-expanded={open === v.label}
            onClick={() => setOpen(open === v.label ? null : v.label)}
            title={severityLabel[v.s]}
            className={cn(
              "rounded-[4px] border px-2 py-1.5 text-left transition-colors hover:bg-slate",
              open === v.label ? "border-voltage" : "border-iron",
            )}
          >
            <span className="flex items-center gap-1.5 text-[11px] text-fog">
              <span className={cn("size-1.5 shrink-0 rounded-full", dot[v.s])} />
              {v.label}
            </span>
            <span
              className={cn(
                "mt-0.5 block truncate text-[12px]",
                /\d/.test(v.value) && "num",
                sevText[v.s],
              )}
            >
              <span className="sr-only">{severityLabel[v.s]}: </span>
              {v.value}
            </span>
          </button>
        ))}
      </div>
      {active && (
        <div className="mt-2 space-y-2 rounded-[4px] border border-border bg-obsidian p-3 text-[12px] leading-relaxed">
          {active.text && <p className="text-fog">{active.text}</p>}
          {active.facts.length > 0 && (
            <dl className="space-y-0.5">
              {active.facts.map(([k, val]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-fog">{k}</dt>
                  <dd className="num text-bone">{val}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}

const dot: Record<Severity, string> = {
  CRITICAL: "bg-critical",
  WARNING: "bg-warning",
  OK: "bg-success",
  INFO: "bg-info",
};
