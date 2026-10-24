import { useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BatteryCharging, Home, Moon, Sun, UtilityPole, Cpu } from "lucide-react";
import { Panel } from "@/components/sunproof/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmt } from "@/lib/format";
import { householdQuery, portfolioQuery } from "@/lib/queries";
import { GRID_TARIFF_RON_KWH, eveningBatterySavings } from "@/lib/sim";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProsumerDemoPanels } from "@/components/sunproof/prosumator/ProsumerDemoPanels";

export const Route = createFileRoute("/prosumator")({
  validateSearch: (s: Record<string, unknown>) => ({
    household: typeof s["household"] === "string" ? (s["household"] as string) : "RO-B-005",
  }),
  head: () => ({
    meta: [
      { title: "Aplicația Prosumatorului — SunProof" },
      {
        name: "description",
        content:
          "Explicații simple pentru prosumatori: fluxul de energie al casei, economii cu bateria și ghid de setare.",
      },
      { property: "og:title", content: "Aplicația Prosumatorului — SunProof" },
      {
        property: "og:description",
        content:
          "Explicații simple pentru prosumatori: fluxul de energie al casei, economii cu bateria și ghid de setare.",
      },
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
        <h1 className="font-display text-[28px] leading-tight text-bone">
          Bună ziua, {d.data?.analysis.customer_name ?? "…"}
        </h1>
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

function Dashboard({ d }: { d: HouseholdDetail }) {
  const s = d.scenario;
  const f = d.analysis.billing_verdict;
  const importKwh = Math.round(f.verified_ron / GRID_TARIFF_RON_KWH);
  const stats: [string, number, string][] = [
    ["Produs", f.produced_kwh, "total invertor"],
    [
      "Folosit în casă",
      f.self_consumed_kwh,
      `≈ ${fmt(f.self_consumption_savings_ron)} RON economisiți`,
    ],
    ["Injectat", f.meter_export_kwh, "compensat integral (2.8.0)"],
    ["Cumpărat seara", importKwh, `tarife rețea ${fmt(f.verified_ron, 2)} RON (1.8.0)`],
  ];
  return (
    <>
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 space-y-5 md:col-span-5">
          <EnergyFlow d={d} />
          <Panel title={`Ghid pas cu pas · ${s.app_name}`}>
            <p className="num text-[11.5px] text-fog">{s.app_setting_path_ro}</p>
            <ol className="mt-3 space-y-2.5">
              {s.app_steps_ro.map((step, i) => (
                <li key={i} className="flex gap-3 text-[13px] leading-snug text-bone">
                  <span className="num w-4 shrink-0 text-fog">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="col-span-12 space-y-5 md:col-span-7">
          <Panel title="Răspunsul la întrebarea ta">
            <p className="font-display text-[14px] italic text-fog">„{s.customer_question_ro}”</p>
            <ClampedText text={s.customer_answer_ro} />
          </Panel>
          <Panel title="Energia ta luna aceasta">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {stats.map(([l, v, note]) => (
                <div key={l} title={note}>
                  <dt className="text-[12px] text-fog">{l}</dt>
                  <dd className="num text-[20px] text-bone">
                    {fmt(v)} <span className="text-[12px] text-fog">kWh</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <SavingsCalculator d={d} />
        </div>
      </div>
      <ProsumerDemoPanels d={d} />
    </>
  );
}

function EnergyFlow({ d }: { d: HouseholdDetail }) {
  const [evening, setEvening] = useState(false);
  const pt =
    d.timeseries.minutes.find((m) => m.minute_of_day === (evening ? 20 * 60 : 13 * 60)) ??
    d.timeseries.minutes[0]!;
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
    {
      from: pt.battery_power_kw < 0 ? "inv" : "batt",
      to: pt.battery_power_kw < 0 ? "batt" : "inv",
      kw: Math.abs(pt.battery_power_kw),
      color: "var(--info)",
    },
    {
      from: pt.grid_export_kw > 0 ? "inv" : "grid",
      to: pt.grid_export_kw > 0 ? "grid" : "inv",
      kw: Math.max(pt.grid_export_kw, pt.grid_import_kw),
      color: pt.grid_export_kw > 0 ? "var(--sky)" : "var(--critical)",
    },
  ];
  const Node = ({
    k,
    icon,
    label,
    value,
  }: {
    k: keyof typeof nodes;
    icon: ReactNode;
    label: string;
    value: string;
  }) => (
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
        <h2 className="text-[13px] font-medium">Fluxul de energie al casei</h2>
        <div className="flex rounded-[4px] bg-ink-2 p-0.5 text-[11px]">
          {[
            [false, "13:00", <Sun key="s" className="size-3" />],
            [true, "20:00", <Moon key="m" className="size-3" />],
          ].map(([v, l, ic]) => (
            <button
              key={String(l)}
              onClick={() => setEvening(v as boolean)}
              className={cn(
                "flex items-center gap-1 rounded-[4px] px-2.5 py-1",
                evening === v ? "bg-ink-foreground text-ink" : "text-ink-muted",
              )}
            >
              {ic as ReactNode} {l as string}
            </button>
          ))}
        </div>
      </div>
      <svg
        viewBox="0 -16 340 316"
        preserveAspectRatio="xMidYMid meet"
        className="min-h-0 w-full flex-1"
      >
        {flows.map((fl, i) => {
          const a = nodes[fl.from];
          const b = nodes[fl.to];
          const active = fl.kw > 0.05 && !(fl.color === "var(--info)" && !hasBatt);
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--ink-line)" strokeWidth={3} />
              {active && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={fl.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  className="flow-dash"
                />
              )}
              {active && (
                <text
                  x={(a.x + b.x) / 2 + (a.y === b.y ? 0 : 8)}
                  y={(a.y + b.y) / 2 - (a.y === b.y ? 36 : 4)}
                  textAnchor={a.y === b.y ? "middle" : "start"}
                  fontSize={10}
                  fontWeight={700}
                  fill={fl.color}
                  fontFamily="var(--font-mono)"
                >
                  {fmt(fl.kw, 1)} kW
                </text>
              )}
            </g>
          );
        })}
        <Node
          k="sun"
          icon={<Sun className="size-4" />}
          label="Panouri"
          value={`${fmt(pt.pv_power_kw, 1)} kW`}
        />
        <Node
          k="inv"
          icon={<Cpu className="size-4" />}
          label="Invertor"
          value={d.analysis.inverter_brand}
        />
        <Node
          k="house"
          icon={<Home className="size-4" />}
          label="Casă"
          value={`${fmt(pt.house_load_kw, 1)} kW`}
        />
        <Node
          k="batt"
          icon={<BatteryCharging className="size-4" />}
          label="Baterie"
          value={hasBatt ? `${fmt(pt.battery_soc_pct)}%` : "—"}
        />
        <Node
          k="grid"
          icon={<UtilityPole className="size-4" />}
          label={pt.grid_export_kw > 0 ? "Export 2.8.0" : "Import 1.8.0"}
          value={`${fmt(Math.max(pt.grid_export_kw, pt.grid_import_kw), 1)} kW`}
        />
      </svg>
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
    <Panel title="Calculator economii baterie seara">
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex justify-between text-[12.5px]">
            <span className="text-muted-foreground">
              Capacitate baterie {b.battery_kwh ? "" : "(simulare)"}
            </span>
            <span className="num text-bone">{kwh} kWh</span>
          </div>
          <Slider
            min={5}
            max={20}
            step={1}
            value={[kwh]}
            onValueChange={(v) => setKwh(v[0] ?? 10)}
          />
        </div>
        <div>
          <div className="mb-2 flex justify-between text-[12.5px]">
            <span className="text-muted-foreground">Rezervă minimă (SoC)</span>
            <span className="num text-bone">{soc}%</span>
          </div>
          <Slider
            min={5}
            max={100}
            step={5}
            value={[soc]}
            onValueChange={(v) => setSoc(v[0] ?? 20)}
          />
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-border pt-3">
          <div>
            <dt className="text-[12px] text-fog">Economie acum</dt>
            <dd className="num text-xl text-bone">{fmt(now.ron_month)} RON</dd>
            <dd className="num text-[11px] text-fog">{fmt(now.kwh_day, 1)} kWh/seară</dd>
          </div>
          <div>
            <dt className="text-[12px] text-fog">La 20% rezervă</dt>
            <dd className="num text-xl text-bone">{fmt(best.ron_month)} RON</dd>
            <dd className="num text-[11px] text-success">
              +{fmt(Math.max(0, best.ron_month - now.ron_month))} RON/lună
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}

/** Long engine explanations: first lines visible, the rest one click away. */
function ClampedText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 max-w-[75ch]">
      <p className={cn("text-[14px] leading-relaxed text-bone", !open && "line-clamp-3")}>{text}</p>
      {text.length > 220 && (
        <button
          onClick={() => setOpen(!open)}
          className="mt-1 text-[12.5px] text-voltage hover:underline"
        >
          {open ? "Mai puțin" : "Citește tot"}
        </button>
      )}
    </div>
  );
}
