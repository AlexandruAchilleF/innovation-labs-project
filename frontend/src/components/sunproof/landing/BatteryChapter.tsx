import { useState } from "react";
import { Lock } from "lucide-react";
import { Chapter } from "./Chapter";
import { span, useScrollProgress } from "./motion";
import { Overlay, Shot, Toggle } from "./Shot";

type Mode = "locked" | "fixed";
const MODES = [
  ["locked", "Eronat"],
  ["fixed", "Reconfigurat"],
] as const;

/** Pixel positions on /landing/bat-scene.webp (1600×971), the prosumer scene at 20:00. */
const W = 1600;
const H = 971;
const BATTERY = { x: 383, y: 585 };
/** Battery → inverter → meter → house, along the scene's own cables. */
const DISCHARGE = "M470 640 L560 700 L806 560 L990 470 L1110 415 L1170 350 L1250 300";
const SUN_FROM = { x: 760, y: 70 };
const SUN_TO = { x: 427, y: 537 };

/**
 * (b) Scroll-driven sunset: the scene's clock runs 12:00 → 20:00 as you scroll, the sky darkens and the
 * battery, still full, gets locked in its reserve exactly when evening energy is most expensive.
 */
export function BatteryChapter() {
  const [mode, setMode] = useState<Mode>("locked");
  const [stage, p] = useScrollProgress<HTMLDivElement>();
  const t = span(p, 0.05, 0.9);
  const minutes = 12 * 60 + Math.round((t * 8 * 60) / 5) * 5;
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const dusk = span(t, 0.35, 1);
  const glow = Math.sin(Math.PI * span(t, 0.2, 0.95));
  const sun = {
    x: SUN_FROM.x + (SUN_TO.x - SUN_FROM.x) * t,
    y: SUN_FROM.y + (SUN_TO.y - SUN_FROM.y) * t ** 1.6,
  };
  const evening = t > 0.8;
  const fixed = mode === "fixed";
  return (
    <Chapter
      index="02"
      reverse
      title="Stocare indisponibilă în vârful de seară"
      control={<Toggle label="SoC minim" value={mode} options={MODES} onChange={setMode} />}
    >
      <div ref={stage}>
        <Shot
          src="/landing/bat-scene.webp"
          alt="Scena prosumatorului la ora 20: bateria plină, casa cumpără energie din rețea"
          w={W}
          h={H}
          overlay={
            <Overlay
              w={W}
              h={H}
              label={
                fixed
                  ? "Seara, bateria alimentează casa"
                  : "Seara, bateria rămâne plină și casa cumpără din rețea"
              }
            >
              <defs>
                <linearGradient id="lp-dusk" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--navy)" stopOpacity="0.9" />
                  <stop offset="0.75" stopColor="var(--navy)" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="lp-glow" cx="0.3" cy="0.6" r="0.6">
                  <stop offset="0" stopColor="var(--sun)" stopOpacity="0.28" />
                  <stop offset="1" stopColor="var(--sun)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width={W} height={H} fill="url(#lp-glow)" opacity={glow} />
              <rect width={W} height={H} fill="url(#lp-dusk)" opacity={dusk * 0.75} />
              <g opacity={1 - span(t, 0.92, 1)}>
                <circle cx={sun.x} cy={sun.y} r={30} fill="var(--sun)" />
                <circle cx={sun.x} cy={sun.y} r={56} fill="var(--sun)" opacity={0.12} />
              </g>
              <rect x={14} y={18} width={150} height={60} rx={6} fill="var(--graphite)" />
              <text x={30} y={62} fill="var(--bone)" fontSize={36} className="num">
                {clock}
              </text>
              {fixed ? (
                evening && (
                  <path
                    key="flow"
                    d={DISCHARGE}
                    fill="none"
                    stroke="var(--voltage)"
                    strokeWidth={12}
                    className="lp-flow lp-reveal"
                  />
                )
              ) : (
                <g opacity={span(t, 0.7, 0.9)}>
                  <circle
                    cx={BATTERY.x}
                    cy={BATTERY.y}
                    r={165}
                    fill="none"
                    stroke="var(--warning)"
                    strokeWidth={2}
                    strokeDasharray="6 8"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={BATTERY.x + 120} cy={BATTERY.y - 120} r={30} fill="var(--warning)" />
                  <foreignObject x={BATTERY.x + 102} y={BATTERY.y - 138} width={36} height={36}>
                    <Lock className="size-9 text-obsidian" strokeWidth={2.5} />
                  </foreignObject>
                </g>
              )}
            </Overlay>
          }
        />
        <Shot
          src="/landing/bat-chart.webp"
          alt="Graficul bateriei: încărcarea rămâne peste rezerva setată exact când prețul energiei crește seara"
          w={1100}
          h={569}
          className="relative z-10 -mt-[16%] w-[62%] sm:-ml-6 lg:-ml-12"
          style={{ transform: `translateY(${(1 - p) * 48}px)` }}
        />
      </div>
    </Chapter>
  );
}
