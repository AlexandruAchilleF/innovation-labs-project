import { useEffect, useState, type ReactNode } from "react";
import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { prosumerCause } from "@/lib/case-summary";
import { fmt } from "@/lib/format";
import { householdQuery } from "@/lib/queries";
import { extractNumbers } from "@/lib/sim";
import { cn } from "@/lib/utils";
import { useInView } from "./motion";
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
      <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <Shot
          src="/landing/chain-verdict.webp"
          alt="Cele trei verdicte: rețea, baterie, factură"
          w={1400}
          h={101}
          className="min-w-[760px]"
        />
      </div>
    ),
  ],
  ["Explicat", () => <Explained />],
  ["Trimis", () => <Delivered />],
];

/** "De la minut la dosar": four ruled steps, from raw telemetry to the delivered dossier. */
export function ProofChain() {
  return (
    <section aria-labelledby="lant">
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <h2
          id="lant"
          className="font-display text-balance text-[32px] leading-tight sm:text-[40px]"
        >
          De la minut la dosar
        </h2>
        <ol className="mt-14 divide-y divide-iron border-t border-iron">
          {STEPS.map(([label, Body], i) => (
            <Step key={label} index={i} label={label}>
              <Body />
            </Step>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Step({ index, label, children }: { index: number; label: string; children: ReactNode }) {
  const [ref, seen] = useInView<HTMLLIElement>(0.25);
  return (
    <li ref={ref} className="grid gap-5 py-10 lg:grid-cols-12 lg:gap-12 lg:py-14">
      <div className="flex items-baseline gap-4 lg:col-span-3 lg:flex-col lg:gap-2">
        <span className="num text-[13px] text-smoke">{String(index + 1).padStart(2, "0")}</span>
        <h3 className="text-[22px] font-medium leading-tight">{label}</h3>
      </div>
      <div className={cn("lg:col-span-9", seen ? "lp-rise" : "opacity-0")}>{children}</div>
    </li>
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
  const facts: [label: string, field: string, value: number, shown: string][] = g
    ? [
        [
          "Tensiune la contor",
          "max_meter_voltage_v",
          g.max_meter_voltage_v,
          `${fmt(g.max_meter_voltage_v, 1)} V`,
        ],
        ["Limită legală", "legal_limit_v", g.legal_limit_v, `${fmt(g.legal_limit_v)} V`],
        [
          "Vecini opriți",
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
  const factOf = (token: string) => facts.findIndex(([, , v]) => v === extractNumbers(token)[0]);

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
        {facts.map(([label, field, , shown], i) => (
          <div
            key={field}
            className={cn(
              "flex items-center justify-between gap-6 rounded-[4px] px-3 py-2 transition-colors",
              i === active ? "bg-voltage/15" : "",
            )}
          >
            <dt className="min-w-0">
              <span className="block text-[13px] text-bone">{label}</span>
              <span
                className={cn(
                  "num block truncate text-[11px]",
                  i === active ? "text-voltage" : "text-smoke",
                )}
              >
                {field}
              </span>
            </dt>
            <dd className="num shrink-0 text-[14px] text-bone">{shown}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
