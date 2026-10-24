import { equipmentFor, flowsAt, pulseSeconds, type FlowKey } from "@/lib/energy-day";
import { fmt } from "@/lib/format";
import type { HouseholdDetail, MinutePoint } from "@/lib/types";
import { iso, path, type P3 } from "./iso";
import { BatteryBank, House, Inverter, LAYOUT, Meter, PanelArray, Pylon } from "./parts";

const RISE = 6 * 60 + 15;
const SET = 20 * 60 + 15;

/**
 * The prosumer's installation as an isometric illustration: panels, inverter, battery (only if
 * installed), meter, house and the public grid. Cables carry pulses whose direction, colour and
 * speed follow the telemetry sample for the selected minute.
 */
export function EnergyScene({ d, p }: { d: HouseholdDetail; p: MinutePoint }) {
  const a = d.analysis;
  const b = a.battery_verdict;
  const eq = equipmentFor(a.installed_pv_kw, b.battery_kwh);
  const peak = Math.max(a.installed_pv_kw, 1);
  const flows = flowsAt(p).filter((f) => eq.batteryModules > 0 || f.key !== "battery");
  const exporting = p.grid_export_kw >= p.grid_import_kw && p.grid_export_kw > 0.05;
  const tripped = p.status === "TRIP";
  const bankEnd = LAYOUT.battery.x + eq.batteryModules * LAYOUT.battery.pitch - 0.4;

  // every cable is described from the inverter/meter outwards; inward flows run it reversed
  const cables: Record<FlowKey, P3[]> = {
    pv: [
      [10.2, 6.3, 0],
      [3.6, 6.3, 0],
      [3.6, LAYOUT.panels.y + 1.6, 0],
    ],
    battery: [
      [11, 6.7, 0],
      [11, 12.6, 0],
      [bankEnd, 12.6, 0],
    ],
    ac: [
      [12.2, 6.3, 0],
      [13.4, 6.3, 0],
      [13.4, 1, 0],
    ],
    home: [
      [13.4, 1, 0],
      [13.4, -2, 0],
      [11.6, -2, 0],
      [11.6, -3.5, 0],
    ],
    grid: [
      [13.4, 1, 0],
      [23.4, 1, 0],
    ],
  };

  const color: Record<FlowKey, string> = {
    pv: "var(--sun)",
    battery: "var(--info)",
    ac: p.pv_power_kw > 0.05 ? "var(--sun)" : "var(--fog)",
    home: "var(--success)",
    grid: exporting ? "var(--sky)" : "var(--fog)",
  };

  const t = (p.minute_of_day - RISE) / (SET - RISE);
  const day = t > 0 && t < 1;
  const sun = { x: 70 + t * 170, y: 250 - Math.sin(Math.PI * t) * 200 };
  const glow = Math.min(1, p.pv_power_kw / peak);
  const [px, py] = iso([3.6, 2, 1.6]);

  return (
    <svg
      viewBox="30 10 780 370"
      className="h-auto w-full"
      role="img"
      aria-label="Fluxul de energie al casei tale"
    >
      {day ? (
        <g>
          <line
            x1={sun.x}
            y1={sun.y}
            x2={px}
            y2={py}
            stroke="var(--sun)"
            strokeOpacity={0.12 * glow}
            strokeWidth={14}
            strokeLinecap="round"
          />
          {Array.from({ length: 8 }, (_, i) => {
            const r = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={sun.x + Math.cos(r) * 20}
                y1={sun.y + Math.sin(r) * 20}
                x2={sun.x + Math.cos(r) * 27}
                y2={sun.y + Math.sin(r) * 27}
                stroke="var(--sun)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx={sun.x} cy={sun.y} r={14} fill="var(--sun)" />
        </g>
      ) : (
        <g transform="translate(90 60)">
          <circle r={13} fill="var(--fog)" opacity={0.6} />
          <circle cx={6} cy={-4} r={12} fill="var(--card)" />
        </g>
      )}

      {/* ground cables, drawn under the equipment */}
      {flows.map((f) => {
        const pts = f.outward ? cables[f.key] : [...cables[f.key]].reverse();
        const active = f.kw > 0.05;
        const w = 2 + 3 * Math.min(1, f.kw / peak);
        return (
          <g key={f.key} fill="none">
            <path
              d={path(cables[f.key])}
              stroke="var(--iron)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {active && (
              <>
                <path
                  d={path(pts)}
                  stroke={color[f.key]}
                  strokeOpacity={0.25}
                  strokeWidth={w}
                  strokeLinejoin="round"
                />
                <path
                  d={path(pts)}
                  stroke={color[f.key]}
                  strokeWidth={w + 1.5}
                  className="energy-pulse"
                  style={{ animationDuration: `${pulseSeconds(f.kw, peak)}s` }}
                />
              </>
            )}
          </g>
        );
      })}

      <PanelArray count={eq.panels} glow={glow} />
      <House lit={Math.min(1, p.house_load_kw / 3)} />
      <Meter />
      <Inverter status={p.status} />
      {eq.batteryModules > 0 && (
        <BatteryBank
          modules={eq.batteryModules}
          soc={p.battery_soc_pct}
          reservePct={b.configured_min_soc_pct}
          locked={b.status !== "OK"}
        />
      )}
      <Pylon live={p.grid_export_kw + p.grid_import_kw > 0.05} />

      <Tag
        at={[3.6, eq.panels > 6 ? -0.4 : 2, 3]}
        value={`${fmt(p.pv_power_kw, 1)} kW`}
        label={`Panouri · ${fmt(a.installed_pv_kw, 1)} kWp`}
        tone="var(--sun)"
      />
      <Tag
        at={[13.2, 6.3, 2.2]}
        anchor="start"
        value={tripped ? `Oprit · ${fmt(p.ac_voltage_v)} V` : `${fmt(p.ac_voltage_v)} V`}
        label={`Invertor ${a.inverter_brand}`}
        tone={tripped ? "var(--critical)" : "var(--bone)"}
      />
      {eq.batteryModules > 0 && (
        <Tag
          at={[LAYOUT.battery.x + (bankEnd - LAYOUT.battery.x) / 2, 14.4, 0]}
          value={`${fmt(p.battery_soc_pct)}%`}
          label={`Baterie · ${fmt(b.battery_kwh, 1)} kWh`}
          tone="var(--info)"
          below
        />
      )}
      <Tag
        at={[11.6, -5, 4.2]}
        value={`${fmt(p.house_load_kw, 1)} kW`}
        label="Casa"
        tone="var(--success)"
      />
      <Tag
        at={[23.4, 1.5, 7.2]}
        value={`${exporting ? "↑" : "↓"} ${fmt(exporting ? p.grid_export_kw : p.grid_import_kw, 1)} kW`}
        label={exporting ? "Trimis în rețea" : "Luat din rețea"}
        tone={exporting ? "var(--sky)" : "var(--fog)"}
      />
    </svg>
  );
}

function Tag({
  at,
  value,
  label,
  tone,
  below,
  anchor = "middle",
}: {
  at: P3;
  value: string;
  label: string;
  tone: string;
  below?: boolean;
  anchor?: "middle" | "start";
}) {
  const [x, y] = iso(at);
  return (
    <g textAnchor={anchor} className="pointer-events-none">
      <text
        x={x}
        y={below ? y + 4 : y - 18}
        fontSize={15}
        fontWeight={500}
        fill={tone}
        fontFamily="var(--font-mono)"
      >
        {value}
      </text>
      <text
        x={x}
        y={below ? y + 20 : y - 2}
        fontSize={10.5}
        fill="var(--fog)"
        fontFamily="var(--font-sans)"
      >
        {label}
      </text>
    </g>
  );
}
