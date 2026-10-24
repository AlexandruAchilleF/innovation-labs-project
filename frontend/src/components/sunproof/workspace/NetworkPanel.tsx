import { useMemo } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { congestionAt, feederRuns, slotLabel } from "@/lib/geo";
import { fmt } from "@/lib/format";
import { DERATING_START_V, LEGAL_LIMIT_V } from "@/lib/sim";
import type { GridState, GridWhatIfParams, GridWhatIfResult, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { CompareView } from "@/routes/harta";
import { Compare, Step } from "./WhatIfParts";
import { DisclosureChevron } from "@/components/sunproof/primitives";

export type NetworkParams = Required<GridWhatIfParams>;

export interface NetworkPanelProps {
  nb: Neighborhood | undefined;
  grid: Neighborhood | GridState | undefined;
  kva: number;
  slot: number;
  params: NetworkParams | null;
  onParams: (p: NetworkParams | null) => void;
  sim: GridWhatIfResult | null;
  loading: boolean;
  view: CompareView;
  onView: (v: CompareView) => void;
}

const defaults = (nb: Neighborhood): NetworkParams => ({
  tap_setting_pct: nb.tap_setting_pct,
  transformer_kva: nb.transformer_kva,
  rebalance_phases: false,
  enable_volt_watt_all: false,
  fix_all_batteries: false,
});
const vTone = (v: number) =>
  v >= LEGAL_LIMIT_V ? "text-critical" : v >= DERATING_START_V ? "text-warning" : "text-bone";

export function NetworkContent({
  nb,
  grid,
  kva,
  slot,
  params,
  onParams,
  sim,
  loading,
  view,
  onView,
}: NetworkPanelProps) {
  const runs = useMemo(() => (grid ? feederRuns(grid, grid.houses) : []), [grid]);
  const c = useMemo(
    () => (grid ? congestionAt(grid, grid.houses, kva, slot) : null),
    [grid, kva, slot],
  );
  if (!nb || !grid || !c) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  const p = params ?? defaults(nb);
  const tripped = grid.houses_tripped;
  const state =
    tripped > 0
      ? { label: `Supraîncărcat la prânz (${tripped} case deconectate)`, tone: "text-critical" }
      : c.index >= 100
        ? {
            label: `Supraîncărcat la ${slotLabel(slot)} (fără case deconectate)`,
            tone: "text-warning",
          }
        : c.index >= 80
          ? { label: "Aproape de limită", tone: "text-warning" }
          : { label: "În parametri normali", tone: "text-bone" };
  const set = (patch: Partial<NetworkParams>) => onParams({ ...p, ...patch });
  const recommend = () =>
    onParams({
      tap_setting_pct: Math.min(nb.tap_setting_pct, 0) - 2.5,
      transformer_kva: Math.max(nb.transformer_kva, 400),
      rebalance_phases: true,
      enable_volt_watt_all: true,
      fix_all_batteries: true,
    });

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-6 pt-4">
      <header>
        <h2 className="font-display text-[20px] leading-tight text-bone">{nb.name}</h2>
        <p
          className="num mt-1 text-[11.5px] text-fog"
          title={
            nb.pv_to_transformer_ratio_pct
              ? `PV instalat: ${fmt(nb.pv_to_transformer_ratio_pct)}% din puterea trafo`
              : undefined
          }
        >
          {kva} kVA · plot {nb.tap_setting_pct > 0 ? "+" : ""}
          {fmt(nb.tap_setting_pct, 1)}% · {grid.houses.length} case
        </p>
      </header>

      <section aria-label="Stare transformator" className="space-y-2">
        <h3 className="eyebrow text-fog">
          Stare transformator{sim && view === "after" ? " · după soluție" : ""}
        </h3>
        <p className={cn("text-[16px] font-medium leading-snug", state.tone)}>{state.label}</p>
        <p
          className="num text-[12px] text-fog"
          title={`Indice de congestie la ${slotLabel(slot)}: ${c.index} (maximul dintre încărcarea termică și marja 230 → 253 V consumată)`}
        >
          Tensiune maximă {fmt(grid.peak_voltage_v, 1)} V · limita {fmt(LEGAL_LIMIT_V)} V
        </p>
      </section>

      <details className="group">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[12.5px] text-fog hover:text-bone">
          Detalii pe plecări (străzi)
          <DisclosureChevron />
        </summary>
        <div className="mt-2">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] text-fog">
                <th className="pb-1.5 font-normal">Plecare</th>
                <th className="pb-1.5 text-right font-normal">Umax</th>
                <th className="pb-1.5 text-right font-normal">Încărcare</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const f = c.feeders.find((x) => x.key === r.key)!;
                return (
                  <tr
                    key={r.key}
                    className="border-t border-border"
                    title={`${r.key} · ${r.houses.length} case · vârf ${fmt(r.peakLoadingPct, 1)}% din ampacitate`}
                  >
                    <td className="max-w-0 truncate py-1.5 pr-2 text-bone">{r.street}</td>
                    <td className={cn("num py-1.5 text-right", vTone(f.maxVoltageV))}>
                      {fmt(f.maxVoltageV, 1)}
                    </td>
                    <td
                      className={cn(
                        "num py-1.5 pl-3 text-right",
                        f.loadingPct >= 100 ? "text-critical" : "text-bone",
                      )}
                    >
                      {fmt(f.loadingPct, 0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      {(nb.headline_ro || nb.recommended_distributor_action_ro) && (
        <details className="group text-[12.5px] leading-relaxed">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-fog hover:text-bone">
            Diagnostic și acțiune recomandată
            <DisclosureChevron />
          </summary>
          <div className="mt-2 space-y-2 text-fog">
            {nb.headline_ro && <p className="text-bone">{nb.headline_ro}</p>}
            {nb.recommended_distributor_action_ro && <p>{nb.recommended_distributor_action_ro}</p>}
          </div>
        </details>
      )}

      <section className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[13px] font-medium text-bone">
            Soluția tehnică pentru distribuitor
            {loading && <Loader2 className="size-3 animate-spin text-fog" />}
          </h3>
          {params && (
            <button
              onClick={() => onParams(null)}
              className="flex items-center gap-1 text-[11.5px] text-fog hover:text-bone"
            >
              <RotateCcw className="size-3" /> Măsurat
            </button>
          )}
        </div>
        <button
          onClick={recommend}
          className="w-full rounded-[4px] border border-bone px-4 py-2 text-[13px] font-medium text-bone transition-colors hover:bg-slate"
        >
          Simulează soluția tehnică (What-If)
        </button>
        {!sim && (
          <p className="text-[11.5px] leading-snug text-fog">
            Plot trafo, putere mărită, reechilibrare faze, Volt-Watt și baterii încărcate la prânz —
            arată înainte și după.
          </p>
        )}
        {sim && (
          <Compare
            sim={sim}
            view={view}
            onView={onView}
            kvaAfter={p.transformer_kva}
            kvaBefore={nb.transformer_kva}
          />
        )}
        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[12.5px] text-fog hover:text-bone">
            Ajustează manual
            <DisclosureChevron />
          </summary>
          <div className="mt-3 space-y-4">
            <Step
              title="Plot transformator"
              value={`${p.tap_setting_pct > 0 ? "+" : ""}${fmt(p.tap_setting_pct, 1)}%`}
            >
              <Slider
                min={-5}
                max={5}
                step={2.5}
                value={[p.tap_setting_pct]}
                onValueChange={(v) => set({ tap_setting_pct: v[0] ?? 0 })}
              />
            </Step>
            <Step title="Putere transformator" value={`${p.transformer_kva} kVA`}>
              <div className="grid grid-cols-4 gap-1">
                {[160, 250, 400, 630].map((k) => (
                  <button
                    key={k}
                    onClick={() => set({ transformer_kva: k })}
                    className={cn(
                      "num rounded-[4px] border py-1 text-[12px]",
                      p.transformer_kva === k
                        ? "border-voltage text-bone"
                        : "border-iron text-fog hover:text-bone",
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </Step>
            {(
              [
                ["rebalance_phases", "Reechilibrare faze"],
                ["enable_volt_watt_all", "Volt-Watt pe toate invertoarele"],
                ["fix_all_batteries", "Baterii încărcate la prânz"],
              ] as const
            ).map(([k, l]) => (
              <label
                key={k}
                className="flex items-center justify-between gap-3 text-[12.5px] text-bone"
              >
                {l}
                <Switch checked={p[k]} onCheckedChange={(v) => set({ [k]: v })} />
              </label>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}

export function NetworkPanel(props: NetworkPanelProps) {
  return (
    <aside className="hidden w-[320px] shrink-0 flex-col border-l border-border bg-canvas xl:flex">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-[13px] text-bone">Rețea</span>
        {props.nb && <span className="num text-[11px] text-fog">{props.nb.transformer_id}</span>}
      </div>
      <NetworkContent {...props} />
    </aside>
  );
}
