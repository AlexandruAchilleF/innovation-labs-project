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
import { ScaleBar, toneBg, type Tone } from "../viz";
import { Gauge } from "../viz-marks";

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
const loadTone = (pct: number): Tone => (pct >= 100 ? "critical" : pct >= 80 ? "warning" : "fog");
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
  // name the binding constraint: voltage trips houses long before the transformer runs hot
  const overV = c.maxVoltageV >= LEGAL_LIMIT_V;
  const state =
    tripped > 0
      ? { label: `Supratensiune · ${tripped} case deconectate azi`, tone: "text-critical" }
      : c.index >= 100
        ? {
            label: overV ? "Tensiune peste limită, fără case deconectate" : "Supraîncărcat termic",
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
    <div className="space-y-6">
      <header>
        <h3 className="text-[14px] font-medium leading-tight text-bone">{nb.name}</h3>
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
          Transformator la {slotLabel(slot)}
          {sim && view === "after" ? " · după soluție" : ""}
        </h3>
        <div className="grid grid-cols-[minmax(0,120px)_1fr] items-center gap-4">
          <div className="text-center">
            <Gauge
              value={c.transformerLoadingPct}
              tone={loadTone(c.transformerLoadingPct)}
              caption={`Încărcare transformator ${fmt(c.transformerLoadingPct)}%`}
            />
            <span className="block text-[11px] text-fog">
              încărcare{c.reverseFlow ? " · flux invers" : ""}
            </span>
          </div>
          <p className={cn("text-[14px] font-medium leading-snug", state.tone)}>{state.label}</p>
        </div>
        <ScaleBar
          label={`Tensiune maximă ${fmt(c.maxVoltageV, 1)} V, limita ${fmt(LEGAL_LIMIT_V)} V`}
          min={230}
          max={Math.max(LEGAL_LIMIT_V + 5, Math.ceil(c.maxVoltageV) + 2)}
          zones={[
            { from: DERATING_START_V, to: LEGAL_LIMIT_V, tone: "warning" },
            { from: LEGAL_LIMIT_V, to: 300, tone: "critical" },
          ]}
          limit={{ value: LEGAL_LIMIT_V, label: `limită ${fmt(LEGAL_LIMIT_V)} V` }}
          markers={[
            {
              value: c.maxVoltageV,
              label: `tensiune max ${fmt(c.maxVoltageV, 1)} V`,
              tone: c.maxVoltageV >= LEGAL_LIMIT_V ? "critical" : "bone",
            },
          ]}
        />
      </section>
      <section aria-label="Plecări (străzi)" className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="eyebrow text-fog">Străzi · încărcare</h3>
          <span className="num text-[10.5px] text-smoke">Umax</span>
        </div>
        <ul className="space-y-1.5">
          {runs.map((r) => {
            const f = c.feeders.find((x) => x.key === r.key)!;
            return (
              <li
                key={r.key}
                className="grid grid-cols-[minmax(0,6.5rem)_1fr_3rem] items-center gap-2 text-[12px]"
                title={`${r.key} · ${r.houses.length} case · vârf ${fmt(r.peakLoadingPct, 1)}% din ampacitate`}
              >
                <span className="truncate text-bone">{r.street}</span>
                <span className="relative h-1.5 rounded-[2px] bg-slate">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-[2px]",
                      toneBg[loadTone(f.loadingPct)],
                    )}
                    style={{ width: `${Math.min(100, (f.loadingPct / 150) * 100)}%` }}
                  />
                  <span className="absolute -inset-y-1 left-2/3 w-px bg-fog/60" />
                </span>
                <span className={cn("num text-right", vTone(f.maxVoltageV))}>
                  {fmt(f.maxVoltageV, 1)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[13px] font-medium text-bone">
            Soluție distribuitor
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
          Simulează soluția
        </button>
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
