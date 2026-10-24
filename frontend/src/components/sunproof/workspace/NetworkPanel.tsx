import { useMemo, type ReactNode } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { congestionAt, feederRuns, slotLabel, transformerDay } from "@/lib/geo";
import { fmt } from "@/lib/format";
import { DERATING_START_V, LEGAL_LIMIT_V } from "@/lib/sim";
import type { GridState, GridWhatIfParams, GridWhatIfResult, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { CompareView } from "@/routes/harta";
import { Compare, Step } from "./WhatIfParts";

type Params = Required<GridWhatIfParams>;
const defaults = (nb: Neighborhood): Params => ({
  tap_setting_pct: nb.tap_setting_pct,
  transformer_kva: nb.transformer_kva,
  rebalance_phases: false,
  enable_volt_watt_all: false,
  fix_all_batteries: false,
});
const vTone = (v: number) =>
  v >= LEGAL_LIMIT_V ? "text-critical" : v >= DERATING_START_V ? "text-warning" : "text-bone";
const lTone = (p: number) => (p >= 100 ? "bg-critical" : p >= 80 ? "bg-warning" : "bg-bone");

export function NetworkPanel({
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
}: {
  nb: Neighborhood | undefined;
  grid: Neighborhood | GridState | undefined;
  kva: number;
  slot: number;
  params: Params | null;
  onParams: (p: Params | null) => void;
  sim: GridWhatIfResult | null;
  loading: boolean;
  view: CompareView;
  onView: (v: CompareView) => void;
}) {
  const runs = useMemo(() => (grid ? feederRuns(grid, grid.houses) : []), [grid]);
  const c = useMemo(
    () => (grid ? congestionAt(grid, grid.houses, kva, slot) : null),
    [grid, kva, slot],
  );
  if (!nb || !grid || !c) {
    return (
      <aside className="hidden w-[340px] shrink-0 space-y-3 border-l border-border bg-canvas p-4 xl:block">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40" />
      </aside>
    );
  }
  const p = params ?? defaults(nb);
  const set = (patch: Partial<Params>) => onParams({ ...p, ...patch });
  const recommend = () =>
    onParams({
      tap_setting_pct: Math.min(nb.tap_setting_pct, 0) - 2.5,
      transformer_kva: Math.max(nb.transformer_kva, 400),
      rebalance_phases: true,
      enable_volt_watt_all: true,
      fix_all_batteries: true,
    });

  return (
    <aside className="hidden w-[340px] shrink-0 flex-col border-l border-border bg-canvas xl:flex">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-[13px] text-bone">Rețea</span>
        <span className="num text-[11px] text-fog">{nb.transformer_id}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-4">
        <div>
          <h2 className="font-display text-[20px] leading-tight text-bone">{nb.name}</h2>
          <p className="num mt-1 text-[11.5px] text-fog">
            {kva} kVA · plot {nb.tap_setting_pct > 0 ? "+" : ""}
            {fmt(nb.tap_setting_pct, 1)}% · {grid.houses.length} branșamente
            {nb.pv_to_transformer_ratio_pct
              ? ` · PV ${fmt(nb.pv_to_transformer_ratio_pct)}% din kVA`
              : ""}
          </p>
        </div>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="eyebrow">Congestie la {slotLabel(slot)}</span>
            <span
              className={cn(
                "num text-[22px]",
                c.index >= 100 ? "text-critical" : c.index >= 80 ? "text-warning" : "text-bone",
              )}
            >
              {c.index}
            </span>
          </div>
          <div className="h-1 rounded-[1px] bg-iron">
            <div
              className={cn("h-full rounded-[1px] transition-all", lTone(c.index))}
              style={{ width: `${Math.min(100, c.index)}%` }}
            />
          </div>
          <dl className="mt-3 space-y-1 text-[12.5px]">
            <Fact
              k="Încărcare transformator"
              v={
                <span className={c.transformerLoadingPct >= 100 ? "text-critical" : ""}>
                  {fmt(c.transformerLoadingPct, 1)}% · {c.reverseFlow ? "flux invers" : "consum"}
                </span>
              }
            />
            <Fact k="Putere la PT" v={`${fmt(c.activePowerKw, 1)} kW`} />
            <Fact
              k="Tensiune maximă"
              v={<span className={vTone(c.maxVoltageV)}>{fmt(c.maxVoltageV, 1)} V</span>}
            />
            <Fact k="Invertoare oprite / derating" v={`${c.tripped} / ${c.derating}`} />
          </dl>
          <p className="mt-2 text-[11px] leading-relaxed text-smoke">
            Indicele = maximul dintre încărcarea termică (trafo, plecări) și cât din marja 230 → 253
            V a fost consumată.
          </p>
        </section>

        <section>
          <div className="eyebrow mb-2">Plecări JT</div>
          <div className="space-y-2.5">
            {runs.map((r) => {
              const f = c.feeders.find((x) => x.key === r.key)!;
              return (
                <div key={r.key}>
                  <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="truncate text-bone">{r.street}</span>
                    <span className="num shrink-0 text-[11.5px] text-fog">
                      <span className={vTone(f.maxVoltageV)}>{fmt(f.maxVoltageV, 1)} V</span> ·{" "}
                      {fmt(f.loadingPct, 0)}%
                    </span>
                  </div>
                  <div className="relative mt-1 h-1 rounded-[1px] bg-iron">
                    <div
                      className={cn("h-full rounded-[1px] transition-all", lTone(f.loadingPct))}
                      style={{ width: `${Math.min(100, f.loadingPct)}%` }}
                    />
                    <div
                      className="absolute -top-0.5 h-2 w-px bg-fog"
                      style={{ left: `${Math.min(100, r.peakLoadingPct)}%` }}
                      title={`vârf ${fmt(r.peakLoadingPct, 1)}%`}
                    />
                  </div>
                  <div className="num mt-0.5 text-[10.5px] text-smoke">
                    {r.key} · {r.houses.length} case · vârf {fmt(r.peakLoadingPct, 1)}% din
                    ampacitate
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {(nb.headline_ro || nb.recommended_distributor_action_ro) && (
          <section className="space-y-2 border-t border-border pt-3">
            {nb.headline_ro && (
              <p className="text-[13px] leading-relaxed text-bone">{nb.headline_ro}</p>
            )}
            {nb.recommended_distributor_action_ro && (
              <p className="text-[12px] leading-relaxed text-fog">
                {nb.recommended_distributor_action_ro}
              </p>
            )}
          </section>
        )}

        <section className="border-t border-border pt-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow flex items-center gap-2">
              Simulator distribuitor {loading && <Loader2 className="size-3 animate-spin" />}
            </span>
            {params && (
              <button
                onClick={() => onParams(null)}
                className="flex items-center gap-1 text-[11px] text-fog hover:text-bone"
              >
                <RotateCcw className="size-3" /> Măsurat
              </button>
            )}
          </div>
          <div className="overflow-hidden rounded-[8px] border border-iron">
            <Step
              n={1}
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
            <Step n={2} title="Putere transformator" value={`${p.transformer_kva} kVA`}>
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
            <Step n={3} title="Măsuri pe plecări">
              {(
                [
                  ["rebalance_phases", "Reechilibrare faze L1/L2/L3"],
                  ["enable_volt_watt_all", "Volt-Watt P(U) pe toate invertoarele"],
                  ["fix_all_batteries", "Baterii reconfigurate (încărcare la prânz)"],
                ] as const
              ).map(([k, l]) => (
                <label
                  key={k}
                  className="flex items-center justify-between gap-3 py-0.5 text-[12.5px] text-bone"
                >
                  {l}
                  <Switch checked={p[k]} onCheckedChange={(v) => set({ [k]: v })} />
                </label>
              ))}
            </Step>
          </div>
          <button
            onClick={recommend}
            className="mt-3 w-full rounded-[4px] border border-bone px-4 py-2 text-[13px] font-medium text-bone transition-colors hover:bg-slate"
          >
            Aplică pachetul recomandat
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
        </section>
      </div>
    </aside>
  );
}

function Fact({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-fog">{k}</dt>
      <dd className="num text-bone">{v}</dd>
    </div>
  );
}
