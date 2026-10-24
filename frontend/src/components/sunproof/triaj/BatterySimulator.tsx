import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { BatteryCharging } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Panel, axisProps, chartTooltipStyle } from "../primitives";

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
      <Panel title="Simulator Rezervă Baterie (SoC)" icon={<BatteryCharging className="size-4" />}>
        <div className="rounded-md border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">Această gospodărie nu are baterie. Selectați un caz cu baterie (ex. RO-CJ-003).</div>
      </Panel>
    );
  }
  const r = q.data;
  const chart = r ? r.timeseries.before.filter((_, i) => i % 3 === 0).map((m, i) => ({ time: m.time, inainte: m.battery_soc_pct, dupa: r.timeseries.after[i * 3]?.battery_soc_pct })) : [];
  const cards = r
    ? [
        { l: "kWh livrați seara / zi", b: r.before.evening_kwh_delivered_day, a: r.after.evening_kwh_delivered_day, d: r.delta.evening_kwh_delivered_day, u: "kWh", dec: 1 },
        { l: "Economie PZU furnizor", b: r.before.supplier_pzu_savings_month_ron, a: r.after.supplier_pzu_savings_month_ron, d: r.delta.supplier_pzu_savings_month_ron, u: "RON/lună", dec: 0 },
        { l: "Economie taxe rețea client", b: r.before.customer_grid_tax_savings_month_ron, a: r.after.customer_grid_tax_savings_month_ron, d: r.delta.customer_grid_tax_savings_month_ron, u: "RON/lună", dec: 0 },
      ]
    : [];
  return (
    <Panel title="Simulator Rezervă Baterie (SoC)" icon={<BatteryCharging className="size-4" />}>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-baseline justify-between text-[12px] text-muted-foreground">
            <span>SoC minim descărcare</span>
            <span className="num text-lg font-semibold text-foreground">{soc}%</span>
          </div>
          <Slider min={5} max={100} step={1} value={[soc]} onValueChange={(v) => setSoc(v[0] ?? 5)} aria-label="SoC minim" />
          <div className="num mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>5%</span>
            <span>actual: {b.configured_min_soc_pct}%</span>
            <span>100%</span>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setSoc(b.desired_min_soc_pct)}>
          Aplică ce a cerut clientul ({b.desired_min_soc_pct}%)
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.l} className="rounded-md border border-border p-2.5">
            <div className="text-[10px] uppercase leading-tight text-muted-foreground">{c.l}</div>
            <div className="num mt-1 text-[12px] text-muted-foreground">
              {fmt(c.b, c.dec)} → <span className="text-[15px] font-semibold text-foreground">{fmt(c.a, c.dec)}</span>
            </div>
            <div className={cn("num mt-1 inline-block rounded-[4px] px-1.5 py-px text-[11px] font-semibold", c.d > 0 ? "bg-success-soft text-success" : c.d < 0 ? "bg-critical-soft text-critical" : "bg-muted text-muted-foreground")}>
              {c.d > 0 ? "+" : ""}
              {fmt(c.d, c.dec)} {c.u}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 h-36">
        <ResponsiveContainer>
          <LineChart data={chart} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" {...axisProps} interval={15} />
            <YAxis domain={[0, 100]} {...axisProps} unit="%" width={50} />
            <Tooltip {...chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
            <Line type="monotone" dataKey="inainte" name="SoC înainte" stroke="var(--muted-foreground)" strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="dupa" name="SoC după" stroke="var(--success)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
