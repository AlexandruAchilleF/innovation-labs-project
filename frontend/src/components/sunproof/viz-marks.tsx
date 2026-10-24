import { fmt } from "@/lib/format";
import type { MinutePoint } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Pin, pctOf, toneBg, type Tone } from "./viz";

/** `hit` of `total` as a row of squares: neighbours down at the same minute, houses tripped … */
export function Squares({
  hit,
  total,
  tone = "critical",
}: {
  hit: number;
  total: number;
  tone?: Tone;
}) {
  return (
    <span className="flex flex-wrap gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn("size-2.5 rounded-[2px]", i < hit ? toneBg[tone] : "border border-iron")}
        />
      ))}
    </span>
  );
}

/** Half-ring meter, 0 → `max`; a hairline tick marks 100 %. */
export function Gauge({
  value,
  max = 150,
  tone,
  caption,
}: {
  value: number;
  max?: number;
  tone: Tone;
  caption: string;
}) {
  const r = 52;
  const len = Math.PI * r;
  const at = (v: number) => Math.max(0, Math.min(1, v / max));
  const tick = Math.PI * (1 - at(100));
  const color = `var(--${tone === "fog" ? "smoke" : tone})`;
  return (
    <svg viewBox="0 0 128 74" className="w-full max-w-[150px]" role="img" aria-label={caption}>
      <path d="M12 64a52 52 0 0 1 104 0" fill="none" stroke="var(--slate)" strokeWidth="8" />
      <path
        d="M12 64a52 52 0 0 1 104 0"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${len * at(value)} ${len}`}
      />
      <line
        x1={64 + 44 * Math.cos(tick)}
        y1={64 - 44 * Math.sin(tick)}
        x2={64 + 60 * Math.cos(tick)}
        y2={64 - 60 * Math.sin(tick)}
        stroke="var(--fog)"
        strokeWidth="1"
      />
      <text x="64" y="60" textAnchor="middle" className="num" fontSize="20" fill="var(--bone)">
        {fmt(value)}%
      </text>
    </svg>
  );
}

/** Daylight band 06–20 with the minutes the inverter was off (red) or throttled (amber). */
export function DayStrip({
  minutes,
  from = 360,
  to = 1200,
}: {
  minutes: MinutePoint[];
  from?: number;
  to?: number;
}) {
  const segs: { a: number; b: number; s: "TRIP" | "DERATING" }[] = [];
  for (const m of minutes) {
    if (m.minute_of_day < from || m.minute_of_day > to || m.status === "OK") continue;
    const last = segs[segs.length - 1];
    if (last && last.s === m.status && m.minute_of_day - last.b <= 5) last.b = m.minute_of_day + 1;
    else segs.push({ a: m.minute_of_day, b: m.minute_of_day + 1, s: m.status });
  }
  const hours = [6, 9, 12, 15, 18];
  return (
    <div aria-hidden>
      <div className="relative h-3 rounded-[2px] bg-slate">
        {segs.map((s) => (
          <span
            key={s.a}
            className={cn("absolute inset-y-0", s.s === "TRIP" ? "bg-critical" : "bg-warning/60")}
            style={{
              left: `${pctOf(s.a, from, to)}%`,
              width: `${Math.max(0.6, pctOf(s.b, from, to) - pctOf(s.a, from, to))}%`,
            }}
          />
        ))}
      </div>
      <div className="relative mt-1 h-3">
        {hours.map((h) => (
          <Pin key={h} at={pctOf(h * 60, from, to)} className="num text-[10px] text-smoke">
            {String(h).padStart(2, "0")}
          </Pin>
        ))}
      </div>
    </div>
  );
}
