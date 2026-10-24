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
      eyebrow="Factură · reconciliere 1.8.0 / 2.8.0"
      takeaway={
        off ? (
          <>
            Factura diferă cu <span className="num">{fmt(Math.abs(f.delta_ron), 2)} RON</span>
            {short > 0 && (
              <span className="text-fog">
                {" "}
                · lipsesc <span className="num">{fmt(short)} kWh</span> exportați
              </span>
            )}
          </>
        ) : (
          "Factura este corectă · exportul e compensat 1:1"
        )
      }
      tone={off ? "text-critical" : "text-bone"}
      legend={[]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[12px] text-fog">Energie lunară · kWh</h3>
          <CompareBars
            rows={[
              { label: "Produs (invertor)", value: f.produced_kwh, tone: "fog" },
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
              { label: "Corect (verificat)", value: f.verified_ron, decimals: 2 },
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
