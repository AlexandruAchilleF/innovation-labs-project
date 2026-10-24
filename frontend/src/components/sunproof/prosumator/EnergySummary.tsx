import { inverterState } from "@/lib/case-summary";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Block 1: four large figures a homeowner reads at a glance. Rendered client-side only (uses the clock). */
export function EnergySummary({ d }: { d: HouseholdDetail }) {
  const f = d.analysis.billing_verdict;
  const now = new Date();
  const minute = now.getHours() * 60 + now.getMinutes();
  const pt =
    d.timeseries.minutes.find((m) => m.minute_of_day === minute) ?? d.timeseries.minutes[0]!;
  const inv = inverterState(d);
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
      <Figure
        label="Producție panouri"
        value={`${fmt(pt.pv_power_kw, 1)} kW`}
        note={`acum (${clock}) · ${fmt(f.produced_kwh)} kWh luna aceasta`}
      />
      <Figure
        label="Folosit în casă"
        value={`${fmt(f.self_consumed_kwh)} kWh`}
        note={`≈ ${fmt(f.self_consumption_savings_ron)} RON economisiți luna aceasta`}
      />
      <Figure
        label="Injectat în rețea (2.8.0)"
        value={`${fmt(f.meter_export_kwh)} kWh`}
        note="măsurat de contor luna aceasta"
      />
      <div className="flex flex-col gap-3 bg-card p-5">
        <dt className="text-[13px] text-fog">Stare invertor</dt>
        <dd>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-[4px] border px-2.5 py-1.5 text-[14px] font-medium",
              inv.ok ? "border-iron text-bone" : "border-critical-border text-critical",
            )}
          >
            <span className={cn("size-2 rounded-full", inv.ok ? "bg-success" : "bg-critical")} />
            {inv.label}
          </span>
        </dd>
      </div>
    </dl>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-2 bg-card p-5">
      <dt className="text-[13px] text-fog">{label}</dt>
      <dd className="num text-[30px] leading-none text-bone">{value}</dd>
      <dd className="text-[12px] text-fog">{note}</dd>
    </div>
  );
}
