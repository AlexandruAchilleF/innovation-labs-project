import { useState } from "react";
import { Lock } from "lucide-react";
import { fmt } from "@/lib/format";
import { Chapter, type Fact } from "./Chapter";
import { useCase } from "./use-case";
import { span, useScrollProgress } from "./motion";
import { Overlay, Shot, Toggle } from "./Shot";

type Mode = "locked" | "fixed";
const MODES = [
  ["locked", "Setare actuală"],
  ["fixed", "Setare corectă"],
] as const;

/** Pixel positions on /landing/bat-scene.webp (1600×971), the prosumer scene at 20:00. */
const W = 1600;
const H = 971;
const BATTERY = { x: 383, y: 585 };
/** Battery → inverter → meter → house, along the scene's own cables. */
const DISCHARGE = "M470 640 L560 700 L806 560 L990 470 L1110 415 L1170 350 L1250 300";

/**
 * (b) Scroll-driven clock: the scene runs 12:00 → 20:00 as you scroll, the scene dims and the
 * battery, still full, gets locked in its reserve exactly when evening energy is most expensive.
 */
export function BatteryChapter() {
  const [mode, setMode] = useState<Mode>("locked");
  const [stage, p] = useScrollProgress<HTMLDivElement>();
  const t = span(p, 0.05, 0.9);
  const minutes = 12 * 60 + Math.round((t * 8 * 60) / 5) * 5;
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const dusk = span(t, 0.35, 1);
  const evening = t > 0.8;
  const fixed = mode === "fixed";
  const b = useCase("RO-CJ-003")?.battery_verdict;
  const facts: Fact[] | undefined = b && [
    ["Rezervă setată", `${fmt(fixed ? b.desired_min_soc_pct : b.configured_min_soc_pct)} %`],
    ["Energie blocată seara", `${fmt(fixed ? 0 : b.locked_kwh, 1)} kWh`],
    ["PZU seară / amiază", `${fmt(b.pzu_evening_ron_mwh)} / ${fmt(b.pzu_midday_ron_mwh)} RON/MWh`],
  ];
  return (
    <Chapter
      index="02"
      reverse
      title="Bateria nu se descarcă la vârful de seară"
      control={<Toggle label="SoC minim" value={mode} options={MODES} onChange={setMode} />}
      facts={facts}
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
              <rect width={W} height={H} fill="var(--obsidian)" opacity={dusk * 0.5} />
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
        />
      </div>
    </Chapter>
  );
}
