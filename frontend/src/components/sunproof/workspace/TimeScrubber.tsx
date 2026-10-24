import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { SLOTS, houseVoltageAt, slotLabel, type Congestion } from "@/lib/geo";
import { fmt } from "@/lib/format";
import { DERATING_START_V, LEGAL_LIMIT_V } from "@/lib/sim";
import type { FeederHouse, TransformerPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Day timeline of the transformer: bars above the axis = reverse flow (PV export, % of kVA),
 * below = consumption. Bar tone = worst connection voltage in that 15-min slot. Drag to scrub.
 */
export function TimeScrubber({
  houses,
  day,
  slot,
  onSlot,
  congestion,
  label,
}: {
  houses: FeederHouse[];
  day: TransformerPoint[];
  slot: number;
  onSlot: (s: number) => void;
  congestion: Congestion;
  label: string;
}) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => onSlot((slot + 1) % SLOTS), 220);
    return () => clearInterval(t);
  }, [playing, slot, onSlot]);

  const bars = useMemo(
    () =>
      day.map((p, s) => ({
        pct: Math.min(130, p.loading_pct),
        reverse: p.active_power_kw < 0,
        maxV: Math.max(230, ...houses.map((h) => houseVoltageAt(h, s))),
      })),
    [day, houses],
  );
  const tone = (v: number) =>
    v >= LEGAL_LIMIT_V ? "bg-critical" : v >= DERATING_START_V ? "bg-warning" : "bg-fog/70";
  const c = congestion;

  return (
    <div className="absolute bottom-3 left-1/2 z-10 w-[min(820px,calc(100%-24px))] -translate-x-1/2 rounded-[8px] border border-iron bg-obsidian/90 px-3 pb-2 pt-2 shadow-overlay backdrop-blur-sm sm:w-[min(820px,calc(100%-120px))] lg:pt-2.5">
      <div className="mb-1.5 flex items-center gap-2 lg:mb-2 lg:flex-wrap lg:gap-x-4 lg:gap-y-1">
        <button
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pauză" : "Redă ziua"}
          className="flex size-7 shrink-0 items-center justify-center rounded-[4px] border border-iron text-bone hover:bg-slate"
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <span className="num text-[15px] text-bone lg:text-[18px]">{slotLabel(slot)}</span>
        <span className="hidden text-[12px] text-fog lg:inline">{label}</span>
        <span className="num ml-auto hidden flex-wrap gap-x-3 text-[12px] text-fog lg:flex">
          <span>
            Trafo{" "}
            <span
              className={cn(
                c.transformerLoadingPct >= 100
                  ? "text-critical"
                  : c.transformerLoadingPct >= 80
                    ? "text-warning"
                    : "text-bone",
              )}
            >
              {fmt(c.transformerLoadingPct, 1)}%
            </span>{" "}
            {c.reverseFlow ? "invers" : "consum"}
          </span>
          <span>
            U<sub>max</sub>{" "}
            <span
              className={cn(
                c.maxVoltageV >= LEGAL_LIMIT_V
                  ? "text-critical"
                  : c.maxVoltageV >= DERATING_START_V
                    ? "text-warning"
                    : "text-bone",
              )}
            >
              {fmt(c.maxVoltageV, 1)} V
            </span>
          </span>
          <span title={`${c.derating} în derating · ${fmt(Math.abs(c.activePowerKw), 0)} kW la PT`}>
            <span className={c.tripped ? "text-critical" : "text-bone"}>{c.tripped}</span> oprite
          </span>
        </span>
      </div>

      <div
        className="relative h-10 lg:h-[70px]"
        title="Bare în sus: flux invers (export PV, % din kVA). Bare în jos: consum. Linia roșie: 100% din puterea trafo."
      >
        <div
          className="absolute inset-x-0 border-t border-dashed border-critical/50"
          style={{ top: `${50 - (100 / 130) * 50}%` }}
          title="100% din puterea trafo"
        />
        <div className="absolute inset-x-0 top-1/2 border-t border-iron" />
        <div className="absolute inset-0 flex">
          {bars.map((b, s) => (
            <div key={s} className="relative h-full flex-1">
              <div
                className={cn(
                  "absolute inset-x-[0.5px] rounded-[1px]",
                  b.reverse ? tone(b.maxV) : "bg-smoke",
                  s === slot && "!bg-voltage",
                )}
                style={
                  b.reverse
                    ? { bottom: "50%", height: `${Math.max(2, (b.pct / 130) * 50)}%` }
                    : { top: "50%", height: `${Math.max(2, (b.pct / 130) * 50)}%` }
                }
              />
            </div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-voltage"
          style={{ left: `${((slot + 0.5) / SLOTS) * 100}%` }}
        />
        <input
          type="range"
          min={0}
          max={SLOTS - 1}
          value={slot}
          onChange={(e) => {
            setPlaying(false);
            onSlot(Number(e.target.value));
          }}
          aria-label="Ora din zi"
          className="absolute inset-0 h-full w-full cursor-ew-resize appearance-none rounded-[4px] bg-transparent focus:outline-none focus:ring-2 focus:ring-voltage focus-visible:ring-2 focus-visible:ring-voltage [&::-moz-range-thumb]:size-0 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:size-0 [&::-webkit-slider-thumb]:appearance-none"
        />
      </div>

      <div className="num mt-1 flex justify-between text-[11px] text-fog">
        {["00:00", "06:00", "12:00", "18:00", "24:00"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}
