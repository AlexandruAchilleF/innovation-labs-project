import { useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { RotateCcw, SlidersHorizontal, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { axisProps, chartTooltipStyle } from "@/components/sunproof/primitives";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import { neighborhoodsQuery } from "@/lib/queries";
import { DERATING_START_V, LEGAL_LIMIT_V } from "@/lib/sim";
import type { FeederHouse, GridState, GridWhatIfParams, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/retea")({
  validateSearch: (s: Record<string, unknown>) => ({ n: typeof s["n"] === "string" ? (s["n"] as string) : "NB-DUMBRAVITA" }),
  head: () => ({
    meta: [
      { title: "Rețea Joasă Tensiune & Cartiere — SunProof" },
      { name: "description", content: "Schemă SCADA a posturilor de transformare și simulator de modernizare a rețelei JT pentru 8 cartiere." },
      { property: "og:title", content: "Rețea Joasă Tensiune & Cartiere — SunProof" },
      { property: "og:description", content: "Schemă SCADA a posturilor de transformare și simulator de modernizare a rețelei JT pentru 8 cartiere." },
    ],
  }),
  component: ReteaPage,
});

const vFill = (v: number) => (v >= LEGAL_LIMIT_V ? "var(--critical)" : v >= DERATING_START_V ? "var(--sun)" : "var(--success)");
const vText = (v: number) => (v >= LEGAL_LIMIT_V ? "text-critical" : v >= DERATING_START_V ? "text-sun" : "text-success");

function ReteaPage() {
  const { n } = Route.useSearch();
  const navigate = useNavigate({ from: "/retea" });
  const list = useQuery(neighborhoodsQuery());
  const nb = list.data?.find((x) => x.neighborhood_id === n) ?? list.data?.[0];

  return (
    <main className="mx-auto max-w-[1800px] space-y-3 px-4 py-3">
      <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
        {list.data
          ? list.data.map((x) => {
              const active = x.neighborhood_id === nb?.neighborhood_id;
              return (
                <button
                  key={x.neighborhood_id}
                  onClick={() => navigate({ search: { n: x.neighborhood_id } })}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                    active ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card hover:border-foreground/30",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-semibold">{x.city}</div>
                    <div className={cn("num truncate text-[10.5px]", active ? "text-ink-muted" : "text-muted-foreground")}>
                      {x.transformer_kva} kVA · {x.tap_setting_pct > 0 ? "+" : ""}
                      {fmt(x.tap_setting_pct, 1)}%
                    </div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-right">
                    <div className={cn("num text-[13px] font-semibold", vText(x.peak_voltage_v))}>{fmt(x.peak_voltage_v, 1)}V</div>
                    <div className={cn("num text-[10px]", x.houses_tripped ? "text-critical" : active ? "text-ink-muted" : "text-muted-foreground")}>
                      {x.houses_tripped ? `${x.houses_tripped} oprite` : "OK"}
                    </div>
                  </div>
                </button>
              );
            })
          : Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
      {nb && <NeighborhoodDetail key={nb.neighborhood_id} nb={nb} />}
    </main>
  );
}

const defaults = (nb: Neighborhood): Required<GridWhatIfParams> => ({
  tap_setting_pct: nb.tap_setting_pct,
  transformer_kva: nb.transformer_kva,
  rebalance_phases: false,
  enable_volt_watt_all: false,
  fix_all_batteries: false,
});

function NeighborhoodDetail({ nb }: { nb: Neighborhood }) {
  const [p, setP] = useState<Required<GridWhatIfParams>>(defaults(nb));
  const q = useQuery({
    queryKey: ["grid-what-if", nb.neighborhood_id, p],
    queryFn: () => api.neighborhoodWhatIf(nb.neighborhood_id, p),
    placeholderData: keepPreviousData,
  });
  const before = q.data?.before;
  const after = q.data?.after;
  const recommend = () =>
    setP({ tap_setting_pct: Math.min(nb.tap_setting_pct, 0) - 2.5, transformer_kva: Math.max(nb.transformer_kva, 400), rebalance_phases: true, enable_volt_watt_all: true, fix_all_batteries: true });

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 min-w-0 space-y-3 md:col-span-8">
        {after ? <ScadaMap nb={nb} houses={after.houses} kva={p.transformer_kva} tap={p.tap_setting_pct} /> : <Skeleton className="h-[420px] rounded-xl" />}
        <div className="grid gap-3 xl:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-3">
            <h3 className="mb-1 text-[12.5px] font-semibold">Profil tensiune de-a lungul străzii · prânz solar</h3>
            <div className="h-52">
              {before && after && (
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="distance_m" name="Distanță" unit="m" {...axisProps} />
                    <YAxis type="number" dataKey="voltage_v" name="Tensiune" domain={[225, 270]} allowDataOverflow {...axisProps} width={56} tickFormatter={(v) => `${v}V`} />
                    <ZAxis range={[36, 36]} />
                    <Tooltip {...chartTooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                    <ReferenceLine y={LEGAL_LIMIT_V} stroke="var(--critical)" strokeWidth={1.5} strokeDasharray="6 4" label={{ value: "253V", fontSize: 10, fill: "var(--critical)", position: "insideTopLeft" }} />
                    <Scatter name="Înainte" data={before.houses} fill="var(--muted-foreground)" fillOpacity={0.4} />
                    <Scatter name="După" data={after.houses} fill="var(--info)" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-border bg-card p-3">
            <h3 className="mb-1 text-[12.5px] font-semibold">Încărcare trafo 24h · flux invers (% din kVA)</h3>
            <div className="h-52">
              <LoadingChart nb={nb} p={p} />
            </div>
          </section>
        </div>
      </div>
      <div className="col-span-12 md:col-span-4">
        <div className="ink-scope space-y-3.5 rounded-xl border border-ink-line bg-ink-2 p-4 text-ink-foreground md:sticky md:top-[112px]">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold">
              <SlidersHorizontal className="size-4 text-sun" /> Simulator Măsuri Distribuitor (What-If)
            </h3>
            <button onClick={() => setP(defaults(nb))} className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink-foreground">
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
          <Ctrl label="Plot transformator" value={`${p.tap_setting_pct > 0 ? "+" : ""}${fmt(p.tap_setting_pct, 1)}%`}>
            <Slider min={-5} max={5} step={2.5} value={[p.tap_setting_pct]} onValueChange={(v) => setP({ ...p, tap_setting_pct: v[0] ?? 0 })} />
            <div className="num mt-1 flex justify-between text-[10px] text-ink-muted">
              <span>-5%</span>
              <span>0</span>
              <span>+5%</span>
            </div>
          </Ctrl>
          <Ctrl label="Putere transformator" value={`${p.transformer_kva} kVA`}>
            <div className="grid grid-cols-4 gap-1">
              {[160, 250, 400, 630].map((k) => (
                <button
                  key={k}
                  onClick={() => setP({ ...p, transformer_kva: k })}
                  className={cn("num rounded-md border py-1 text-[12px]", p.transformer_kva === k ? "border-sun bg-sun text-ink" : "border-ink-line text-ink-muted hover:text-ink-foreground")}
                >
                  {k}
                </button>
              ))}
            </div>
          </Ctrl>
          <div className="space-y-2.5 border-t border-ink-line pt-3">
            {(
              [
                ["rebalance_phases", "Reechilibrează fazele L1/L2/L3"],
                ["enable_volt_watt_all", "Activează Volt-Watt P(U)"],
                ["fix_all_batteries", "Optimizează bateriile"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex items-center justify-between text-[12.5px]">
                {l}
                <Switch checked={p[k]} onCheckedChange={(v) => setP({ ...p, [k]: v })} />
              </label>
            ))}
          </div>
          <button onClick={recommend} className="flex w-full items-center justify-center gap-2 rounded-lg bg-sun py-2 text-[13px] font-semibold text-ink transition-opacity hover:opacity-90">
            <Zap className="size-4" /> Aplică soluția recomandată
          </button>
          {before && after && <Gauges before={before} after={after} />}
        </div>
      </div>
    </div>
  );
}

function Ctrl({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-[12.5px]">
        <span className="text-ink-muted">{label}</span>
        <span className="num font-semibold">{value}</span>
      </div>
      {children}
    </div>
  );
}

function GaugeRow({ label, b, a, max, min = 0, dec = 0, unit = "" }: { label: string; b: number; a: number; max: number; min?: number; dec?: number; unit?: string }) {
  const w = (v: number) => `${Math.max(2, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
        <span className="text-ink-muted">{label}</span>
        <span className="num">
          <span className="text-ink-muted">{fmt(b, dec)}{unit}</span> → <span className={cn("font-semibold", a < b ? "text-success" : a > b ? "text-critical" : "")}>{fmt(a, dec)}{unit}</span>
        </span>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-ink-3">
          <div className="h-full rounded-full bg-critical/70 transition-all" style={{ width: w(b) }} />
        </div>
        <div className="h-1.5 rounded-full bg-ink-3">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: w(a) }} />
        </div>
      </div>
    </div>
  );
}

function Gauges({ before, after }: { before: GridState; after: GridState }) {
  const total = before.houses.length;
  return (
    <div className="space-y-3 border-t border-ink-line pt-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Înainte vs. După</div>
      <GaugeRow label="Case oprite (≥253V)" b={before.houses_tripped} a={after.houses_tripped} max={total} />
      <GaugeRow label="Tensiune maximă" b={before.peak_voltage_v} a={after.peak_voltage_v} min={230} max={270} dec={1} unit="V" />
      <GaugeRow label="Case în derating" b={before.houses_derating} a={after.houses_derating} max={total} />
      {after.houses_tripped === 0 && before.houses_tripped > 0 && (
        <div className="rounded-md border border-success/40 bg-success/15 p-2 text-[12px] font-medium text-success">✓ Toate declanșările prin supratensiune au fost eliminate.</div>
      )}
    </div>
  );
}

function LoadingChart({ nb, p }: { nb: Neighborhood; p: Required<GridWhatIfParams> }) {
  const pv = nb.houses.reduce((s, h) => s + h.pv_kw, 0);
  const data = Array.from({ length: 24 }, (_, h) => {
    const shape = h < 6.5 || h > 19.5 ? 0 : Math.pow(Math.sin(((h - 6.5) / 13) * Math.PI), 1.4);
    const load = nb.houses.length * (0.35 + 0.9 * Math.exp(-((h - 7.5) ** 2)) + 2.1 * Math.exp(-(((h - 20) / 1.8) ** 2)));
    const flow = (absorb: number) => load - pv * 0.85 * shape * absorb;
    return {
      time: `${String(h).padStart(2, "0")}:00`,
      inainte: Math.round((flow(1) / nb.transformer_kva) * 100),
      dupa: Math.round(((p.fix_all_batteries ? flow(0.7) - (h >= 18 && h <= 22 ? -0 : 0) : flow(1)) / p.transformer_kva) * 100),
    };
  });
  return (
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gLoadB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--critical)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--critical)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gLoadA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--info)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--info)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" {...axisProps} interval={3} />
        <YAxis {...axisProps} width={50} tickFormatter={(v) => `${v}%`} />
        <Tooltip {...chartTooltipStyle} />
        <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.3} />
        <ReferenceLine y={-100} stroke="var(--critical)" strokeDasharray="6 4" label={{ value: "-100% flux invers", fontSize: 10, fill: "var(--critical)", position: "insideBottomLeft" }} />
        <Area type="monotone" dataKey="inainte" name="Înainte (%)" stroke="var(--critical)" strokeOpacity={0.7} fill="url(#gLoadB)" />
        <Area type="monotone" dataKey="dupa" name="După (%)" stroke="var(--info)" strokeWidth={2} fill="url(#gLoadA)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ScadaMap({ nb, houses, kva, tap }: { nb: Neighborhood; houses: FeederHouse[]; kva: number; tap: number }) {
  const [sel, setSel] = useState<string | null>(null);
  const rows = ["L1", "L2", "L3"] as const;
  const byRow = rows.map((r) =>
    houses.filter((h) => (h.phase === "3P" ? r === "L2" : h.phase === r)).sort((a, b) => a.distance_m - b.distance_m),
  );
  const W = 1000;
  const rowH = 112;
  const top = 40;
  const H = top + rows.length * rowH;
  const x0 = 190;
  const selected = houses.find((h) => h.house_id === sel);
  const tripped = houses.filter((h) => h.voltage_v >= LEGAL_LIMIT_V).length;

  return (
    <section className="rounded-xl border border-ink-line bg-ink p-5 text-ink-foreground">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold">Schemă monofilară SCADA · {nb.name}</h3>
          <p className="num text-[11px] text-ink-muted">
            {nb.transformer_id} · 20/0,4 kV · {kva} kVA · plot {tap > 0 ? "+" : ""}
            {fmt(tap, 1)}% · {nb.stress_cause_ro}
          </p>
        </div>
        <div className="num flex gap-3 text-[10.5px] text-ink-muted">
          {[
            ["bg-success", "<248V"],
            ["bg-sun", "248–252V derating"],
            ["bg-critical", "≥253V oprit"],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", c)} />
              {l}
            </span>
          ))}
          <span className={cn("font-semibold", tripped ? "text-critical" : "text-success")}>{tripped} oprite</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Schemă rețea">
        <defs>
          <radialGradient id="ptGlow">
            <stop offset="0%" stopColor="var(--sun)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--sun)" stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* Transformer station */}
        <circle cx={80} cy={H / 2 + 10} r={70} fill="url(#ptGlow)" />
        <rect x={30} y={H / 2 - 40} width={100} height={100} rx={12} fill="var(--ink-2)" stroke="var(--sun)" strokeWidth={1.5} />
        <circle cx={68} cy={H / 2 - 2} r={14} fill="none" stroke="var(--sun)" strokeWidth={1.5} />
        <circle cx={92} cy={H / 2 - 2} r={14} fill="none" stroke="var(--sun)" strokeWidth={1.5} />
        <text x={80} y={H / 2 + 30} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink-foreground)">PT</text>
        <text x={80} y={H / 2 + 45} textAnchor="middle" fontSize={9} fill="var(--ink-muted)" fontFamily="var(--font-mono)">20/0,4 kV</text>
        {/* Bus bar */}
        <line x1={150} y1={top + 20} x2={150} y2={H - 30} stroke="var(--ink-muted)" strokeWidth={3} />
        <line x1={130} y1={H / 2 + 10} x2={150} y2={H / 2 + 10} stroke="var(--ink-muted)" strokeWidth={3} />
        {rows.map((r, ri) => {
          const y = top + ri * rowH + 30;
          const list = byRow[ri]!;
          const step = list.length > 0 ? (W - x0 - 40) / list.length : 0;
          return (
            <g key={r}>
              <line x1={150} y1={y} x2={W - 20} y2={y} stroke="var(--ink-line)" strokeWidth={2.5} />
              <line x1={150} y1={y} x2={W - 20} y2={y} stroke="var(--sun)" strokeOpacity={0.35} strokeWidth={1.5} className="flow-dash" />
              <rect x={156} y={y - 11} width={26} height={22} rx={4} fill="var(--ink-3)" />
              <text x={169} y={y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ink-foreground)" fontFamily="var(--font-mono)">{r}</text>
              {list.map((h, i) => {
                const x = x0 + 30 + i * step + step / 2;
                const hot = h.voltage_v >= LEGAL_LIMIT_V;
                const isSel = sel === h.house_id;
                return (
                  <g key={h.house_id} onClick={() => setSel(isSel ? null : h.house_id)} className="cursor-pointer">
                    <line x1={x} y1={y} x2={x} y2={y + 24} stroke="var(--ink-line)" strokeWidth={1.5} />
                    {hot && <circle cx={x} cy={y + 38} r={9} fill="none" stroke="var(--critical)" strokeWidth={2} className="pulse-ring" />}
                    <circle cx={x} cy={y + 38} r={isSel ? 13 : 11} fill="var(--ink-2)" stroke={vFill(h.voltage_v)} strokeWidth={isSel ? 3 : 2} />
                    <text x={x} y={y + 41.5} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--ink-foreground)" fontFamily="var(--font-mono)">{h.house_id.split("-H")[1]}</text>
                    <text x={x} y={y + 64} textAnchor="middle" fontSize={10} fontWeight={700} fill={vFill(h.voltage_v)} fontFamily="var(--font-mono)">{fmt(h.voltage_v, 1)}V</text>
                    <text x={x} y={y + 76} textAnchor="middle" fontSize={8} fill="var(--ink-muted)" fontFamily="var(--font-mono)">{h.distance_m}m · {h.pv_kw}kWp{h.phase === "3P" ? " · 3P" : ""}</text>
                    <text x={x} y={y - 6} textAnchor="middle" fontSize={7} fill="var(--ink-muted)" fontFamily="var(--font-mono)">▲</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex min-h-10 items-center rounded-lg border border-ink-line bg-ink-2 px-3 py-2 text-[12px]">
        {selected ? (
          <div className="num flex flex-wrap gap-x-5 gap-y-1">
            <span className="font-semibold text-ink-foreground">{selected.label}</span>
            <span className="text-ink-muted">Fază <span className="text-ink-foreground">{selected.phase}</span></span>
            <span className="text-ink-muted">Distanță PT <span className="text-ink-foreground">{selected.distance_m} m</span></span>
            <span className="text-ink-muted">PV <span className="text-ink-foreground">{selected.pv_kw} kWp</span></span>
            <span className="text-ink-muted">Tensiune <span className={cn("font-semibold", vText(selected.voltage_v))}>{fmt(selected.voltage_v, 1)} V</span></span>
            <span className={cn("font-semibold", vText(selected.voltage_v))}>
              {selected.voltage_v >= LEGAL_LIMIT_V ? "Invertor oprit (≥253V)" : selected.voltage_v >= DERATING_START_V ? "Derating P(U)" : "Funcționare normală"}
            </span>
          </div>
        ) : (
          <span className="text-ink-muted">Click pe o casă din schemă pentru inspecție detaliată.</span>
        )}
      </div>
    </section>
  );
}
