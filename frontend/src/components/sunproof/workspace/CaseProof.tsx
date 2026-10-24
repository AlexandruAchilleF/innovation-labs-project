import type { CaseKind } from "@/lib/case-summary";
import { fmt } from "@/lib/format";
import { DERATING_START_V } from "@/lib/sim";
import type { HouseholdDetail } from "@/lib/types";
import { CompareBars, ScaleBar, type Marker } from "../viz";
import { DayStrip, Squares } from "../viz-marks";

/** The proof of the main problem drawn, not listed: one mark per engine number that decides the case. */
export function CaseProof({ d, kind }: { d: HouseholdDetail; kind: CaseKind }) {
  const { grid_verdict: g, battery_verdict: b, billing_verdict: f } = d.analysis;

  if (kind === "battery") {
    const conf = b.configured_min_soc_pct;
    const want = b.desired_min_soc_pct;
    return (
      <div className="space-y-4">
        <Caption
          k="Rezerva bateriei"
          v={`${fmt(b.locked_kwh, 1)} kWh/zi blocați`}
          tone="text-warning"
        />
        <ScaleBar
          label={`Rezervă setată ${conf}%, dorită ${want}%`}
          min={0}
          max={100}
          hatch={{ from: Math.min(conf, want), to: Math.max(conf, want) }}
          markers={[
            { value: conf, label: `setat ${conf}%`, tone: "warning" },
            { value: want, label: `dorit ${want}%`, tone: "bone", side: "bottom" },
          ]}
        />
        <div>
          <Caption k="Preț PZU" v="RON/MWh" />
          <div className="mt-2">
            <CompareBars
              rows={[
                { label: "Prânz (încarcă)", value: b.pzu_midday_ron_mwh, tone: "fog" },
                { label: "Seară (ar livra)", value: b.pzu_evening_ron_mwh, tone: "bone" },
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "billing" || kind === "billing_ok") {
    const short = f.meter_export_kwh - f.billed_export_kwh;
    return (
      <div className="space-y-3">
        <Caption
          k="Energie exportată (2.8.0)"
          v={short > 0 ? `lipsesc ${fmt(short)} kWh` : "compensat 1:1"}
          tone={short > 0 ? "text-critical" : "text-success"}
        />
        <CompareBars
          rows={[
            { label: "Contor", value: f.meter_export_kwh, unit: "kWh" },
            {
              label: "Factură",
              value: f.billed_export_kwh,
              unit: "kWh",
              tone: short > 0 ? "critical" : "success",
            },
          ]}
        />
      </div>
    );
  }

  // grid / local / healthy: where the voltage sits against the legal limit, and what it cost today
  const lo = Math.min(240, Math.floor(g.max_meter_voltage_v) - 4);
  const hi = Math.max(g.legal_limit_v + 5, Math.ceil(g.max_inverter_voltage_v) + 2);
  const markers: Marker[] = [
    {
      value: g.max_meter_voltage_v,
      label: `contor ${fmt(g.max_meter_voltage_v, 1)}`,
      tone: g.max_meter_voltage_v >= g.legal_limit_v ? "critical" : "bone",
      side: "bottom",
    },
  ];
  if (kind !== "healthy")
    markers.push({
      value: g.max_inverter_voltage_v,
      label: `invertor ${fmt(g.max_inverter_voltage_v, 1)}`,
      tone: g.max_inverter_voltage_v >= g.legal_limit_v ? "critical" : "bone",
    });
  return (
    <div className="space-y-4">
      <div>
        <Caption
          k="Tensiune maximă azi"
          v={
            kind === "local"
              ? `cablu intern +${fmt(g.voltage_rise_internal_cable_v, 1)} V`
              : `limită ${fmt(g.legal_limit_v)} V`
          }
          tone={kind === "local" ? "text-warning" : "text-critical"}
        />
        <ScaleBar
          label={`Contor ${fmt(g.max_meter_voltage_v, 1)} V, invertor ${fmt(g.max_inverter_voltage_v, 1)} V, limită ${fmt(g.legal_limit_v)} V`}
          min={lo}
          max={hi}
          zones={[
            { from: DERATING_START_V, to: g.legal_limit_v, tone: "warning" },
            { from: g.legal_limit_v, to: hi, tone: "critical" },
          ]}
          markers={markers}
          limit={{ value: g.legal_limit_v, label: fmt(g.legal_limit_v) }}
          span={
            kind === "local"
              ? {
                  from: g.max_meter_voltage_v,
                  to: g.max_inverter_voltage_v,
                  label: `cablu +${fmt(g.voltage_rise_internal_cable_v, 1)} V`,
                }
              : undefined
          }
        />
      </div>
      {kind !== "healthy" && (
        <>
          <div>
            <Caption
              k="Invertor oprit"
              v={`${g.trip_minutes} min azi`}
              tone={g.trip_minutes > 0 ? "text-critical" : "text-fog"}
            />
            <div className="mt-2">
              <DayStrip minutes={d.timeseries.minutes} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-fog">
              Vecini căzuți simultan
              <span className="block text-[11px] text-smoke">
                {kind === "local" ? "rețeaua stradală e sănătoasă" : "pe același transformator"}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Squares hit={g.neighbors_affected_simultaneously} total={g.neighbors_total} />
              <span className="num text-[12.5px] text-bone">
                {g.neighbors_affected_simultaneously}/{g.neighbors_total}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Caption({ k, v, tone = "text-fog" }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12px]">
      <span className="text-fog">{k}</span>
      <span className={`num text-[11.5px] ${tone}`}>{v}</span>
    </div>
  );
}
