import { useState, type ReactNode } from "react";
import { BatteryCharging, Cpu, Home, Moon, Sun, UtilityPole } from "lucide-react";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

/** House energy flow at 13:00 (solar peak) vs. 20:00 (evening peak). */
export function EnergyFlow({ d }: { d: HouseholdDetail }) {
  const [evening, setEvening] = useState(false);
  const pt =
    d.timeseries.minutes.find((m) => m.minute_of_day === (evening ? 20 * 60 : 13 * 60)) ??
    d.timeseries.minutes[0]!;
  const hasBatt = d.analysis.battery_verdict.battery_kwh > 0;
  // inverter and house sit 150 apart so the horizontal flow label fits between the two cards
  const nodes = {
    sun: { x: 150, y: 40 },
    inv: { x: 150, y: 140 },
    house: { x: 296, y: 140 },
    batt: { x: 54, y: 240 },
    grid: { x: 246, y: 240 },
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
      color: pt.grid_export_kw > 0 ? "var(--sky)" : "var(--fog)",
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
    <foreignObject x={nodes[k].x - 48} y={nodes[k].y - 30} width={96} height={64}>
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-ink-line bg-ink-2 text-ink-foreground">
        <span className={k === "sun" ? "text-sun" : "text-ink-muted"}>{icon}</span>
        <span className="text-[11px] font-medium text-ink-muted">{label}</span>
        <span className="num text-[12px] font-medium">{value}</span>
      </div>
    </foreignObject>
  );
  return (
    <section className="flex max-h-[360px] flex-col rounded-lg border border-ink-line bg-ink p-4 text-ink-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-medium">Fluxul de energie al casei</h2>
        <div className="flex rounded-[4px] bg-ink-2 p-1 text-[11px]">
          {[
            [false, "13:00", <Sun key="s" className="size-3" />],
            [true, "20:00", <Moon key="m" className="size-3" />],
          ].map(([v, l, ic]) => (
            <button
              key={String(l)}
              onClick={() => setEvening(v as boolean)}
              className={cn(
                "flex items-center gap-1 rounded-[4px] px-2 py-1",
                evening === v ? "bg-ink-foreground text-ink" : "text-ink-muted",
              )}
            >
              {ic as ReactNode} {l as string}
            </button>
          ))}
        </div>
      </div>
      <svg
        viewBox="0 0 344 284"
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
                  y={(a.y + b.y) / 2 - (a.y === b.y ? 7 : 4)}
                  textAnchor={a.y === b.y ? "middle" : "start"}
                  fontSize={11}
                  fontWeight={500}
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
