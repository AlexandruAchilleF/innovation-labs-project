import type { QuestionAnswer } from "@/lib/case-questions";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { SplitBar } from "../spark";
import { CompareBars } from "../viz";
import type { Action } from "./CaseActions";
import { Answer, Mark, SectionActions } from "./DetailParts";

/** Question 3: is the prosumer invoice correct (Law 160/2026, 1:1 quantity compensation). */
export function DetailBilling({
  d,
  q,
  bill,
}: {
  d: HouseholdDetail;
  q: QuestionAnswer;
  bill: Action;
}) {
  const f = d.analysis.billing_verdict;
  const short = f.meter_export_kwh - f.billed_export_kwh;
  const wrong = Math.abs(f.delta_ron) >= 0.01;

  return (
    <div className="space-y-7">
      <Answer q={q} />

      <Mark
        name="Export · kWh"
        value={short > 0 ? `−${fmt(short)} kWh` : undefined}
        tone="text-critical"
      >
        <CompareBars
          rows={[
            { label: "contor", value: f.meter_export_kwh },
            {
              label: "factură",
              value: f.billed_export_kwh,
              tone: short > 0 ? "critical" : "success",
            },
          ]}
        />
      </Mark>

      <Mark name="Producție · kWh" value={fmt(f.produced_kwh)}>
        <SplitBar
          parts={[
            { label: "casă", value: f.self_consumed_kwh, tone: "fog" },
            { label: "baterie", value: f.battery_cycled_kwh, tone: "voltage" },
            { label: "rețea", value: f.meter_export_kwh, tone: "bone" },
          ]}
        />
      </Mark>

      <SectionActions d={d} actions={wrong ? [bill] : []} />
    </div>
  );
}
