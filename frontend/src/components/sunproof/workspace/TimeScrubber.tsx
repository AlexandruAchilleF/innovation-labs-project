import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { SLOTS, VOLTAGE_STOPS, houseVoltageAt, slotLabel, type Congestion } from "@/lib/geo";
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
  const H = 34; // px per side of the axis at 130 %
  const tone = (v: number) =>
    v >= LEGAL_LIMIT_V ? "bg-critical" : v >= DERATING_START_V ? "bg-warning" : "bg-fog/70";
  const c = congestion;

  return (
    <div className="absolute bottom-3 left-1/2 z-10 w-[min(820px,calc(100%-120px))] -translate-x-1/2 rounded-[8px] border border-iron bg-obsidian/90 px-3 pb-2 pt-2.5 shadow-overlay backdrop-blur-sm">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pauză" : "Redă ziua"}
          className="flex size-7 items-center justify-center rounded-[4px] border border-iron text-bone hover:bg-slate"
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <span className="num text-[18px] text-bone">{slotLabel(slot)}</span>
        <span className="eyebrow">{label}</span>
        <span className="num ml-auto flex flex-wrap gap-x-3 text-[12px] text-fog">
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
          <span>
            <span className={c.tripped ? "text-critical" : "text-bone"}>{c.tripped}</span> oprite ·{" "}
            <span className={c.derating ? "text-warning" : "text-bone"}>{c.derating}</span> derating
          </span>
        </span>
      </div>

      <div className="relative" style={{ height: H * 2 + 2 }}>
        <div
          className="absolute inset-x-0 border-t border-dashed border-critical/50"
          style={{ top: H - (100 / 130) * H }}
          title="100% din puterea trafo"
        />
        <div className="absolute inset-x-0 border-t border-iron" style={{ top: H }} />
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
                    ? { bottom: H + 1, height: Math.max(1, (b.pct / 130) * H) }
                    : { top: H + 1, height: Math.max(1, (b.pct / 130) * H) }
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
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>

      <div className="num mt-1 flex justify-between text-[10px] text-smoke">
        {["00:00", "06:00", "12:00", "18:00", "24:00"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-fog">
        <span className="eyebrow !text-[10px]">Tensiune</span>
        {VOLTAGE_STOPS.map(([v, token], i) => (
          <span key={v} className="flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-[1px]" style={{ background: `var(${token})` }} />
            <span className="num">
              {i === VOLTAGE_STOPS.length - 1 ? `≥${v} V oprire` : `${v} V`}
            </span>
          </span>
        ))}
        <span className="ml-auto">
          ↑ flux invers (export PV) · ↓ consum · linie roșie = 100% kVA
        </span>
      </div>
    </div>
  );
}
