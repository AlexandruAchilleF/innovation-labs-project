import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { BatteryCharging, FileDown, Gauge, Receipt, Send, Zap } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import { responsibleLabel, severityLabel } from "@/lib/i18n";
import type { HouseholdDetail, MinutePoint, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Row, StatusBadge, axisProps, chartTooltipStyle } from "../primitives";

const strip: Record<Severity, string> = { CRITICAL: "bg-critical", WARNING: "bg-warning", OK: "bg-success", INFO: "bg-info" };
const sevText: Record<Severity, string> = { CRITICAL: "text-critical", WARNING: "text-sun", OK: "text-success", INFO: "text-sky" };

export function TriageHeader({ d }: { d: HouseholdDetail }) {
  const a = d.analysis;
  const [open, setOpen] = useState(false);
  const tg = useMutation({ mutationFn: () => api.telegram(a.household_id), onSuccess: () => setOpen(true) });
  const meta: [string, string][] = [
    ["POD", a.pod_code],
    ["PT", a.transformer_id],
    ["Invertor", `${a.inverter_brand} ${a.inverter_model}`],
    ["kWp", fmt(a.installed_pv_kw, 1)],
    ["Fază", a.phase],
  ];
  return (
    <div className="bg-banner rounded-xl border border-ink-line p-4 text-ink-foreground">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 rounded-lg border border-ink-line bg-ink/60 px-3 py-2">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-sun">Întrebarea clientului</div>
            <p className="mt-0.5 text-[13px] italic text-ink-foreground/90">„{d.scenario.customer_question_ro}”</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", sevText[a.overall_severity])}>● {severityLabel[a.overall_severity]}</span>
            <h2 className="text-[17px] font-semibold tracking-tight">{a.customer_name}</h2>
            <span className="num text-[12px] text-ink-muted">
              {a.household_id} · {a.city}
            </span>
            <span className="rounded-full border border-ink-line bg-ink/60 px-2 py-0.5 text-[11px] text-ink-muted">{d.scenario.scenario_badge_ro}</span>
          </div>
          <p className="mt-2 flex gap-2 text-[13.5px] font-medium leading-snug">
            <Zap className={cn("mt-0.5 size-4 shrink-0", sevText[a.overall_severity])} />
            {a.one_line_triage_ro}
          </p>
          <div className="num mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
            {meta.map(([k, v]) => (
              <span key={k}>
                {k} <span className="text-ink-foreground">{v}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-2 text-right">
            <div className="rounded-lg border border-ink-line bg-ink/60 px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-ink-muted">Furnizor</div>
              <div className="num text-[15px] font-semibold text-success">+{fmt(a.total_supplier_monthly_benefit_ron)} RON</div>
            </div>
            <div className="rounded-lg border border-ink-line bg-ink/60 px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-ink-muted">Client</div>
              <div className="num text-[15px] font-semibold text-success">+{fmt(a.total_customer_monthly_benefit_ron)} RON</div>
            </div>
          </div>
          <span className="rounded-md bg-ink-foreground px-2 py-1 text-[11px] font-semibold text-ink">Responsabil: {responsibleLabel[a.primary_responsible_party]}</span>
          <div className="flex gap-2">
            <Button size="sm" className="bg-success text-ink-foreground hover:bg-success/90" onClick={() => api.openPdfDossier(a.household_id)}>
              <FileDown /> Dosar PDF ANRE
            </Button>
            <Button size="sm" className="bg-sky text-ink hover:bg-sky/90" onClick={() => tg.mutate()} disabled={tg.isPending}>
              <Send /> {tg.isPending ? "Se trimite…" : "Alertă Telegram Tehnician"}
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Alertă trimisă tehnicianului O&M</DialogTitle>
            <DialogDescription>
              Chat <span className="num">{tg.data?.chat_id}</span>
              {tg.data?.simulated ? " · simulare (mod demo)" : " · trimis prin Telegram"}
            </DialogDescription>
          </DialogHeader>
          <pre className="num max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md bg-ink p-3 text-[12px] leading-relaxed text-ink-foreground">{tg.data?.message_text}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VCard({ n, title, icon, sev, children }: { n: number; title: string; icon: ReactNode; sev: Severity; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className={cn("h-1", strip[sev])} />
      <header className="flex items-center justify-between gap-2 px-3 pt-2.5">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold">
          <span className="num text-muted-foreground">{n}.</span>
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </h3>
        <StatusBadge severity={sev} />
      </header>
      <div className="px-3 pb-3 pt-1.5">{children}</div>
    </section>
  );
}

function CompareBar({ items, max }: { items: { l: string; v: number; tone: string; suffix: string }[]; max: number }) {
  return (
    <div className="space-y-1.5">
      {items.map((x) => (
        <div key={x.l}>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">{x.l}</span>
            <span className="num font-semibold">
              {x.suffix}
            </span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", x.tone)} style={{ width: `${Math.min(100, (x.v / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function VerdictCards({ d, only }: { d: HouseholdDetail; only?: "grid" | "battery" | "billing" }) {
  const g = d.analysis.grid_verdict;
  const b = d.analysis.battery_verdict;
  const f = d.analysis.billing_verdict;
  const vScale = (v: number) => Math.max(0, v - 220);
  return (
    <div className={cn("grid gap-3", !only && "lg:grid-cols-3")}>
      {(!only || only === "grid") && <VCard n={1} title="Rețea vs. Instalație" icon={<Gauge className="size-3.5" />} sev={g.status}>
        <CompareBar
          max={40}
          items={[
            { l: "Invertor AC", v: vScale(g.max_inverter_voltage_v), tone: g.max_inverter_voltage_v >= g.inverter_threshold_v ? "bg-critical" : "bg-sun", suffix: `${fmt(g.max_inverter_voltage_v, 1)} V` },
            { l: "Contor PCC", v: vScale(g.max_meter_voltage_v), tone: g.max_meter_voltage_v >= 253 ? "bg-critical" : "bg-info", suffix: `${fmt(g.max_meter_voltage_v, 1)} V` },
            { l: "Limita EN 50549-1", v: vScale(253), tone: "bg-foreground/30", suffix: "253 V" },
          ]}
        />
        <div className="mt-2">
          <Row label="Cablu intern" value={`+${fmt(g.voltage_rise_internal_cable_v, 1)} V · ${fmt(g.cable_mm2, 1)} mm² × ${g.cable_length_m} m`} tone={g.voltage_rise_internal_cable_v > 5 ? "WARNING" : undefined} />
          <Row label="Prag invertor" value={`${g.inverter_threshold_v} V`} tone={g.inverter_threshold_v < 253 ? "WARNING" : undefined} />
          <Row label="Vecini declanșați" value={`${g.neighbors_affected_simultaneously}/${g.neighbors_total}`} tone={g.neighbors_affected_simultaneously >= 2 ? "CRITICAL" : "OK"} />
          <Row label="Deconectare · pierdere" value={`${g.trip_minutes} min · ${fmt(g.lost_ron_month)} RON`} />
        </div>
      </VCard>}
      {(!only || only === "battery") && <VCard n={2} title="Baterie & Arbitraj PZU" icon={<BatteryCharging className="size-3.5" />} sev={b.status}>
        {b.battery_kwh > 0 ? (
          <>
            <div className="relative mt-1 h-6 overflow-hidden rounded-md bg-muted">
              <div className="absolute inset-y-0 left-0 bg-success/25" style={{ width: `${b.desired_min_soc_pct}%` }} />
              <div className="absolute inset-y-0 bg-critical/25" style={{ left: `${b.desired_min_soc_pct}%`, width: `${Math.max(0, b.configured_min_soc_pct - b.desired_min_soc_pct)}%` }} />
              <div className="num absolute inset-0 flex items-center justify-between px-2 text-[10.5px] font-semibold">
                <span className="text-success">dorit {b.desired_min_soc_pct}%</span>
                <span className="text-critical">setat {b.configured_min_soc_pct}%</span>
              </div>
            </div>
            <div className="mt-2">
              <Row label="Baterie" value={`${b.battery_brand} · ${fmt(b.battery_kwh)} kWh`} />
              <Row label="Blocat / zi" value={`${fmt(b.locked_kwh, 2)} kWh`} tone={b.locked_kwh > 0 ? "WARNING" : "OK"} />
              <Row label="PZU seară / prânz" value={`${fmt(b.pzu_evening_ron_mwh)} / ${fmt(b.pzu_midday_ron_mwh)} RON/MWh`} />
              <Row label="Pierdere furnizor" value={`${fmt(b.monthly_pzu_loss_ron, 1)} RON/lună`} tone={b.monthly_pzu_loss_ron > 0 ? "CRITICAL" : undefined} />
              <Row label="Pierdere client" value={`${fmt(b.customer_grid_tax_loss_ron, 1)} RON/lună`} tone={b.customer_grid_tax_loss_ron > 0 ? "CRITICAL" : undefined} />
            </div>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">Fără baterie instalată.</div>
        )}
      </VCard>}
      {(!only || only === "billing") && <VCard n={3} title="Reconciliere 1.8.0 / 2.8.0" icon={<Receipt className="size-3.5" />} sev={f.status}>
        <CompareBar
          max={f.produced_kwh || 1}
          items={[
            { l: "Produs invertor", v: f.produced_kwh, tone: "bg-sun", suffix: `${fmt(f.produced_kwh)} kWh` },
            { l: "Autoconsum casă", v: f.self_consumed_kwh, tone: "bg-success", suffix: `${fmt(f.self_consumed_kwh)} kWh` },
            { l: "Contor 2.8.0 export", v: f.meter_export_kwh, tone: "bg-info", suffix: `${fmt(f.meter_export_kwh)} kWh` },
            { l: "Export facturat", v: f.billed_export_kwh, tone: f.billed_export_kwh !== f.meter_export_kwh ? "bg-critical" : "bg-info", suffix: `${fmt(f.billed_export_kwh)} kWh` },
          ]}
        />
        <div className="mt-2">
          <Row label="Facturat / verificat" value={`${fmt(f.billed_ron, 2)} / ${fmt(f.verified_ron, 2)} RON`} />
          <Row label="Diferență" value={`${fmt(f.delta_ron, 2)} RON`} tone={f.delta_ron > 0 ? "CRITICAL" : "OK"} />
        </div>
      </VCard>}
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
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="text-[12.5px] font-semibold">{title}</h3>
        {sub && <span className="num text-[10.5px] text-muted-foreground">{sub}</span>}
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
  const zoneLabel = zones.length ? `declanșări ${zones[0]![0]}–${zones[zones.length - 1]![1]}` : "fără declanșări";
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ChartCard title="Tensiune AC Invertor vs. PCC Contor" sub={zoneLabel}>
        <ResponsiveContainer>
          <ComposedChart data={data} syncId="day" margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--sun)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--sun)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" {...axisProps} interval={47} />
            <YAxis domain={[225, 262]} {...axisProps} width={56} tickFormatter={(v) => `${v}V`} />
            <Tooltip {...chartTooltipStyle} />
            {zones.map(([a, b]) => (
              <ReferenceArea key={a} x1={a} x2={b} fill="var(--critical)" fillOpacity={0.12} stroke="none" />
            ))}
            <ReferenceLine y={253} stroke="var(--critical)" strokeWidth={1.75} strokeDasharray="6 4" label={{ value: "253V (Limita EN 50549-1)", fontSize: 10, fontWeight: 600, fill: "var(--critical)", position: "insideTopLeft" }} />
            {g.inverter_threshold_v !== 253 && <ReferenceLine y={g.inverter_threshold_v} stroke="var(--warning)" strokeDasharray="2 3" label={{ value: `prag ${g.inverter_threshold_v}V`, fontSize: 10, fill: "var(--warning)", position: "insideBottomRight" }} />}
            <Area type="monotone" dataKey="inverter" name="Invertor AC (V)" stroke="var(--sun)" strokeWidth={2} fill="url(#gInv)" baseValue={225} />
            <Line type="monotone" dataKey="meter" name="Contor PCC (V)" stroke="var(--info)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="PV actual vs. PVGIS · Consum · PZU" sub="kW · RON/MWh">
        <ResponsiveContainer>
          <ComposedChart data={data} syncId="day" margin={{ top: 6, right: -4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--sun)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--sun)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gLoad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--info)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--info)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" {...axisProps} interval={47} />
            <YAxis yAxisId="kw" {...axisProps} width={56} tickFormatter={(v) => `${v}kW`} />
            <YAxis yAxisId="pzu" orientation="right" {...axisProps} width={40} />
            <Tooltip {...chartTooltipStyle} />
            {zones.map(([a, b]) => (
              <ReferenceArea key={a} yAxisId="kw" x1={a} x2={b} fill="var(--critical)" fillOpacity={0.12} stroke="none" />
            ))}
            <Area yAxisId="kw" type="monotone" dataKey="pvgis" name="PVGIS (kW)" stroke="var(--muted-foreground)" strokeDasharray="4 3" fill="transparent" />
            <Area yAxisId="kw" type="monotone" dataKey="pv" name="PV actual (kW)" stroke="var(--sun)" strokeWidth={2} fill="url(#gPv)" fillOpacity={1} />
            <Area yAxisId="kw" type="monotone" dataKey="load" name="Consum casă (kW)" stroke="var(--info)" strokeWidth={1.5} fill="url(#gLoad)" fillOpacity={1} />
            <Line yAxisId="pzu" type="stepAfter" dataKey="pzu" name="PZU (RON/MWh)" stroke="var(--critical)" strokeOpacity={0.75} dot={false} strokeWidth={1.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
