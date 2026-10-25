import { useState } from "react";
import { Chapter } from "./Chapter";
import { useScrollProgress } from "./motion";
import { Overlay, Shot, Toggle } from "./Shot";

type Mode = "grid" | "local";
const MODES = [
  ["grid", "Rețea"],
  ["local", "Instalație"],
] as const;

/** Pixel positions on /landing/grid-map.webp (1600×1254): the transformer and the PV houses on its feeders. */
const W = 1600;
const H = 1254;
const PT = { x: 163, y: 390 };
const CLIENT = { x: 893, y: 790 };
const NEIGHBORS = [
  { x: 447, y: 172 },
  { x: 540, y: 636 },
  { x: 1405, y: 684 },
];

/**
 * (a) Voltage wave. Rețea: a ring leaves the transformer and every house on it trips in the same frame.
 * Instalație: the rise starts inside one house only; the neighbours stay up.
 */
export function GridChapter() {
  const [mode, setMode] = useState<Mode>("grid");
  const [stage, p] = useScrollProgress<HTMLDivElement>();
  const local = mode === "local";
  const origin = local ? CLIENT : PT;
  return (
    <Chapter
      index="01"
      title="Supratensiune: rețeaua JT sau instalația interioară"
      control={<Toggle label="Cauza declanșării" value={mode} options={MODES} onChange={setMode} />}
    >
      <div ref={stage}>
        <Shot
          src="/landing/grid-map.webp"
          alt="Harta SunProof: postul de transformare și casele cu panouri de pe aceeași stradă"
          w={W}
          h={H}
          overlay={
            <Overlay
              w={W}
              h={H}
              label={
                local
                  ? "Declanșează doar invertorul clientului; vecinii rămân în funcțiune"
                  : "Invertoarele de pe același post de transformare declanșează în același minut"
              }
            >
              <defs>
                <radialGradient id="lp-wave-fill">
                  <stop offset="0.7" stopColor="var(--voltage)" stopOpacity="0" />
                  <stop offset="1" stopColor="var(--voltage)" stopOpacity="0.18" />
                </radialGradient>
              </defs>
              <rect width={W} height={H} fill="var(--obsidian)" opacity={0.28} />
              {[0, 1.5, 3].map((delay) => (
                <circle
                  key={`${mode}-${delay}`}
                  className="lp-wave"
                  style={{ animationDelay: `${delay}s` }}
                  cx={origin.x}
                  cy={origin.y}
                  r={local ? 170 : 1350}
                  fill="url(#lp-wave-fill)"
                  stroke={local ? "var(--critical)" : "var(--voltage)"}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <House at={CLIENT} tripped key={`c-${mode}`} />
              {NEIGHBORS.map((n, i) => (
                <House key={`${mode}-${i}`} at={n} tripped={!local} />
              ))}
              <circle
                cx={PT.x}
                cy={PT.y}
                r={34}
                fill="none"
                stroke="var(--voltage)"
                strokeWidth={3}
              />
            </Overlay>
          }
        />
        <Shot
          src="/landing/grid-volt.webp"
          alt="Tensiunea la invertor și la contor depășește 253 V în aceleași minute cu vecinii"
          w={1400}
          h={417}
          className="relative z-10 -mt-[14%] ml-auto w-[78%] sm:-mr-6 lg:-mr-12"
          style={{ transform: `translateY(${(1 - p) * 48}px)` }}
        />
      </div>
    </Chapter>
  );
}

/** Trip marker: a red ring that lands in the same frame for every tripped house; healthy houses stay green. */
function House({ at, tripped }: { at: { x: number; y: number }; tripped: boolean }) {
  if (!tripped)
    return (
      <g>
        <circle
          cx={at.x}
          cy={at.y}
          r={46}
          fill="none"
          stroke="var(--success)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={at.x + 40} cy={at.y - 40} r={9} fill="var(--success)" />
      </g>
    );
  return (
    <g>
      <circle
        className="lp-flash"
        cx={at.x}
        cy={at.y}
        r={70}
        fill="var(--critical)"
        fillOpacity={0.5}
      />
      <circle
        className="lp-trip"
        cx={at.x}
        cy={at.y}
        r={50}
        fill="var(--critical-soft)"
        stroke="var(--critical)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <circle className="lp-trip" cx={at.x + 42} cy={at.y - 42} r={10} fill="var(--critical)" />
    </g>
  );
}
