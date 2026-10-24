import { ArrowUp } from "lucide-react";
import type { QuestionAnswer } from "@/lib/case-questions";
import { gridCause } from "@/lib/case-questions";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { DisclosureChevron } from "../primitives";
import { DayLine, HouseRow } from "../spark";
import type { Action } from "./CaseActions";
import { Answer, Mark, SectionActions } from "./DetailParts";
import { NetworkContent, type NetworkPanelProps } from "./NetworkPanel";

/** Question 1: midday inverter trip, the grid or the installation. */
export function DetailGrid({
  d,
  q,
  network,
  actions,
}: {
  d: HouseholdDetail;
  q: QuestionAnswer;
  network?: NetworkPanelProps | undefined;
  actions: { dossier: Action; alert: Action };
}) {
  const g = d.analysis.grid_verdict;
  const cause = gridCause(d);
  const pts = d.timeseries.minutes
    .filter((m) => m.minute_of_day % 5 === 0)
    .map((m) => ({ m: m.minute_of_day, v: m.ac_voltage_v }));
  const trips: [number, number][] = [];
  for (const m of d.timeseries.minutes) {
    if (m.status !== "TRIP") continue;
    const last = trips[trips.length - 1];
    if (last && m.minute_of_day - last[1] <= 5) last[1] = m.minute_of_day + 1;
    else trips.push([m.minute_of_day, m.minute_of_day + 1]);
  }
  const lo = Math.min(225, ...pts.map((p) => p.v)) - 1;
  const hi = Math.max(g.legal_limit_v + 4, g.max_inverter_voltage_v + 3);
  const acts =
    g.trip_minutes > 0
      ? cause === "local"
        ? [actions.alert, actions.dossier]
        : [actions.dossier, actions.alert]
      : [];

  return (
    <div className="space-y-7">
      <Answer q={q} lossRon={g.lost_ron_month} />

      <Mark
        name="Tensiune invertor"
        value={g.trip_minutes > 0 ? `${g.trip_minutes} min oprit` : undefined}
        tone="text-critical"
      >
        <DayLine
          points={pts}
          min={lo}
          max={hi}
          limit={{ v: g.legal_limit_v, label: `${fmt(g.legal_limit_v)} V` }}
          danger={trips}
          peak
          unit="V"
          label={`Tensiune maximă ${fmt(g.max_inverter_voltage_v, 1)} V, limită ${fmt(g.legal_limit_v)} V, ${g.trip_minutes} minute oprit`}
        />
      </Mark>

      <div className="grid grid-cols-2 gap-6">
        <Mark
          name="Vecini opriți"
          value={`${g.neighbors_affected_simultaneously}/${g.neighbors_total}`}
        >
          <HouseRow hit={g.neighbors_affected_simultaneously} total={g.neighbors_total} />
        </Mark>
        <Mark name="Cablu intern">
          <CableRise meter={g.max_meter_voltage_v} inverter={g.max_inverter_voltage_v} />
        </Mark>
      </div>

      <SectionActions d={d} actions={acts} />

      {network && (
        <details open={cause === "grid"} className="group border-t border-border pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[12.5px] text-fog hover:text-bone">
            Rețeaua cartierului
            <DisclosureChevron />
          </summary>
          <div className="mt-4">
            <NetworkContent {...network} />
          </div>
        </details>
      )}
    </div>
  );
}

/** Meter → inverter as a step that climbs: the taller the step, the more the house cable adds. */
function CableRise({ meter, inverter }: { meter: number; inverter: number }) {
  const rise = Math.max(0, inverter - meter);
  const h = Math.min(28, 4 + rise * 3);
  return (
    <div
      className="flex items-end gap-2"
      role="img"
      aria-label={`Contor ${fmt(meter, 1)} V, invertor ${fmt(inverter, 1)} V`}
    >
      <svg viewBox="0 0 40 32" className="h-8 w-10 shrink-0" aria-hidden>
        <polyline
          points={`0,30 14,30 14,${30 - h} 40,${30 - h}`}
          fill="none"
          stroke={rise >= 3 ? "var(--warning)" : "var(--smoke)"}
          strokeWidth="1.5"
        />
      </svg>
      <span className="num flex items-center gap-0.5 text-[13px] text-bone">
        <ArrowUp className="size-3.5 text-fog" />
        {fmt(rise, 1)} V
      </span>
    </div>
  );
}
