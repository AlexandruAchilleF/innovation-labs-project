import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { fmt } from "@/lib/format";
import { portfolioQuery } from "@/lib/queries";
import { ProsumerEntry, SupplierEntry } from "./RoleEntry";
import { Overlay, Shot } from "./Shot";

/** Pixel box on /landing/hero.webp (2000×1354): the minutes the meter spent above 253 V. */
const W = 2000;
const H = 1354;
const OVER = { x: 967, y: 527, w: 385, h: 70 };
/** Cut below the voltage chart: verdict cards + the curve crossing 253 V are the whole story. */
const CROP = 900;

/** Left-aligned claim and one primary action, then the real triage screen with the overvoltage marked. */
export function Hero() {
  return (
    <section>
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 pt-16 sm:pt-24 lg:grid-cols-12 lg:items-end">
        <h1 className="lp-rise font-display text-balance text-[40px] leading-[1.06] sm:text-[56px] lg:col-span-8 lg:text-[64px]">
          Fiecare reclamație, cu dovada ei
        </h1>
        <div
          className="lp-rise flex flex-wrap items-center gap-x-6 gap-y-3 lg:col-span-4 lg:justify-end lg:pb-2"
          style={{ "--lp-delay": "0.1s" } as React.CSSProperties}
        >
          <SupplierEntry size="lg">
            Deschide demo-ul
            <ArrowRight className="size-4" />
          </SupplierEntry>
          <ProsumerEntry size="lg" variant="text">
            Sunt prosumator
          </ProsumerEntry>
        </div>
      </div>
      <div
        className="lp-rise mx-auto mt-12 max-w-[1280px] px-4 sm:mt-16 sm:px-6"
        style={{ "--lp-delay": "0.2s" } as React.CSSProperties}
      >
        {/* Phones get the right half (verdicts + the curve over 253 V) at readable size. */}
        <div className="overflow-hidden rounded-[8px] border border-pewter sm:overflow-visible sm:rounded-none sm:border-0">
          <Shot
            priority
            className="-ml-[78%] w-[180%] max-w-none rounded-none border-0 sm:ml-0 sm:w-full sm:rounded-[8px] sm:border"
            src="/landing/hero.webp"
            alt="Analiza detaliată SunProof: portofoliul, cele trei verdicte, tensiunea și producția pierdută"
            w={W}
            h={H}
            crop={CROP}
            overlay={
              <Overlay w={W} h={CROP} label="Tensiunea la contor peste limita de 253 V">
                <rect
                  x={OVER.x}
                  y={OVER.y}
                  width={OVER.w}
                  height={OVER.h}
                  rx={4}
                  fill="none"
                  stroke="var(--critical)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  className="lp-draw"
                  style={
                    {
                      "--lp-len": 2 * (OVER.w + OVER.h),
                      "--lp-delay": "0.9s",
                    } as React.CSSProperties
                  }
                />
              </Overlay>
            }
          />
        </div>
      </div>
      <FactStrip />
    </section>
  );
}

/** Four numbers the whole product stands on, read from the live portfolio where they come from data. */
function FactStrip() {
  const hydrated = useHydrated();
  const p = useQuery(portfolioQuery()).data;
  const live = hydrated && p;
  const facts: [value: string, label: string][] = [
    [live ? fmt(p.metrics.monitored_households_count) : "—", "gospodării analizate"],
    [
      live ? fmt(new Set(p.households.map((h) => h.neighborhood_id)).size) : "—",
      "posturi de transformare",
    ],
    ["253,0 V", "limită SR EN 50549-1"],
    ["1:1", "compensare, Legea 160/2026"],
  ];
  return (
    <dl className="mx-auto mt-12 grid max-w-[1200px] grid-cols-2 px-6 pb-16 sm:mt-16 lg:grid-cols-4 lg:pb-20">
      {facts.map(([value, label]) => (
        <div
          key={label}
          className="flex flex-col-reverse justify-end gap-1.5 border-t border-iron py-5 pr-4 lg:border-l lg:border-t-0 lg:py-1 lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
        >
          <dt className="text-[13px] text-fog">{label}</dt>
          <dd className="num text-[28px] leading-none text-bone sm:text-[32px]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
