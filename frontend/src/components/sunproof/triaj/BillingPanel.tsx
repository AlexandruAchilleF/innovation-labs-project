import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { CompareBars } from "../viz";
import { ChartFrame } from "./chart-kit";

/** Invoice reconciliation drawn on shared scales: a missing export index reads as a short bar. */
export function BillingPanel({ d }: { d: HouseholdDetail }) {
  const f = d.analysis.billing_verdict;
  const short = f.meter_export_kwh - f.billed_export_kwh;
  const off = Math.abs(f.delta_ron) >= 0.01;
  return (
    <ChartFrame
      eyebrow="Factură"
      takeaway={off ? `Diferență ${fmt(Math.abs(f.delta_ron), 2)} RON` : "Corectă"}
      tone={off ? "text-critical" : "text-bone"}
      legend={[]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[12px] text-fog">Energie lunară · kWh</h3>
          <CompareBars
            rows={[
              { label: "Produs", value: f.produced_kwh, tone: "fog" },
              { label: "Autoconsum", value: f.self_consumed_kwh, tone: "fog" },
              { label: "Export contor", value: f.meter_export_kwh },
              {
                label: "Export facturat",
                value: f.billed_export_kwh,
                tone: short > 0 ? "critical" : "success",
              },
            ]}
          />
        </div>
        <div>
          <h3 className="mb-2 text-[12px] text-fog">Valoare factură · RON</h3>
          <CompareBars
            rows={[
              { label: "Corect", value: f.verified_ron, decimals: 2 },
              {
                label: "Facturat",
                value: f.billed_ron,
                decimals: 2,
                tone: off ? "critical" : "success",
              },
            ]}
          />
        </div>
      </div>
    </ChartFrame>
  );
}
