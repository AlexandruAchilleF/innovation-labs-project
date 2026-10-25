import type { QuestionAnswer } from "@/lib/case-questions";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { DayLine } from "../spark";
import { CompareBars } from "../viz";
import type { Action } from "./CaseActions";
import { Answer, Mark, SectionActions } from "./DetailParts";

/** Check 2: does the configured reserve keep the battery out of the evening peak. */
export function DetailBattery({
  d,
  q,
  guide,
}: {
  d: HouseholdDetail;
  q: QuestionAnswer;
  guide: Action;
}) {
  const b = d.analysis.battery_verdict;
  if (!b.battery_kwh) return <Answer q={q} />;
  const conf = b.configured_min_soc_pct;
  const locked = conf !== b.desired_min_soc_pct;
  const pts = d.timeseries.minutes
    .filter((m) => m.minute_of_day % 10 === 0)
    .map((m) => ({ m: m.minute_of_day, v: m.battery_soc_pct }));

  return (
    <div className="space-y-7">
      <Answer q={q} lossRon={locked ? b.monthly_pzu_loss_ron : null} />

      <Mark
        name="Stare de încărcare (SoC)"
        value={locked ? `${fmt(b.locked_kwh, 1)} kWh/zi indisponibili` : undefined}
        tone="text-warning"
      >
        <DayLine
          points={pts}
          min={0}
          max={100}
          from={0}
          to={1440}
          limit={{ v: conf, label: `SoC min ${conf}%`, tone: locked ? "warning" : "fog" }}
          band={{ from: 18 * 60, to: 22 * 60, label: "vârf" }}
          unit="%"
          label={`Starea de încărcare pe parcursul zilei, SoC minim ${conf}%`}
        />
      </Mark>

      <Mark name="Preț PZU · RON/MWh">
        <CompareBars
          rows={[
            { label: "interval solar", value: b.pzu_midday_ron_mwh, tone: "fog" },
            { label: "vârf de seară", value: b.pzu_evening_ron_mwh },
          ]}
        />
      </Mark>

      <SectionActions d={d} actions={locked ? [guide] : []} />
    </div>
  );
}
