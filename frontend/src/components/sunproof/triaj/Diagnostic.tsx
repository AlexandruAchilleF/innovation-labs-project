import { useState, type ReactNode } from "react";
import { FileDown, Send } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import { responsibleLabel } from "@/lib/i18n";
import type { HouseholdDetail, MinutePoint, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertConfirm } from "../AlertConfirm";
import { DisclosureChevron, Row, StatusBadge, axisProps, chartTooltipStyle } from "../primitives";

export function TriageHeader({ d }: { d: HouseholdDetail }) {
  const a = d.analysis;
  const [alertOpen, setAlertOpen] = useState(false);
  const meta: [string, string][] = [
    ["POD", a.pod_code],
    ["PT", a.transformer_id],
    ["Invertor", `${a.inverter_brand} ${a.inverter_model}`],
    ["kWp", fmt(a.installed_pv_kw, 1)],
    ["Fază", a.phase],
    ["Responsabil", responsibleLabel[a.primary_responsible_party] ?? a.primary_responsible_party],
  ];
  return (
    <header className="border-b border-border pb-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-[24px] leading-tight text-bone">{a.customer_name}</h1>
            <span className="num text-[12px] text-fog">
              {a.household_id} · {a.city}
            </span>
            <StatusBadge severity={a.overall_severity} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="max-w-[70ch] text-[14px] leading-relaxed text-bone">
              {a.one_line_triage_ro}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-bone bg-transparent text-bone hover:bg-slate"
                onClick={() => {
                  api.openPdfDossier(a.household_id);
                  toast(`Dosar generat · ${a.transformer_id}`);
                }}
              >
                <FileDown /> Dosar PDF pentru distribuitor
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-iron bg-transparent text-bone hover:bg-slate"
                onClick={() => setAlertOpen(true)}
              >
                <Send /> Alertă tehnician O&M
              </Button>
            </div>
          </div>
          <details className="group mt-2 text-[12px] text-fog">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1 hover:text-bone">
              Detalii instalație
              <DisclosureChevron />
            </summary>
            <p className="mt-2 max-w-[75ch] font-display text-[13px] italic">
              „{d.scenario.customer_question_ro}”
            </p>
            <p className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              {meta.map(([k, v]) => (
                <span key={k}>
                  {k} <span className="text-bone">{v}</span>
                </span>
              ))}
            </p>
          </details>
        </div>
        <dl className="num flex shrink-0 gap-5 text-[12px] sm:text-right">
          <div>
            <dt className="text-fog">Furnizor</dt>
            <dd className="text-[16px] text-bone">
              +{fmt(a.total_supplier_monthly_benefit_ron)} RON
              <span className="text-[11px] text-fog">/lună</span>
            </dd>
          </div>
          <div>
            <dt className="text-fog">Client</dt>
            <dd className="text-[16px] text-bone">
              +{fmt(a.total_customer_monthly_benefit_ron)} RON
              <span className="text-[11px] text-fog">/lună</span>
            </dd>
          </div>
        </dl>
      </div>
      <AlertConfirm d={d} open={alertOpen} onOpenChange={setAlertOpen} />
    </header>
  );
}

function VCard({ title, sev, children }: { title: string; sev: Severity; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-medium text-bone">{title}</h2>
        <StatusBadge severity={sev} />
      </header>
      {children}
    </section>
  );
}

export function VerdictCards({
  d,
  only,
}: {
  d: HouseholdDetail;
  only?: "grid" | "battery" | "billing";
}) {
  const g = d.analysis.grid_verdict;
  const b = d.analysis.battery_verdict;
  const f = d.analysis.billing_verdict;
  return (
    <div className={cn("grid gap-3", !only && "lg:grid-cols-3")}>
      {(!only || only === "grid") && (
        <VCard title="Rețea sau instalație" sev={g.status}>
          <Row
            label="Invertor / contor"
            value={`${fmt(g.max_inverter_voltage_v, 1)} / ${fmt(g.max_meter_voltage_v, 1)} V`}
            tone={g.max_meter_voltage_v >= 253 ? "CRITICAL" : undefined}
          />
          <Row
            label="Vecini declanșați"
            value={`${g.neighbors_affected_simultaneously}/${g.neighbors_total}`}
            tone={g.neighbors_affected_simultaneously >= 2 ? "CRITICAL" : undefined}
          />
          <Row
            label="Cablu intern"
            value={`+${fmt(g.voltage_rise_internal_cable_v, 1)} V`}
            tone={g.voltage_rise_internal_cable_v > 5 ? "WARNING" : undefined}
          />
          <Row
            label="Opriri · pierdere"
            value={`${g.trip_minutes} min · ${fmt(g.lost_ron_month)} RON`}
          />
        </VCard>
      )}
      {(!only || only === "battery") && (
        <VCard title="Baterie și PZU seara" sev={b.status}>
          {b.battery_kwh > 0 ? (
            <>
              <Row
                label="Rezervă setată / dorită"
                value={`${b.configured_min_soc_pct}% / ${b.desired_min_soc_pct}%`}
                tone={b.configured_min_soc_pct !== b.desired_min_soc_pct ? "WARNING" : undefined}
              />
              <Row label="Blocat / zi" value={`${fmt(b.locked_kwh, 1)} kWh`} />
              <Row
                label="Pierdere furnizor"
                value={`${fmt(b.monthly_pzu_loss_ron)} RON/lună`}
                tone={b.monthly_pzu_loss_ron > 0 ? "CRITICAL" : undefined}
              />
              <Row
                label="Pierdere client"
                value={`${fmt(b.customer_grid_tax_loss_ron)} RON/lună`}
              />
            </>
          ) : (
            <p className="text-[12.5px] text-fog">Fără baterie instalată.</p>
          )}
        </VCard>
      )}
      {(!only || only === "billing") && (
        <VCard title="Reconciliere 1.8.0 / 2.8.0" sev={f.status}>
          <Row
            label="Export contor / facturat"
            value={`${fmt(f.meter_export_kwh)} / ${fmt(f.billed_export_kwh)} kWh`}
            tone={f.billed_export_kwh !== f.meter_export_kwh ? "CRITICAL" : undefined}
          />
          <Row
            label="Facturat / corect"
            value={`${fmt(f.billed_ron, 2)} / ${fmt(f.verified_ron, 2)} RON`}
          />
          <Row
            label="Diferență"
            value={`${fmt(f.delta_ron, 2)} RON`}
            tone={f.delta_ron > 0 ? "CRITICAL" : undefined}
          />
        </VCard>
      )}
    </div>
  );
}

