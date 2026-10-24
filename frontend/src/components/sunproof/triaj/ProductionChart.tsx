import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { stepMinutes } from "@/lib/energy-day";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { AXIS, ChartFrame, ChartTip, xMinutes } from "./chart-kit";

const FROM = 300;
const TO = 1260;

/** What the trips cost: real PV against the PVGIS clear-sky expectation, the gap shaded where the inverter was off. */
export function ProductionChart({ d }: { d: HouseholdDetail }) {
  const g = d.analysis.grid_verdict;
  const minutes = d.timeseries.minutes;
  const { rows, lostKwh } = useMemo(() => {
    const dt = stepMinutes(minutes) / 60;
    let lost = 0;
    for (const x of minutes)
      if (x.status === "TRIP") lost += Math.max(0, x.pvgis_expected_kw - x.pv_power_kw) * dt;
    const rows = minutes
      .filter((x) => x.minute_of_day % 5 === 0 && x.minute_of_day >= FROM && x.minute_of_day <= TO)
      .map((x) => ({
        m: x.minute_of_day,
        pv: x.pv_power_kw,
        exp: x.pvgis_expected_kw,
        lost: x.status === "TRIP" ? [x.pv_power_kw, x.pvgis_expected_kw] : null,
      }));
    return { rows, lostKwh: lost };
  }, [minutes]);
  const tripped = lostKwh > 0.05;

  return (
    <ChartFrame
      eyebrow="Producție"
      takeaway={tripped ? `${fmt(lostKwh, 1)} kWh pierduți azi` : "Fără pierderi"}
      tone={tripped ? "text-critical" : "text-bone"}
      legend={[
        { color: "var(--sun)", label: "Reală" },
        { color: "var(--fog)", label: "PVGIS", kind: "dash" },
        ...(tripped
          ? [{ color: "var(--critical-border)", label: "Pierdut", kind: "area" as const }]
          : []),
      ]}
    >
      <div className="h-[200px]">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis {...xMinutes(FROM, TO, 3)} />
            <YAxis {...AXIS} width={48} tickFormatter={(v) => `${v} kW`} />
            <Tooltip
              cursor={{ stroke: "var(--pewter)" }}
              content={
                <ChartTip
                  rows={(r) => [
                    ["Real", `${fmt(r["pv"] as number, 2)} kW`],
                    ["PVGIS", `${fmt(r["exp"] as number, 2)} kW`],
                    ["Stare", r["lost"] ? "oprit" : null],
                  ]}
                />
              }
            />
            <Area
              dataKey="lost"
              stroke="none"
              fill="var(--critical)"
              fillOpacity={0.35}
              isAnimationActive={false}
            />
            <Area
              dataKey="pv"
              type="monotone"
              stroke="var(--sun)"
              strokeWidth={1.5}
              fill="var(--sun)"
              fillOpacity={0.12}
              isAnimationActive={false}
            />
            <Line
              dataKey="exp"
              type="monotone"
              stroke="var(--fog)"
              strokeDasharray="4 3"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
