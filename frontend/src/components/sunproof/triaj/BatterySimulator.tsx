import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
import { TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Panel } from "../primitives";
import { AXIS, ChartFrame, ChartTip, xMinutes } from "./chart-kit";

function useDebounced<T>(v: T, ms = 200) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function BatterySimulator({ d }: { d: HouseholdDetail }) {
  const b = d.analysis.battery_verdict;
  const id = d.analysis.household_id;
  const [soc, setSoc] = useState(b.configured_min_soc_pct);
  useEffect(() => setSoc(b.configured_min_soc_pct), [id, b.configured_min_soc_pct]);
  const dsoc = useDebounced(soc);
  const q = useQuery({
    queryKey: ["what-if-battery", id, dsoc],
    queryFn: () => api.whatIfBattery(id, dsoc),
    enabled: b.battery_kwh > 0,
    placeholderData: keepPreviousData,
  });

  if (b.battery_kwh === 0) {
    return (
      <Panel title="Simulator rezervă baterie (SoC)">
        <p className="text-[13px] text-fog">Fără baterie.</p>
      </Panel>
    );
  }
  const r = q.data;
  const chart = r
    ? r.timeseries.before
        .map((m, i) => ({
          m: m.minute_of_day,
          before: m.battery_soc_pct,
          after: r.timeseries.after[i]?.battery_soc_pct,
        }))
        .filter((x) => x.m % 5 === 0)
    : [];
  const peakH = d.timeseries.pzu.filter((p) => p.zone === "EVENING_PEAK").map((p) => p.hour);
  const prices = d.timeseries.pzu.map((p) => p.pzu_price_ron_mwh);
  const pMin = Math.min(...prices);
  const pMax = Math.max(...prices);
  const cards = r
    ? [
        {
          l: "Livrat seara",
          a: r.after.evening_kwh_delivered_day,
          d: r.delta.evening_kwh_delivered_day,
          u: "kWh/zi",
          dec: 1,
        },
        {
          l: "Economie PZU furnizor",
          a: r.after.supplier_pzu_savings_month_ron,
          d: r.delta.supplier_pzu_savings_month_ron,
          u: "RON/lună",
          dec: 0,
        },
        {
          l: "Economie client",
          a: r.after.customer_grid_tax_savings_month_ron,
          d: r.delta.customer_grid_tax_savings_month_ron,
          u: "RON/lună",
          dec: 0,
        },
      ]
    : [];
  const changed = soc !== b.configured_min_soc_pct;
  return (
    <ChartFrame
      eyebrow="Rezervă baterie"
      takeaway={
        r
          ? changed
            ? `${fmt(r.before.evening_kwh_delivered_day, 1)} → ${fmt(r.after.evening_kwh_delivered_day, 1)} kWh seara`
            : `${fmt(b.locked_kwh, 1)} kWh blocați`
          : "…"
      }
      tone={changed || b.locked_kwh <= 0 ? "text-bone" : "text-warning"}
      legend={[
        { color: "var(--info)", label: changed ? "După" : "Încărcare" },
        ...(changed ? [{ color: "var(--fog)", label: "Acum", kind: "dash" as const }] : []),
        { color: "var(--warning)", label: "Rezervă", kind: "dash" },
        { color: "var(--sun-soft)", label: "Seară", kind: "area" },
      ]}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-[220px] flex-1">
          <Slider
            min={5}
            max={100}
            step={1}
            value={[soc]}
            onValueChange={(v) => setSoc(v[0] ?? 5)}
            aria-label="Rezervă minimă baterie"
          />
          <div className="num mt-1.5 flex justify-between text-[10.5px] text-smoke">
            <span>5%</span>
            <span>
              setat acum {b.configured_min_soc_pct}% · dorit {b.desired_min_soc_pct}%
            </span>
            <span>100%</span>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setSoc(b.desired_min_soc_pct)}>
          Aplică {b.desired_min_soc_pct}%
        </Button>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-4 border-y border-border py-3">
        {cards.map((c) => (
          <div key={c.l}>
            <dt className="text-[11.5px] text-fog">{c.l}</dt>
            <dd className="num mt-0.5 flex items-center gap-1 text-[17px] text-bone">
              {fmt(c.a, c.dec)} <span className="text-[11px] text-fog">{c.u}</span>
              {Math.abs(c.d) >= 0.05 &&
                (c.d > 0 ? (
                  <TrendingUp className="size-3.5 text-success" aria-label="crește" />
                ) : (
                  <TrendingDown className="size-3.5 text-critical" aria-label="scade" />
                ))}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 h-[180px]">
        <ResponsiveContainer>
          <ComposedChart data={chart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis {...xMinutes(0, 1440, 3)} />
            <YAxis domain={[0, 100]} {...AXIS} width={48} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              animationDuration={80}
              animationEasing="linear"
              useTranslate3d
              cursor={{ stroke: "var(--pewter)" }}
              content={
                <ChartTip
                  rows={(x) => [
                    [changed ? "După" : "Baterie", `${fmt(x["after"] as number)}%`],
                    ["Acum", changed ? `${fmt(x["before"] as number)}%` : null],
                  ]}
                />
              }
            />
            {peakH.length > 0 && (
              <ReferenceArea
                x1={Math.min(...peakH) * 60}
                x2={(Math.max(...peakH) + 1) * 60}
                fill="var(--sun)"
                fillOpacity={0.14}
                stroke="none"
              />
            )}
            <ReferenceLine y={soc} stroke="var(--warning)" strokeDasharray="4 4" />
            <Area
              dataKey="after"
              type="monotone"
              stroke="var(--info)"
              strokeWidth={1.75}
              fill="var(--info)"
              fillOpacity={0.05}
              isAnimationActive={false}
            />
            {changed && (
              <Line
                dataKey="before"
                type="monotone"
                stroke="var(--fog)"
                strokeDasharray="4 3"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* PZU price per hour, aligned with the plot area above (left = margin + Y-axis width) */}
      <div className="ml-[40px] mr-[8px] mt-1">
        <div className="flex h-2.5 overflow-hidden rounded-[2px]" aria-hidden>
          {d.timeseries.pzu.map((p) => (
            <span
              key={p.hour}
              className="flex-1 bg-sun"
              style={{
                opacity: 0.1 + 0.9 * ((p.pzu_price_ron_mwh - pMin) / Math.max(1, pMax - pMin)),
              }}
              title={`${p.interval_label} · ${fmt(p.pzu_price_ron_mwh)} RON/MWh`}
            />
          ))}
        </div>
        <p className="num mt-1 flex justify-between text-[10.5px] text-smoke">
          <span>Preț PZU pe ore</span>
          <span>
            {fmt(pMin)} – {fmt(pMax)} RON/MWh
          </span>
        </p>
      </div>
    </ChartFrame>
  );
}
