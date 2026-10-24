import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
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
import { cn } from "@/lib/utils";

type Tab = "power" | "battery" | "voltage";

const AXIS = { stroke: "var(--smoke)", fontSize: 11, tickLine: false, axisLine: false } as const;
const HOURS = [0, 360, 720, 1080, 1440];

/** One chart card, three views of the selected day. The opening view is the one that tells this household's story. */
export function DayCharts({
  d,
  minute,
  onMinute,
}: {
  d: HouseholdDetail;
  minute: number;
  onMinute: Dispatch<SetStateAction<number>>;
}) {
  const a = d.analysis;
  const b = a.battery_verdict;
  const g = a.grid_verdict;
  const hasBatt = b.battery_kwh > 0;
  const kind = caseKind(d);
  const [tab, setTab] = useState<Tab>(
    kind === "grid" || kind === "local"
      ? "voltage"
      : kind === "battery" && hasBatt
        ? "battery"
        : "power",
  );
  const rows = useMemo(() => {
    const price = new Map(d.timeseries.pzu.map((p) => [p.hour, p.pzu_price_ron_mwh]));
    return d.timeseries.minutes
      .filter((m) => m.minute_of_day % 5 === 0)
      .map((m) => ({
        m: m.minute_of_day,
        pv: m.pv_power_kw,
        expected: m.pvgis_expected_kw,
        load: m.house_load_kw,
        imp: m.grid_import_kw,
        soc: m.battery_soc_pct,
        v: m.ac_voltage_v,
        pzu: price.get(Math.floor(m.minute_of_day / 60)) ?? null,
        trip: m.status === "TRIP" ? m.pvgis_expected_kw : 0,
      }));
  }, [d]);
  const tripped = rows.some((r) => r.trip > 0);
  const vMax = Math.max(g.inverter_threshold_v, ...rows.map((r) => r.v));

  const tabs: [Tab, string][] = [
    ["power", "Putere"],
    ...(hasBatt ? ([["battery", "Baterie"]] as [Tab, string][]) : []),
    ["voltage", "Tensiune"],
  ];
  const legend: Record<Tab, [string, string, boolean?][]> = {
    power: [
      ["var(--sun)", "Producție"],
      ["var(--success)", "Consum casă"],
      ["var(--fog)", "Din rețea"],
      ...(tripped ? ([["var(--critical)", "Pierdut la oprire"]] as [string, string][]) : []),
    ],
    battery: [
      ["var(--info)", "Încărcare baterie %"],
      ["var(--warning)", "Rezervă setată", true],
      ["var(--bone)", "Preț energie"],
    ],
    voltage: [
      ["var(--bone)", "Tensiune la invertor"],
      ["var(--critical)", `Limită ${fmt(g.legal_limit_v)} V`, true],
    ],
  };

  return (
    <section
      aria-label="Ziua ta în grafice"
      className="flex h-full flex-col rounded-lg border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex rounded-[4px] border border-iron p-0.5">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                "rounded-[3px] px-3 py-1 text-[12.5px] transition-colors",
                tab === k ? "bg-slate text-bone" : "text-fog hover:text-bone",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fog">
          {legend[tab].map(([c, l, dashed]) => (
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
      <div className="mt-4 h-[260px] lg:h-auto lg:min-h-[240px] lg:flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
            onClick={(e) => e?.activeLabel != null && onMinute(Number(e.activeLabel))}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="m"
              type="number"
              domain={[0, 1440]}
              ticks={HOURS}
              tickFormatter={(m) => clock(m).slice(0, 2)}
              {...AXIS}
            />
            {tab === "power" && <YAxis {...AXIS} unit=" kW" width={64} />}
            {tab === "battery" && (
              <YAxis yAxisId="soc" domain={[0, 100]} {...AXIS} unit="%" width={56} />
            )}
            {tab === "battery" && (
              <YAxis yAxisId="pzu" orientation="right" hide domain={[0, "dataMax"]} />
            )}
            {tab === "voltage" && (
              <YAxis domain={[220, Math.ceil(vMax + 3)]} {...AXIS} unit=" V" width={64} />
            )}
            <Tooltip content={<Tip tab={tab} />} cursor={{ stroke: "var(--pewter)" }} />

            {tab === "power" && tripped && (
              <Area
                dataKey="trip"
                type="stepAfter"
                stroke="none"
                fill="var(--critical)"
                fillOpacity={0.3}
                isAnimationActive={false}
              />
            )}
            {tab === "power" && (
              <Area
                dataKey="pv"
                type="monotone"
                stroke="var(--sun)"
                strokeWidth={1.5}
                fill="var(--sun)"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
            )}
            {tab === "power" && (
              <Area
                dataKey="imp"
                type="monotone"
                stroke="var(--fog)"
                strokeWidth={1}
                fill="var(--fog)"
                fillOpacity={0.08}
                isAnimationActive={false}
              />
            )}
            {tab === "power" && (
              <Line
                dataKey="load"
                type="monotone"
                stroke="var(--success)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {tab === "battery" && (
              <Area
                yAxisId="soc"
                dataKey="soc"
                type="monotone"
                stroke="var(--info)"
                strokeWidth={1.5}
                fill="var(--info)"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
            )}
            {tab === "battery" && (
              <Line
                yAxisId="pzu"
                dataKey="pzu"
                type="stepAfter"
                stroke="var(--bone)"
                strokeOpacity={0.5}
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {tab === "battery" && (
              <ReferenceLine
                yAxisId="soc"
                y={b.configured_min_soc_pct}
                stroke="var(--warning)"
                strokeDasharray="4 4"
              />
            )}

            {tab === "voltage" && (
              <Line
                dataKey="v"
                type="monotone"
                stroke="var(--bone)"
                strokeWidth={1.25}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {tab === "voltage" && (
              <ReferenceLine y={g.legal_limit_v} stroke="var(--critical)" strokeDasharray="4 4" />
            )}

            <ReferenceLine
              x={minute}
              yAxisId={tab === "battery" ? "soc" : undefined}
              stroke="var(--voltage)"
              strokeWidth={1.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

interface TipProps {
  tab: Tab;
  active?: boolean;
  label?: number;
  payload?: {
    payload: Partial<Record<"pv" | "load" | "imp" | "soc" | "pzu" | "v", number | null>>;
  }[];
}

function Tip({ tab, active, label, payload }: TipProps) {
  const r = payload?.[0]?.payload;
  if (!active || !r || label == null) return null;
  const lines: [string, string][] =
    tab === "power"
      ? [
          ["Producție", `${fmt(r.pv ?? 0, 2)} kW`],
          ["Consum", `${fmt(r.load ?? 0, 2)} kW`],
          ["Din rețea", `${fmt(r.imp ?? 0, 2)} kW`],
        ]
      : tab === "battery"
        ? [
            ["Baterie", `${fmt(r.soc ?? 0)}%`],
            ["Preț", `${fmt(r.pzu ?? 0)} RON/MWh`],
          ]
        : [["Tensiune", `${fmt(r.v ?? 0, 1)} V`]];
  return (
    <div className="rounded-[4px] border border-iron bg-obsidian px-3 py-2 text-[12px]">
      <div className="num text-fog">{clock(label)}</div>
      {lines.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-bone">
          <span className="text-fog">{k}</span>
          <span className="num">{v}</span>
        </div>
      ))}
    </div>
  );
}
