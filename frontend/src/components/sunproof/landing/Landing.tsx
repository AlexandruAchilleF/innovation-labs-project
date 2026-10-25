import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/format";
import { portfolioQuery } from "@/lib/queries";
import { LegalFooter } from "./LegalPages";
import { BatteryFigure, BillingFigure, GridFigure } from "./ProofFigures";
import { ProsumerEntry, SupplierEntry } from "./RoleEntry";

const PROOFS = [
  ["Rețea sau instalație locală", GridFigure],
  ["Baterie blocată seara", BatteryFigure],
  ["Factură vs. contor", BillingFigure],
] as const;

export function Landing() {
  return (
    <div className="min-h-screen bg-canvas text-bone">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
        <span className="font-display text-[20px]">SunProof</span>
        <nav aria-label="Intrare" className="hidden items-center gap-2 sm:flex">
          <SupplierEntry size="sm" />
          <ProsumerEntry size="sm" />
        </nav>
      </header>

      <main>
        <section>
          <div className="mx-auto flex max-w-[1200px] flex-col items-center px-6 pb-12 pt-20 text-center sm:pt-32">
            <h1 className="font-display text-balance text-[36px] leading-[1.1] sm:text-[48px] lg:text-[64px]">
              Fiecare reclamație, cu dovada ei
            </h1>
            <RoleEntries />
          </div>
          <Ridge viewBox="0 0 1200 140" className="hidden sm:block" />
          <Ridge viewBox="380 0 420 140" className="sm:hidden" />
        </section>

        <section aria-labelledby="dovezi" className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-6 py-20">
            <h2
              id="dovezi"
              className="font-display text-balance text-[32px] leading-tight sm:text-[40px]"
            >
              Trei întrebări, trei dovezi
            </h2>
            <ol className="mt-12 grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
              {PROOFS.map(([title, Figure]) => (
                <li
                  key={title}
                  className="py-8 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0"
                >
                  <h3 className="text-balance text-[18px] font-medium leading-snug">{title}</h3>
                  <div className="mt-6">
                    <Figure />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <ImpactFigures />

        <section aria-labelledby="intrare" className="border-t border-border">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center px-6 py-20 text-center">
            <h2 id="intrare" className="font-display text-[32px] leading-tight sm:text-[40px]">
              Alege rolul
            </h2>
            <RoleEntries />
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}

function RoleEntries() {
  return (
    <div className="mt-10 flex w-full max-w-[400px] flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
      <SupplierEntry size="lg" className="w-full sm:w-40" />
      <ProsumerEntry size="lg" className="w-full sm:w-40" />
    </div>
  );
}

function ImpactFigures() {
  const hydrated = useHydrated();
  const m = useQuery(portfolioQuery()).data?.metrics;
  const figures: [value: string, label: string][] = m
    ? [
        [fmt(m.monitored_households_count), "gospodării demonstrative analizate"],
        [
          `${fmt(m.fleet_total_supplier_monthly_value_ron)} RON`,
          "valoare lunară demonstrativă pentru furnizor",
        ],
        [fmt(m.fleet_anre_complaints_prevented), "reclamații ANRE evitabile, demonstrativ"],
      ]
    : [];
  return (
    <section aria-labelledby="impact" className="border-t border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <h2 id="impact" className="font-display text-[32px] leading-tight sm:text-[40px]">
          Portofoliul demonstrativ
        </h2>
        <dl aria-busy={!(hydrated && m)} className="mt-12 grid gap-10 sm:grid-cols-3">
          {hydrated && m
            ? figures.map(([v, l]) => (
                <div key={l} className="flex flex-col-reverse gap-3">
                  <dt className="text-pretty text-[14px] text-fog">{l}</dt>
                  <dd className="num text-[36px] leading-none text-bone">{v}</dd>
                </div>
              ))
            : [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
        </dl>
      </div>
    </section>
  );
}

/** The household's clear-sky day, clipped at 253 V; the neighbours on the same transformer trip in that minute. */
function Ridge({ viewBox, className }: { viewBox: string; className: string }) {
  return (
    <svg
      role="img"
      aria-label="Producția se oprește la 253 V, în același minut cu vecinii"
      viewBox={viewBox}
      className={`pointer-events-none h-auto w-full ${className}`}
    >
      <g transform="translate(0 16)">
        <path
          d="M0 112 L180 110 C300 106 360 80 430 56 C480 40 520 30 548 28 L556 28 L560 70 L566 70 L570 26 C600 22 640 22 680 30 C760 46 820 84 900 102 C980 112 1080 112 1200 112"
          fill="none"
          stroke="var(--fog)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="0"
          x2="1200"
          y1="24"
          y2="24"
          stroke="var(--voltage)"
          strokeDasharray="2 6"
          vectorEffect="non-scaling-stroke"
        />
        <text x="396" y="16" fill="var(--voltage)" fontSize="12" className="num">
          253 V
        </text>
        {[-36, -24, -12, 24, 36, 48].map((dx) => (
          <circle key={dx} cx={556 + dx} cy="70" r="2.5" fill="var(--bone)" />
        ))}
      </g>
    </svg>
  );
}
