import { useEffect, useState, type ReactNode } from "react";
import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { prosumerCause } from "@/lib/case-summary";
import { fmt } from "@/lib/format";
import { householdQuery } from "@/lib/queries";
import { extractNumbers } from "@/lib/sim";
import { cn } from "@/lib/utils";
import { span, useInView, useScrollProgress } from "./motion";
import { Delivered } from "./Delivered";
import { Shot } from "./Shot";

const STEPS: [label: string, body: () => ReactNode][] = [
  [
    "Măsurat",
    () => (
      <Shot
        src="/landing/chain-measure.webp"
        alt="Tensiunea la invertor, minut cu minut, față de limita de 253 V"
        w={900}
        h={466}
        className="max-w-[640px]"
      />
    ),
  ],
  [
    "Decis",
    () => (
      <Shot
        src="/landing/chain-verdict.webp"
        alt="Cele trei verdicte: rețea, baterie, factură"
        w={1400}
        h={101}
      />
    ),
  ],
  ["Explicat", () => <Explained />],
  ["Trimis", () => <Delivered />],
];

/** "De la minut la dosar": one thread drawn by scrolling, from raw telemetry to the delivered dossier. */
export function ProofChain() {
  const [ref, p] = useScrollProgress<HTMLOListElement>();
  const fill = span(p, 0, 0.95);
  return (
    <section aria-labelledby="lant" className="border-t border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <h2
          id="lant"
          className="font-display text-balance text-[32px] leading-tight sm:text-[40px]"
        >
          De la minut la dosar
        </h2>
        <ol ref={ref} className="relative mt-14 flex flex-col gap-14 pl-10 sm:pl-16 lg:gap-20">
          <span
            aria-hidden
            className="absolute bottom-2 left-[7px] top-2 w-px bg-iron sm:left-[11px]"
          />
          <span
            aria-hidden
            className="absolute left-[7px] top-2 w-px origin-top bg-voltage sm:left-[11px]"
            style={{ height: "calc(100% - 16px)", transform: `scaleY(${fill})` }}
          />
          {STEPS.map(([label, Body], i) => {
            const lit = fill >= i / (STEPS.length - 1) - 0.02;
            return (
              <li key={label} className="relative grid gap-5 lg:grid-cols-12 lg:gap-12">
                <span
                  aria-hidden
                  className={cn(
                    "absolute -left-10 top-1 size-[15px] rounded-full border transition-colors duration-500 sm:-left-16 sm:size-[23px]",
                    lit ? "border-voltage bg-voltage/25" : "border-iron bg-canvas",
                  )}
                />
                <div className="flex items-baseline gap-4 lg:col-span-3 lg:flex-col lg:gap-2">
                  <span
                    className={cn(
                      "num text-[13px] transition-colors",
                      lit ? "text-voltage" : "text-smoke",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[22px] font-medium leading-tight">{label}</h3>
                </div>
                <div
                  className={cn(
                    "transition-all duration-700 lg:col-span-9",
                    lit ? "opacity-100" : "translate-y-4 opacity-40",
                  )}
                >
                  <Body />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

const SPLIT = /(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)/g;

/**
 * The demo grid household's explanation, rendered live: every number in the sentence is tied to the
 * deterministic fact it came from. The facts cycle on their own; hover pins one.
 */
function Explained() {
  const hydrated = useHydrated();
  const d = useQuery(householdQuery("RO-TM-001")).data;
  const [ref, seen] = useInView<HTMLDivElement>(0.6);
  const [auto, setAuto] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);
  const g = d?.analysis.grid_verdict;
  const facts: [field: string, value: number, shown: string][] = g
    ? [
        ["max_meter_voltage_v", g.max_meter_voltage_v, `${fmt(g.max_meter_voltage_v, 1)} V`],
        ["legal_limit_v", g.legal_limit_v, `${fmt(g.legal_limit_v)} V`],
        [
          "neighbors_affected_simultaneously",
          g.neighbors_affected_simultaneously,
          fmt(g.neighbors_affected_simultaneously),
        ],
      ]
    : [];
  useEffect(() => {
    if (!seen) return;
    const id = setInterval(() => setAuto((a) => (a + 1) % 3), 1800);
    return () => clearInterval(id);
  }, [seen]);

  if (!hydrated || !d) return <Skeleton className="h-40" />;
  const active = pinned ?? auto;
  const factOf = (token: string) => facts.findIndex(([, v]) => v === extractNumbers(token)[0]);

  return (
    <div
      ref={ref}
      className="grid overflow-hidden rounded-[8px] border border-pewter bg-graphite md:grid-cols-[minmax(0,1fr)_auto]"
    >
      <p className="p-6 text-[17px] leading-relaxed text-bone sm:p-8 sm:text-[19px]">
        {prosumerCause(d)
          .split(SPLIT)
          .map((part, i) => {
            const f = i % 2 === 1 ? factOf(part) : -1;
            if (f < 0) return <span key={i}>{part}</span>;
            return (
              <mark
                key={i}
                tabIndex={0}
                onMouseEnter={() => setPinned(f)}
                onMouseLeave={() => setPinned(null)}
                onFocus={() => setPinned(f)}
                onBlur={() => setPinned(null)}
                className={cn(
                  "num rounded-[2px] bg-transparent px-0.5 text-bone underline decoration-1 underline-offset-[5px] transition-colors",
                  f === active ? "bg-voltage/20 decoration-voltage" : "decoration-smoke",
                )}
              >
                {part}
              </mark>
            );
          })}
      </p>
      <dl className="flex flex-col justify-center gap-1 border-t border-pewter bg-obsidian p-4 md:border-l md:border-t-0 sm:p-6">
        {facts.map(([field, , shown], i) => (
          <div
            key={field}
            className={cn(
              "flex items-center justify-between gap-4 rounded-[4px] px-3 py-2.5 transition-colors",
              i === active ? "bg-voltage/15" : "",
            )}
          >
            <dt
              className={cn(
                "num truncate text-[12px]",
                i === active ? "text-voltage" : "text-smoke",
              )}
            >
              {field}
            </dt>
            <dd className="num shrink-0 text-[14px] text-bone">{shown}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
