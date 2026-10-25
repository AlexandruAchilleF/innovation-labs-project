import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt } from "@/lib/format";
import { WEEKDAYS_LONG, type DayStat } from "@/lib/month-days";
import { cn } from "@/lib/utils";

export type Metric = "energy" | "money" | "voltage";

const AXIS = { stroke: "var(--smoke)", fontSize: 11, tickLine: false, axisLine: false } as const;

/** The month as 31 columns. Click (or arrow keys in the calendar) picks the day shown below. */
export function DailyChart({
  days,
  selected,
  onSelect,
  limitV,
  hasBattery,
}: {
  days: DayStat[];
  selected: number;
  onSelect: (day: number) => void;
  limitV: number;
  hasBattery: boolean;
}) {
  const tripped = days.some((d) => d.tripMinutes > 0);
  const hasLoss = days.some((d) => d.lostRon > 0);
  const [metric, setMetric] = useState<Metric>(tripped ? "voltage" : "energy");
  const rows = days.map((d) => ({ ...d, lostNeg: -d.lostRon }));
  const vMax = Math.max(limitV, ...days.map((d) => d.peakV));
  const vMin = Math.min(...days.map((d) => d.peakV));
  const dim = (day: number) => (day === selected ? 1 : 0.5);

  const tabs: [Metric, string][] = [
    ["energy", "Energie"],
    ["money", "Bani"],
    ["voltage", "Tensiune"],
  ];
  const legend: Record<Metric, [string, string, boolean?][]> = {
    energy: [
      ["var(--success)", "Folosit în casă"],
      ...(hasBattery ? ([["var(--info)", "Prin baterie"]] as [string, string][]) : []),
      ["var(--fog)", "Trimis în rețea"],
      ["var(--bone)", "Consum casă", true],
    ],
    money: [
      ["var(--success)", "Economisit"],
      ...(hasLoss ? ([["var(--critical)", "Pierdut"]] as [string, string][]) : []),
    ],
    voltage: [
      ["var(--bone)", "Vârf tensiune"],
      ...(tripped ? ([["var(--critical)", "Zi cu opriri"]] as [string, string][]) : []),
      ["var(--critical)", `Limită ${fmt(limitV)} V`, true],
    ],
  };

  return (
    <section aria-label="Luna, zi cu zi" className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex rounded-[4px] border border-iron p-0.5">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={metric === k}
              onClick={() => setMetric(k)}
              className={cn(
                "rounded-[3px] px-3 py-1 text-[12.5px] transition-colors",
                metric === k ? "bg-slate text-bone" : "text-fog hover:text-bone",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fog">
          {legend[metric].map(([c, l, dashed]) => (
            <li key={l} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block w-3",
                  dashed ? "border-t border-dashed" : "h-[3px] rounded-full",
                )}
                style={dashed ? { borderColor: c } : { background: c }}
              />
              {l}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 12, right: 4, bottom: 0, left: -12 }}
            barCategoryGap={2}
            stackOffset={metric === "money" ? "sign" : "none"}
            onClick={(e) => e?.activeLabel != null && onSelect(Number(e.activeLabel))}
            className="cursor-pointer"
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" ticks={[1, 8, 15, 22, 29]} {...AXIS} />
            {metric === "energy" && <YAxis {...AXIS} unit=" kWh" width={70} />}
            {metric === "money" && <YAxis {...AXIS} unit=" RON" width={70} />}
            {metric === "voltage" && (
              <YAxis
                domain={[Math.floor(vMin - 4), Math.ceil(vMax + 2)]}
                {...AXIS}
                unit=" V"
                width={64}
              />
            )}
            <Tooltip
              animationDuration={80}
              content={<Tip metric={metric} />}
              cursor={{ fill: "var(--slate)", fillOpacity: 0.6 }}
            />

            {metric === "energy" && (
              <Bar dataKey="selfUsed" stackId="e" fill="var(--success)" isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.day} fillOpacity={dim(r.day)} />
                ))}
              </Bar>
            )}
            {metric === "energy" && hasBattery && (
              <Bar dataKey="battery" stackId="e" fill="var(--info)" isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.day} fillOpacity={dim(r.day)} />
                ))}
              </Bar>
            )}
            {metric === "energy" && (
              <Bar
                dataKey="exported"
                stackId="e"
                fill="var(--fog)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {rows.map((r) => (
                  <Cell key={r.day} fillOpacity={dim(r.day) * 0.8} />
                ))}
              </Bar>
            )}
            {metric === "energy" && (
              <Line
                dataKey="consumed"
                type="monotone"
                stroke="var(--bone)"
                strokeDasharray="4 3"
                strokeWidth={1.25}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {metric === "money" && (
              <Bar
                dataKey="savedRon"
                stackId="m"
                fill="var(--success)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {rows.map((r) => (
                  <Cell key={r.day} fillOpacity={dim(r.day)} />
                ))}
              </Bar>
            )}
            {metric === "money" && hasLoss && (
              <Bar
                dataKey="lostNeg"
                stackId="m"
                fill="var(--critical)"
                radius={[0, 0, 3, 3]}
                isAnimationActive={false}
              >
                {rows.map((r) => (
                  <Cell key={r.day} fillOpacity={dim(r.day)} />
                ))}
              </Bar>
            )}
            {metric === "money" && <ReferenceLine y={0} stroke="var(--pewter)" />}

            {metric === "voltage" && (
              <ReferenceLine
                y={limitV}
                stroke="var(--critical)"
                strokeDasharray="4 4"
                label={{
                  value: `${fmt(limitV)} V`,
                  position: "insideTopLeft",
                  fill: "var(--fog)",
                  fontSize: 11,
                }}
              />
            )}
            {metric === "voltage" && (
              <Line
                dataKey="peakV"
                type="linear"
                stroke="var(--pewter)"
                strokeWidth={1.5}
                isAnimationActive={false}
                dot={(p: { cx?: number; cy?: number; payload?: DayStat }) => (
                  <circle
                    key={p.payload?.day}
                    cx={p.cx}
                    cy={p.cy}
                    r={p.payload?.day === selected ? 5 : 3.5}
                    fill={
                      p.payload && p.payload.tripMinutes > 0 ? "var(--critical)" : "var(--bone)"
                    }
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                )}
                activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
              />
            )}

            <ReferenceLine x={selected} stroke="var(--voltage)" strokeWidth={1.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Tip({
  metric,
  active,
  payload,
}: {
  metric: Metric;
  active?: boolean;
  payload?: { payload: DayStat }[];
}) {
  const r = payload?.[0]?.payload;
  if (!active || !r) return null;
  const lines: [string, string][] =
    metric === "energy"
      ? [
          ["Produs", `${fmt(r.produced, 1)} kWh`],
          ["Folosit în casă", `${fmt(r.selfUsed, 1)} kWh`],
          ...(r.battery > 0
            ? ([["Prin baterie", `${fmt(r.battery, 1)} kWh`]] as [string, string][])
            : []),
          ["Trimis în rețea", `${fmt(r.exported, 1)} kWh`],
          ["Consum casă", `${fmt(r.consumed, 1)} kWh`],
        ]
      : metric === "money"
        ? [
            ["Economisit", `${fmt(r.savedRon, 2)} RON`],
            ...(r.lostRon > 0
              ? ([["Pierdut", `${fmt(r.lostRon, 2)} RON`]] as [string, string][])
              : []),
          ]
        : [
            ["Vârf", `${fmt(r.peakV, 1)} V`],
            ...(r.tripMinutes > 0
              ? ([["Opriri", `${fmt(r.tripMinutes)} min`]] as [string, string][])
              : []),
          ];
  return (
    <div className="rounded-[4px] border border-iron bg-obsidian px-3 py-2 text-[12px]">
      <div className="num text-fog">
        {WEEKDAYS_LONG[r.weekday]}, {r.day} aug.
      </div>
      {lines.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-bone">
          <span className="text-fog">{k}</span>
          <span className="num">{v}</span>
        </div>
      ))}
    </div>
  );
}