function tripZones(minutes: MinutePoint[]) {
  const zones: [string, string][] = [];
  let start: string | null = null;
  let last = "";
  for (const m of minutes) {
    if (m.status === "TRIP") {
      if (!start) start = m.time;
      last = m.time;
    } else if (start) {
      zones.push([start, last]);
      start = null;
    }
  }
  if (start) zones.push([start, last]);
  return zones;
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-medium text-bone">{title}</h2>
        {sub && <span className="num text-[11px] text-fog">{sub}</span>}
      </div>
      <div className="h-56">{children}</div>
    </section>
  );
}

export function EngineeringCharts({ d }: { d: HouseholdDetail }) {
  const ts = d.timeseries;
  const g = d.analysis.grid_verdict;
  const zones = tripZones(ts.minutes);
  const data = ts.minutes.map((m) => ({
    time: m.time,
    inverter: m.ac_voltage_v,
    meter: ts.meter_voltage_15m[Math.floor(m.minute_of_day / 15)] ?? 0,
    pv: m.pv_power_kw,
    pvgis: m.pvgis_expected_kw,
    load: m.house_load_kw,
    pzu: ts.pzu[Math.floor(m.minute_of_day / 60)]?.pzu_price_ron_mwh,
  }));
  const zoneLabel = zones.length
    ? `declanșări ${zones[0]![0]}–${zones[zones.length - 1]![1]}`
    : "fără declanșări";
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ChartCard title="Tensiune invertor vs. contor (PCC)" sub={zoneLabel}>
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            syncId="day"
            margin={{ top: 6, right: 6, left: -20, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" {...axisProps} interval={47} />
            <YAxis domain={[225, 262]} {...axisProps} width={56} tickFormatter={(v) => `${v}V`} />
            <Tooltip {...chartTooltipStyle} />
            {zones.map(([a, b]) => (
              <ReferenceArea
                key={a}
                x1={a}
                x2={b}
                fill="var(--critical)"
                fillOpacity={0.12}
                stroke="none"
              />
            ))}
            <ReferenceLine
              y={253}
              stroke="var(--critical)"
              strokeWidth={1.75}
              strokeDasharray="6 4"
              label={{
                value: "253 V",
                fontSize: 11,
                fill: "var(--critical)",
                position: "insideTopLeft",
              }}
            />
            {g.inverter_threshold_v !== 253 && (
              <ReferenceLine
                y={g.inverter_threshold_v}
                stroke="var(--warning)"
                strokeDasharray="2 3"
                label={{
                  value: `prag ${g.inverter_threshold_v}V`,
                  fontSize: 11,
                  fill: "var(--warning)",
                  position: "insideBottomRight",
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="inverter"
              name="Invertor AC (V)"
              stroke="var(--sun)"
              strokeWidth={2}
              fill="var(--sun)"
              fillOpacity={0.12}
              baseValue={225}
            />
            <Line
              type="monotone"
              dataKey="meter"
              name="Contor PCC (V)"
              stroke="var(--info)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="PV real vs. PVGIS · Consum · PZU" sub="kW · RON/MWh">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            syncId="day"
            margin={{ top: 6, right: -4, left: -20, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" {...axisProps} interval={47} />
            <YAxis yAxisId="kw" {...axisProps} width={56} tickFormatter={(v) => `${v}kW`} />
            <YAxis yAxisId="pzu" orientation="right" {...axisProps} width={40} />
            <Tooltip {...chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--fog)" }} iconType="plainline" />
            {zones.map(([a, b]) => (
              <ReferenceArea
                key={a}
                yAxisId="kw"
                x1={a}
                x2={b}
                fill="var(--critical)"
                fillOpacity={0.12}
                stroke="none"
              />
            ))}
            <Area
              yAxisId="kw"
              type="monotone"
              dataKey="pvgis"
              name="PVGIS (kW)"
              stroke="var(--muted-foreground)"
              strokeDasharray="4 3"
              fill="transparent"
            />
            <Area
              yAxisId="kw"
              type="monotone"
              dataKey="pv"
              name="PV real (kW)"
              stroke="var(--sun)"
              strokeWidth={2}
              fill="var(--sun)"
              fillOpacity={0.14}
            />
            <Area
              yAxisId="kw"
              type="monotone"
              dataKey="load"
              name="Consum casă (kW)"
              stroke="var(--info)"
              strokeWidth={1.5}
              fill="var(--info)"
              fillOpacity={0.1}
            />
            <Line
              yAxisId="pzu"
              type="stepAfter"
              dataKey="pzu"
              name="PZU (RON/MWh)"
              stroke="var(--critical)"
              strokeOpacity={0.75}
              dot={false}
              strokeWidth={1.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
