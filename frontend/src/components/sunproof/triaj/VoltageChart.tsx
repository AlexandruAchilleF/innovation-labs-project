import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { caseKind } from "@/lib/case-summary";
import { clock } from "@/lib/energy-day";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { AXIS, ChartFrame, ChartTip, ranges, xMinutes, type LegendItem } from "./chart-kit";

const FROM = 360;
const TO = 1200;

/**
 * Grid or local? The inverter's voltage against the meter (street side) and the neighbours' band:
 * a rising street lifts all three together; a local fault lifts only the inverter above the meter.
 */
export function VoltageChart({ d }: { d: HouseholdDetail }) {
  const g = d.analysis.grid_verdict;
  const ts = d.timeseries;
  const kind = caseKind(d);
  const rows = useMemo(
    () =>
      ts.minutes
        .filter(
          (x) => x.minute_of_day % 5 === 0 && x.minute_of_day >= FROM && x.minute_of_day <= TO,
        )
        .map((x) => {
          const i = x.minute_of_day / 5;
          const nv = ts.neighbors
            .map((n) => n.voltage_max_5min[i])
            .filter((v): v is number => v != null);
          return {
            m: x.minute_of_day,
            inv: x.ac_voltage_v,
            meter: ts.meter_voltage_15m[Math.floor(x.minute_of_day / 15)] ?? null,
            nb: nv.length ? [Math.min(...nv), Math.max(...nv)] : null,
            trip: x.status === "TRIP",
          };
        }),
    [ts],
  );
  const trips = ranges(rows, (r) => r.trip);
  const longest = trips.reduce<[number, number] | null>(
    (best, z) => (!best || z[1] - z[0] > best[1] - best[0] ? z : best),
    null,
  );
  const peak = rows.reduce(
    (p, r) => (r.inv > p.inv ? r : p),
    rows[0] ?? { m: 720, inv: 230, meter: 230 },
  );
  const yMax = Math.ceil(Math.max(g.legal_limit_v + 4, g.max_inverter_voltage_v + 2));
  const yMin = Math.floor(Math.min(228, ...rows.map((r) => r.meter ?? 240)) - 1);
  const hasNb = rows.some((r) => r.nb);
  const vTicks = Array.from(
    { length: Math.floor((yMax - yMin) / 5) + 1 },
    (_, i) => Math.ceil(yMin / 5) * 5 + i * 5,
  ).filter((v) => v <= yMax);

  const lim = fmt(g.legal_limit_v);
  const [takeaway, tone] =
    kind === "grid"
      ? [`Rețeaua · ${fmt(g.max_meter_voltage_v, 1)} V la contor`, "text-critical"]
      : kind === "local"
        ? [`Cablul intern · ${fmt(g.voltage_rise_internal_cable_v, 1)} V în plus`, "text-warning"]
        : g.max_inverter_voltage_v >= g.legal_limit_v
          ? [`${fmt(g.max_inverter_voltage_v, 1)} V la invertor`, "text-warning"]
          : [`Sub ${lim} V`, "text-bone"];

  const legend: LegendItem[] = [
    { color: "var(--bone)", label: "Invertor" },
    { color: "var(--info)", label: "Contor" },
    ...(hasNb ? [{ color: "var(--pewter)", label: "Echipamente", kind: "area" as const }] : []),
    ...(trips.length
      ? [{ color: "var(--critical-border)", label: "Deconectat", kind: "area" as const }]
      : []),
  ];

  return (
    <ChartFrame eyebrow="Tensiune AC" takeaway={takeaway} tone={tone} legend={legend}>
      <div className="h-[260px]">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 14, right: 44, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis {...xMinutes(FROM, TO)} />
            <YAxis
              domain={[yMin, yMax]}
              ticks={vTicks}
              {...AXIS}
              width={48}
              tickFormatter={(v) => `${v} V`}
              allowDataOverflow
            />
            <Tooltip
              animationDuration={80}
              animationEasing="linear"
              useTranslate3d
              cursor={{ stroke: "var(--pewter)" }}
              content={
                <ChartTip
                  rows={(r) => [
                    ["Invertor", `${fmt(r["inv"] as number, 1)} V`],
                    ["Contor", r["meter"] != null ? `${fmt(r["meter"] as number, 1)} V` : null],
                    [
                      "Echipamente",
                      r["nb"]
                        ? `${fmt((r["nb"] as number[])[0]!, 1)}–${fmt((r["nb"] as number[])[1]!, 1)} V`
                        : null,
                    ],
                    ["Stare", r["trip"] ? "oprit" : null],
                  ]}
                />
              }
            />
            <ReferenceArea
              y1={g.legal_limit_v}
              y2={yMax}
              fill="var(--critical)"
              fillOpacity={0.06}
              stroke="none"
              label={{
                value: "peste limita legală",
                position: "insideTopLeft",
                fontSize: 10,
                fill: "var(--critical)",
              }}
            />
            {trips.map(([a, b]) => (
              <ReferenceArea
                key={a}
                x1={a}
                x2={Math.max(b, a + 5)}
                fill="var(--critical)"
                fillOpacity={0.12}
                stroke="none"
                {...(longest && a === longest[0]
                  ? {
                      label: {
                        value: `deconectat ${clock(a)}–${clock(b)}`,
                        position: "insideBottom" as const,
                        fontSize: 10.5,
                        fill: "var(--critical)",
                      },
                    }
                  : {})}
              />
            ))}
            <ReferenceLine
              y={g.legal_limit_v}
              stroke="var(--critical)"
              strokeDasharray="5 4"
              label={{
                value: `${lim} V`,
                position: "right",
                fontSize: 10.5,
                fill: "var(--critical)",
              }}
            />
            {g.inverter_threshold_v !== g.legal_limit_v && (
              <ReferenceLine
                y={g.inverter_threshold_v}
                stroke="var(--warning)"
                strokeDasharray="2 3"
                label={{
                  value: `prag invertor ${fmt(g.inverter_threshold_v)}`,
                  position: "insideBottomRight",
                  fontSize: 10,
                  fill: "var(--warning)",
                }}
              />
            )}
            {hasNb && (
              <Area
                dataKey="nb"
                stroke="none"
                fill="var(--pewter)"
                fillOpacity={0.45}
                isAnimationActive={false}
              />
            )}
            <Line
              dataKey="meter"
              type="monotone"
              stroke="var(--info)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="inv"
              type="monotone"
              stroke="var(--bone)"
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
            {kind === "local" && peak.meter != null && (
              <ReferenceLine
                segment={[
                  { x: peak.m, y: peak.meter },
                  { x: peak.m, y: peak.inv },
                ]}
                stroke="var(--warning)"
                strokeWidth={2.5}
                label={{
                  value: `ΔU cablu +${fmt(g.voltage_rise_internal_cable_v, 1)} V`,
                  position: "right",
                  fontSize: 10.5,
                  fill: "var(--warning)",
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
