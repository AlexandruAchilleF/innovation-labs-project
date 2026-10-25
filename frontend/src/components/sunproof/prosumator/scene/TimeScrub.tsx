import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Pause, Play } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { clock } from "@/lib/energy-day";
import { cn } from "@/lib/utils";
import type { MinutePoint } from "@/lib/types";

/** Day scrubber: the production profile doubles as the track, with inverter trips marked in red. */
export function TimeScrub({
  minutes,
  minute,
  onChange,
}: {
  minutes: MinutePoint[];
  minute: number;
  onChange: Dispatch<SetStateAction<number>>;
}) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => onChange((m) => (m + 5) % 1440), 90);
    return () => clearInterval(id);
  }, [playing, onChange]);

  const peak = Math.max(0.1, ...minutes.map((m) => Math.max(m.pv_power_kw, m.pvgis_expected_kw)));
  const X = (m: number) => (m / 1440) * 1000;
  const Y = (kw: number) => 40 - (kw / peak) * 36;
  const area = `M0 40 ${minutes.map((m) => `L${X(m.minute_of_day)} ${Y(m.pv_power_kw)}`).join(" ")} L1000 40 Z`;
  const trips = minutes.filter((m) => m.status === "TRIP");
  const jump = (m: number) => {
    setPlaying(false);
    onChange(m);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setPlaying(!playing)}
        aria-label={playing ? "Oprește derularea zilei" : "Derulează ziua"}
        className="flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-iron text-bone transition-colors hover:bg-slate"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox="0 0 1000 40"
          preserveAspectRatio="none"
          className="absolute inset-x-0 -top-9 h-9 w-full"
          aria-hidden
        >
          <path d={area} fill="var(--sun)" opacity={0.18} />
          {trips.map((m) => (
            <rect
              key={m.minute_of_day}
              x={X(m.minute_of_day)}
              y={0}
              width={Math.max(2, X(5))}
              height={40}
              fill="var(--critical)"
              opacity={0.35}
            />
          ))}
        </svg>
        <Slider
          min={0}
          max={1439}
          step={5}
          value={[minute]}
          onValueChange={(v) => {
            setPlaying(false);
            onChange(v[0] ?? minute);
          }}
          aria-label="Ora din zi"
        />
        <div className="num mt-2 flex justify-between text-[10.5px] text-smoke">
          {[0, 6, 12, 18, 24].map((h) => (
            <span key={h}>{String(h).padStart(2, "0")}</span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {trips[0] && <Jump label="Avarie" to={trips[0].minute_of_day} critical go={jump} />}
        <Jump label="Prânz" to={13 * 60} go={jump} />
        <Jump label="Seară" to={20 * 60} go={jump} />
      </div>
    </div>
  );
}

function Jump({
  label,
  to,
  critical,
  go,
}: {
  label: string;
  to: number;
  critical?: boolean;
  go: (m: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => go(to)}
      className={cn(
        "num rounded-[4px] border px-3 py-2 text-[12px] transition-colors hover:bg-slate",
        critical ? "border-critical-border text-critical" : "border-iron text-fog hover:text-bone",
      )}
    >
      {label} {clock(to)}
    </button>
  );
}
