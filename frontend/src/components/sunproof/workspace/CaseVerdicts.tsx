import { ChevronRight } from "lucide-react";
import { DisclosureChevron } from "@/components/sunproof/primitives";
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

/** All three engine verdicts, folded away: the main problem is already summarised above. */
export function CaseVerdicts({ d }: { d: HouseholdDetail }) {
  const { grid_verdict: g, battery_verdict: b, billing_verdict: f } = d.analysis;
  const verdicts: Verdict[] = [
    {
      label: "Rețea",
      s: g.status,
      value:
        g.trip_minutes > 0
          ? `${g.neighbors_affected_simultaneously}/${g.neighbors_total} vecini simultan`
          : "fără opriri",
      text: headline(g, g.verdict_text_ro),
      facts: [
        ["Contor (PCC)", `${fmt(g.max_meter_voltage_v, 1)} V`],
        ["Cablu intern", `+${fmt(g.voltage_rise_internal_cable_v, 1)} V`],
        ["Opriri azi", `${g.trip_minutes} min`],
      ],
    },
    {
      label: "Baterie",
      s: b.status,
      value: !b.battery_kwh
        ? "fără baterie"
        : b.configured_min_soc_pct !== b.desired_min_soc_pct
          ? `${b.configured_min_soc_pct}% → ${b.desired_min_soc_pct}%`
          : "setată corect",
      text: b.battery_kwh ? headline(b, b.verdict_text_ro) : "",
      facts: b.battery_kwh
        ? [
            ["Blocat", `${fmt(b.locked_kwh, 1)} kWh`],
            ["Pierdere furnizor", `${fmt(b.monthly_pzu_loss_ron)} RON/lună`],
          ]
        : [],
    },
    {
      label: "Factură",
      s: f.status,
      value: f.delta_ron !== 0 ? `${fmt(f.delta_ron, 2)} RON` : "corectă",
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
  return (
    <details className="group/all">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[12.5px] text-fog hover:text-bone">
        Toate verificările (rețea, baterie, factură)
        <ChevronRight className="size-3.5 shrink-0 text-smoke transition-transform group-open/all:rotate-90" />
      </summary>
      <div className="mt-2 divide-y divide-border border-y border-border">
        {verdicts.map((v) => (
          <VerdictRow key={v.label} v={v} />
        ))}
      </div>
    </details>
  );
}

function VerdictRow({ v }: { v: Verdict }) {
  const expandable = !!v.text || v.facts.length > 0;
  return (
    <details className="group">
      <summary
        className={cn(
          "flex list-none items-baseline gap-3 py-2.5 text-[13px]",
          expandable && "cursor-pointer hover:bg-slate/40",
        )}
        title={severityLabel[v.s]}
      >
        <span className="w-16 shrink-0 text-fog">{v.label}</span>
        <span className={cn("num flex-1 truncate", sevText[v.s])}>
          <span className="sr-only">{severityLabel[v.s]}: </span>
          {v.value}
        </span>
        {expandable && <DisclosureChevron />}
      </summary>
      {expandable && (
        <div className="space-y-2 pb-3 pl-[76px] text-[12px] leading-relaxed">
          {v.text && <p className="text-fog">{v.text}</p>}
          {v.facts.length > 0 && (
            <dl className="space-y-0.5">
              {v.facts.map(([k, val]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-fog">{k}</dt>
                  <dd className="num text-bone">{val}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </details>
  );
}
