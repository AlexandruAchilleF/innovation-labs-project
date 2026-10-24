import type { QuestionAnswer } from "@/lib/case-questions";
import { gridCause } from "@/lib/case-questions";
import { fmt } from "@/lib/format";
import { slotLabel } from "@/lib/geo";
import { DERATING_START_V } from "@/lib/sim";
import type { GridState, HouseholdDetail, Neighborhood } from "@/lib/types";
import { DisclosureChevron } from "../primitives";
import { ScaleBar, type Marker } from "../viz";
import { DayStrip, Squares } from "../viz-marks";
import type { Action } from "./CaseActions";
import { EngineText, Evidence, Facts, Key, QuestionHead, SectionActions } from "./DetailParts";
import { NeighborStrip } from "./NeighborStrip";
import { NetworkContent, type NetworkPanelProps } from "./NetworkPanel";

/** Question 1: midday inverter trip, the grid or the installation. Network context and what-if close it. */
export function DetailGrid({
  d,
  q,
  grid,
  slot,
  network,
  actions,
}: {
  d: HouseholdDetail;
  q: QuestionAnswer;
  grid: Neighborhood | GridState | undefined;
  slot: number;
  network?: NetworkPanelProps | undefined;
  actions: { dossier: Action; alert: Action };
}) {
  const g = d.analysis.grid_verdict;
  const cause = gridCause(d);
  const lo = Math.min(240, Math.floor(g.max_meter_voltage_v) - 4);
  const hi = Math.max(g.legal_limit_v + 5, Math.ceil(g.max_inverter_voltage_v) + 2);
  const markers: Marker[] = [
    {
      value: g.max_meter_voltage_v,
      label: `contor ${fmt(g.max_meter_voltage_v, 1)} V`,
      tone: g.max_meter_voltage_v >= g.legal_limit_v ? "critical" : "bone",
      side: "bottom",
    },
    {
      value: g.max_inverter_voltage_v,
      label: `invertor ${fmt(g.max_inverter_voltage_v, 1)} V`,
      tone: g.max_inverter_voltage_v >= g.legal_limit_v ? "critical" : "bone",
    },
  ];
  const acts =
    g.trip_minutes > 0
      ? cause === "local"
        ? [actions.alert, actions.dossier]
        : [actions.dossier, actions.alert]
      : [];

  return (
    <div className="space-y-6">
      <QuestionHead n={1} q={q} lossRon={g.lost_ron_month} />

      <Evidence
        title="Tensiunea maximă de azi"
        value={`limită ${fmt(g.legal_limit_v)} V`}
        tone="text-critical"
        how={
          <>
            «contor» = tensiunea rețelei la intrarea în casă; «invertor» = ce vede invertorul după
            cablul intern. Peste linia roșie ({fmt(g.legal_limit_v)} V) invertorul e obligat să se
            deconecteze. Dacă diferența dintre cele două e mare, vina e a cablului din casă.
          </>
        }
      >
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
          span={{
            from: g.max_meter_voltage_v,
            to: g.max_inverter_voltage_v,
            label: `cablu +${fmt(g.voltage_rise_internal_cable_v, 1)} V`,
          }}
        />
      </Evidence>

      <Evidence
        title="Când a fost oprit invertorul azi"
        value={`${g.trip_minutes} min oprit`}
        tone={g.trip_minutes > 0 ? "text-critical" : "text-fog"}
        how={
          <>
            Axa = ora zilei (06–20). <Key className="bg-critical">oprit</Key>{" "}
            <Key className="bg-warning/60">putere redusă</Key>. O bandă goală înseamnă că a produs
            normal toată ziua.
          </>
        }
      >
        <DayStrip minutes={d.timeseries.minutes} />
      </Evidence>

      <Evidence
        title="Vecini opriți în același timp"
        value={`${g.neighbors_affected_simultaneously} din ${g.neighbors_total}`}
        how={
          <>
            Fiecare pătrat = o casă pe același transformator;{" "}
            <Key className="bg-critical">s-a oprit în același minut</Key>. Mulți vecini opriți →
            problema e în rețea. Doar clientul → problema e în casa lui.
          </>
        }
      >
        <Squares hit={g.neighbors_affected_simultaneously} total={g.neighbors_total} />
      </Evidence>

      <Facts
        rows={[
          ["Creștere pe cablul intern", `+${fmt(g.voltage_rise_internal_cable_v, 1)} V`],
          ["Cablu intern", `${fmt(g.cable_mm2, 1)} mm² · ${fmt(g.cable_length_m)} m`],
          ["Prag deconectare invertor", `${fmt(g.inverter_threshold_v, 1)} V`],
        ]}
      />

      <EngineText o={g} fallback={g.verdict_text_ro} />
      <SectionActions d={d} actions={acts} />

      {grid && (
        <Evidence
          title={`Strada clientului la ${slotLabel(slot)}`}
          how="Casele vecine în ordinea distanței față de client, cu tensiunea la ora aleasă pe bara de timp de sub hartă."
        >
          <NeighborStrip houses={grid.houses} clientId={d.analysis.household_id} slot={slot} />
        </Evidence>
      )}

      {network && (
        <details open={cause === "grid"} className="group border-t border-border pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-medium text-bone">
            Rețeaua cartierului și soluția pentru distribuitor
            <DisclosureChevron />
          </summary>
          <div className="mt-4">
            <NetworkContent {...network} />
          </div>
        </details>
      )}
    </div>
  );
}
