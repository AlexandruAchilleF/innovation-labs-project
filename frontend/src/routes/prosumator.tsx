import { useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BatteryCharging, Home, MessageCircleQuestion, Moon, Smartphone, Sun, UtilityPole, Cpu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt } from "@/lib/format";
import { householdQuery, portfolioQuery } from "@/lib/queries";
import { GRID_TARIFF_RON_KWH, eveningBatterySavings } from "@/lib/sim";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProsumerDemoPanels } from "@/components/sunproof/prosumator/ProsumerDemoPanels";

export const Route = createFileRoute("/prosumator")({
  validateSearch: (s: Record<string, unknown>) => ({ household: typeof s["household"] === "string" ? (s["household"] as string) : "RO-B-005" }),
  head: () => ({
    meta: [
      { title: "Aplicația Prosumatorului — SunProof" },
      { name: "description", content: "Explicații simple pentru prosumatori: fluxul de energie al casei, economii cu bateria și ghid de setare." },
      { property: "og:title", content: "Aplicația Prosumatorului — SunProof" },
      { property: "og:description", content: "Explicații simple pentru prosumatori: fluxul de energie al casei, economii cu bateria și ghid de setare." },
    ],
  }),
  component: ProsumatorPage,
});

function ProsumatorPage() {
  const { household } = Route.useSearch();
  const navigate = useNavigate({ from: "/prosumator" });
  const portfolio = useQuery(portfolioQuery());
  const d = useQuery(householdQuery(household));
  const flagships = portfolio.data?.households.filter((h) => h.is_flagship) ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[12px] text-muted-foreground">Bună ziua,</div>
          <h1 className="font-display text-[28px] leading-tight">{d.data?.analysis.customer_name ?? "…"}</h1>
        </div>
        <Select value={household} onValueChange={(v) => navigate({ search: { household: v } })}>
          <SelectTrigger className="w-64 bg-card text-[13px]">
            <SelectValue placeholder="Alege gospodăria" />
          </SelectTrigger>
          <SelectContent>
            {flagships.map((h) => (
              <SelectItem key={h.household_id} value={h.household_id}>
                {h.customer_name} · {h.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {d.data ? <Dashboard key={household} d={d.data} /> : <Skeleton className="h-[600px]" />}
    </main>
  );
}

function Card({ title, icon, children, className }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-5", className)}>
      <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
        <span className="flex size-7 items-center justify-center rounded-[4px] border border-iron text-fog">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Dashboard({ d }: { d: HouseholdDetail }) {
  const s = d.scenario;
  const f = d.analysis.billing_verdict;
  const importKwh = Math.round(f.verified_ron / GRID_TARIFF_RON_KWH);
  const bars = [
    { l: "Produs de panouri", v: f.produced_kwh, c: "bg-sun", note: "total invertor" },
    { l: "Autoconsum direct în casă", v: f.self_consumed_kwh, c: "bg-success", note: `≈ ${fmt(f.self_consumption_savings_ron)} RON economisiți` },
    { l: "Export contor 2.8.0", v: f.meter_export_kwh, c: "bg-info", note: "compensat integral" },
    { l: "Import seara 1.8.0", v: importKwh, c: "bg-critical", note: `taxe rețea ${fmt(f.verified_ron, 2)} RON` },
  ];
  const max = Math.max(...bars.map((b) => b.v));
  return (
    <>
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 space-y-5 md:col-span-5">
        <EnergyFlow d={d} />
        <Card title={`Ghid pas cu pas · ${s.app_name}`} icon={<Smartphone className="size-4" />}>
          <div className="num rounded-lg bg-ink px-3 py-2 text-[11.5px] text-ink-foreground">{s.app_setting_path_ro}</div>
          <ol className="mt-3 grid gap-2">
            {s.app_steps_ro.map((step, i) => (
              <li key={i} className="flex gap-2.5 rounded-lg border border-border p-2.5 text-[12.5px] leading-snug">
                <span className="num flex size-5 shrink-0 items-center justify-center rounded-full border border-iron text-[11px] text-fog">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <div className="col-span-12 space-y-5 md:col-span-7">
        <Card title="1. Răspunsul pe scurt la întrebarea ta" icon={<MessageCircleQuestion className="size-4" />}>
          <blockquote className="rounded-lg border-l border-iron bg-transparent font-display px-4 py-2.5 text-[13.5px] italic text-muted-foreground">„{s.customer_question_ro}”</blockquote>
          <p className="mt-3 text-[14.5px] leading-relaxed">{s.customer_answer_ro}</p>
        </Card>
        <Card title="2. Unde s-a dus energia produsă luna aceasta" icon={<Sun className="size-4" />}>
          <div className="space-y-2.5">
            {bars.map((b) => (
              <div key={b.l}>
                <div className="flex items-baseline justify-between text-[12.5px]">
                  <span className="font-medium">{b.l}</span>
                  <span className="num">
                    <span className="font-semibold">{fmt(b.v)} kWh</span> <span className="text-muted-foreground">· {b.note}</span>
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-[4px] bg-muted">
                  <div className={cn("h-full rounded-[4px]", b.c)} style={{ width: `${(b.v / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-3 overflow-hidden rounded-[4px]">
            <div className="bg-success" style={{ width: `${(f.self_consumed_kwh / f.produced_kwh) * 100}%` }} />
            <div className="bg-info" style={{ width: `${(f.meter_export_kwh / f.produced_kwh) * 100}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            <span className="num font-semibold text-success">{fmt((f.self_consumed_kwh / f.produced_kwh) * 100, 1)}%</span> din producție a fost folosită direct în casă, fără să treacă prin contor. Importul de seară plătește tarife de rețea de{" "}
            <span className="num font-medium text-foreground">{fmt(GRID_TARIFF_RON_KWH, 2)} RON/kWh</span>, care nu se pot compensa.
          </p>
        </Card>
        <SavingsCalculator d={d} />
      </div>
    </div>
    <ProsumerDemoPanels d={d} />
    </>
  );
}

function EnergyFlow({ d }: { d: HouseholdDetail }) {
  const [evening, setEvening] = useState(false);
  const pt = d.timeseries.minutes.find((m) => m.minute_of_day === (evening ? 20 * 60 : 13 * 60)) ?? d.timeseries.minutes[0]!;
  const hasBatt = d.analysis.battery_verdict.battery_kwh > 0;
  const nodes = {
    sun: { x: 160, y: 40 },
    inv: { x: 160, y: 140 },
    house: { x: 290, y: 140 },
    batt: { x: 60, y: 240 },
    grid: { x: 260, y: 240 },
  };
  const flows: { from: keyof typeof nodes; to: keyof typeof nodes; kw: number; color: string }[] = [
    { from: "sun", to: "inv", kw: pt.pv_power_kw, color: "var(--sun)" },
    { from: "inv", to: "house", kw: pt.house_load_kw, color: "var(--success)" },
    { from: pt.battery_power_kw < 0 ? "inv" : "batt", to: pt.battery_power_kw < 0 ? "batt" : "inv", kw: Math.abs(pt.battery_power_kw), color: "var(--info)" },
    { from: pt.grid_export_kw > 0 ? "inv" : "grid", to: pt.grid_export_kw > 0 ? "grid" : "inv", kw: Math.max(pt.grid_export_kw, pt.grid_import_kw), color: pt.grid_export_kw > 0 ? "var(--sky)" : "var(--critical)" },
  ];
  const Node = ({ k, icon, label, value }: { k: keyof typeof nodes; icon: ReactNode; label: string; value: string }) => (
    <foreignObject x={nodes[k].x - 44} y={nodes[k].y - 30} width={88} height={64}>
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-ink-line bg-ink-2 text-ink-foreground">
        <span className="text-sun">{icon}</span>
        <span className="text-[9px] uppercase tracking-wider text-ink-muted">{label}</span>
        <span className="num text-[11.5px] font-semibold">{value}</span>
      </div>
    </foreignObject>
  );
  return (
    <section className="flex max-h-[360px] flex-col rounded-lg border border-ink-line bg-ink p-5 text-ink-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Fluxul de energie al casei</h2>
        <div className="flex rounded-[4px] bg-ink-2 p-0.5 text-[11px]">
          {[
            [false, "13:00", <Sun key="s" className="size-3" />],
            [true, "20:00", <Moon key="m" className="size-3" />],
          ].map(([v, l, ic]) => (
            <button key={String(l)} onClick={() => setEvening(v as boolean)} className={cn("flex items-center gap-1 rounded-[4px] px-2.5 py-1", evening === v ? "bg-ink-foreground text-ink" : "text-ink-muted")}>
              {ic as ReactNode} {l as string}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox="0 -16 340 316" preserveAspectRatio="xMidYMid meet" className="min-h-0 w-full flex-1">
        {flows.map((fl, i) => {
          const a = nodes[fl.from];
          const b = nodes[fl.to];
          const active = fl.kw > 0.05 && !(fl.color === "var(--info)" && !hasBatt);
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--ink-line)" strokeWidth={3} />
              {active && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={fl.color} strokeWidth={3} strokeLinecap="round" className="flow-dash" />}
              {active && (
                <text x={(a.x + b.x) / 2 + (a.y === b.y ? 0 : 8)} y={(a.y + b.y) / 2 - (a.y === b.y ? 36 : 4)} textAnchor={a.y === b.y ? "middle" : "start"} fontSize={10} fontWeight={700} fill={fl.color} fontFamily="var(--font-mono)">
                  {fmt(fl.kw, 1)} kW
                </text>
              )}
            </g>
          );
        })}
        <Node k="sun" icon={<Sun className="size-4" />} label="Panouri" value={`${fmt(pt.pv_power_kw, 1)} kW`} />
        <Node k="inv" icon={<Cpu className="size-4" />} label="Invertor" value={d.analysis.inverter_brand} />
        <Node k="house" icon={<Home className="size-4" />} label="Casă" value={`${fmt(pt.house_load_kw, 1)} kW`} />
        <Node k="batt" icon={<BatteryCharging className="size-4" />} label="Baterie" value={hasBatt ? `${fmt(pt.battery_soc_pct)}%` : "—"} />
        <Node k="grid" icon={<UtilityPole className="size-4" />} label={pt.grid_export_kw > 0 ? "Export 2.8.0" : "Import 1.8.0"} value={`${fmt(Math.max(pt.grid_export_kw, pt.grid_import_kw), 1)} kW`} />
      </svg>
      {hasBatt && (
        <div className="mt-1">
          <div className="flex justify-between text-[11px] text-ink-muted">
            <span>SoC baterie</span>
            <span className="num text-ink-foreground">{fmt(pt.battery_soc_pct)}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-[4px] bg-ink-3">
            <div className="h-full rounded-[4px] bg-voltage transition-all" style={{ width: `${pt.battery_soc_pct}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}

function SavingsCalculator({ d }: { d: HouseholdDetail }) {
  const b = d.analysis.battery_verdict;
  const [kwh, setKwh] = useState(b.battery_kwh || 10);
  const [soc, setSoc] = useState(b.battery_kwh ? b.configured_min_soc_pct : 20);
  const now = eveningBatterySavings(kwh, soc);
  const best = eveningBatterySavings(kwh, 20);
  return (
    <Card title="Calculator economii baterie seara" icon={<BatteryCharging className="size-4" />}>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex justify-between text-[12.5px]">
            <span className="text-muted-foreground">Capacitate baterie {b.battery_kwh ? "" : "(simulare)"}</span>
            <span className="num font-semibold">{kwh} kWh</span>
          </div>
          <Slider min={5} max={20} step={1} value={[kwh]} onValueChange={(v) => setKwh(v[0] ?? 10)} />
        </div>
        <div>
          <div className="mb-2 flex justify-between text-[12.5px]">
            <span className="text-muted-foreground">Rezervă minimă (SoC)</span>
            <span className="num font-semibold">{soc}%</span>
          </div>
          <Slider min={5} max={100} step={5} value={[soc]} onValueChange={(v) => setSoc(v[0] ?? 20)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Economie acum</div>
            <div className="num text-xl font-semibold">{fmt(now.ron_month)} RON</div>
            <div className="num text-[11px] text-muted-foreground">{fmt(now.kwh_day, 1)} kWh/seară</div>
          </div>
          <div className="rounded-lg bg-success-soft p-3">
            <div className="text-[10px] uppercase tracking-wide text-success">La 20% rezervă</div>
            <div className="num text-xl font-semibold text-success">{fmt(best.ron_month)} RON</div>
            <div className="num text-[11px] text-success">+{fmt(Math.max(0, best.ron_month - now.ron_month))} RON/lună</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
