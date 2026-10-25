import { useState } from "react";
import { fmt } from "@/lib/format";
import { Chapter, type Fact } from "./Chapter";
import { useCase } from "./use-case";
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
 * (a) Voltage wave. Rețea: one ring leaves the transformer and every house on it trips in the same frame.
 * Instalație: the rise starts inside one house only; the neighbours stay up.
 */
export function GridChapter() {
  const [mode, setMode] = useState<Mode>("grid");
  const local = mode === "local";
  const g = useCase(local ? "RO-IF-002" : "RO-TM-001")?.grid_verdict;
  const facts: Fact[] | undefined = g && [
    ["Tensiune la contor", `${fmt(g.max_meter_voltage_v, 1)} V`],
    local
      ? ["Creștere pe cablul intern", `${fmt(g.voltage_rise_internal_cable_v, 1)} V`]
      : ["Limită legală", `${fmt(g.legal_limit_v, 1)} V`],
    [
      "Vecini opriți simultan",
      `${fmt(g.neighbors_affected_simultaneously)} / ${fmt(g.neighbors_total)}`,
    ],
  ];
  const origin = local ? CLIENT : PT;
  return (
    <Chapter
      index="01"
      title="Supratensiune: rețea sau instalație interioară?"
      control={<Toggle label="Cauza declanșării" value={mode} options={MODES} onChange={setMode} />}
      facts={facts}
    >
      <div>
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
              <rect width={W} height={H} fill="var(--obsidian)" opacity={0.28} />
              <circle
                key={`wave-${mode}`}
                className="lp-wave"
                cx={origin.x}
                cy={origin.y}
                r={local ? 170 : 1350}
                fill="none"
                stroke={local ? "var(--critical)" : "var(--voltage)"}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
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
        />
      </div>
    </Chapter>
  );
}

/** Trip marker: a red ring that lands once, in the same frame for every tripped house; healthy houses stay green. */
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
