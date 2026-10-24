import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/format";
import { portfolioQuery } from "@/lib/queries";
import { ProsumerEntry, SupplierEntry } from "./RoleEntry";

const OFFERS: [title: string, body: string][] = [
  [
    "Rețea vs. instalație locală",
    "Arătăm matematic dacă oprirea invertorului peste 253 V vine de la transformatorul distribuitorului (vecinii cad în același minut) sau de la cablul intern al casei.",
  ],
  [
    "Deblocarea bateriilor în vârful de seară",
    "Găsim bateriile ținute la 80% rezervă de avarie, care nu se descarcă seara, și recuperăm diferența de preț PZU dintre prânz și seară.",
  ],
  [
    "Reconcilierea facturilor (Legea 160/2026)",
    "Comparăm automat invertorul, contorul inteligent (indecșii 1.8.0 și 2.8.0) și factura emisă, înainte să devină o dispută la ANRE.",
  ],
];

export function Landing() {
  return (
    <div className="min-h-screen bg-canvas text-bone">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <span className="font-display text-[20px]">SunProof</span>
        <nav aria-label="Intrare" className="flex items-center gap-2">
          <SupplierEntry size="sm">Intră ca Furnizor</SupplierEntry>
          <ProsumerEntry size="sm">Intră ca Prosumator</ProsumerEntry>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center px-6 pb-40 pt-24 text-center sm:pt-32">
            <h1 className="font-display max-w-[20ch] text-[40px] leading-[1.1] sm:text-[56px] lg:text-[64px]">
              Diagnostic determinist pentru furnizori de energie și prosumatori
            </h1>
            <p className="mt-6 max-w-[60ch] text-[16px] leading-relaxed text-fog sm:text-[18px]">
              Răspundem instant la cele trei probleme care generează reclamații: de ce se oprește
              invertorul la prânz, de ce nu se descarcă bateria seara și de ce nu corespunde
              factura. Fără deplasări inutile în teren, fără dispute la ANRE.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <SupplierEntry size="lg">Dashboard Furnizor</SupplierEntry>
              <ProsumerEntry size="lg">Aplicația Prosumatorului</ProsumerEntry>
            </div>
          </div>
          <Ridge />
        </section>

        <section aria-labelledby="ce-vindem" className="mx-auto max-w-[1200px] px-6 py-20">
          <h2 id="ce-vindem" className="font-display text-[32px] leading-tight sm:text-[40px]">
            Trei răspunsuri, fiecare cu dovada lui
          </h2>
          <p className="mt-3 max-w-[60ch] text-[16px] text-fog">
            Motoarele deterministe decid; textul doar explică cifrele pe care ele le-au calculat.
          </p>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {OFFERS.map(([title, body], i) => (
              <li key={title} className="rounded-lg border border-border bg-graphite p-6">
                <span className="num text-[13px] text-fog">{i + 1}</span>
                <h3 className="mt-4 text-[18px] font-medium leading-snug">{title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-fog">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <ImpactFigures />
      </main>

      <footer className="border-t border-graphite bg-obsidian">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-16 text-[13px] text-fog">
          <span className="font-display text-[16px] text-bone">SunProof</span>
          <span>Prosumer &amp; Grid Intelligence · România · date demonstrative, august 2026</span>
        </div>
      </footer>
    </div>
  );
}

function ImpactFigures() {
  const hydrated = useHydrated();
  const m = useQuery(portfolioQuery()).data?.metrics;
  const figures: [value: string, label: string][] = m
    ? [
        [fmt(m.monitored_households_count), "gospodării diagnosticate cap-coadă"],
        [
          `${fmt(m.fleet_total_supplier_monthly_value_ron)} RON`,
          "valoare lunară recuperabilă de furnizor",
        ],
        [fmt(m.fleet_anre_complaints_prevented), "reclamații ANRE prevenite"],
      ]
    : [];
  return (
    <section aria-labelledby="impact" className="border-t border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <h2 id="impact" className="eyebrow text-fog">
          Pe portofoliul demonstrativ
        </h2>
        <dl className="mt-8 grid gap-10 sm:grid-cols-3">
          {hydrated && m
            ? figures.map(([v, l]) => (
                <div key={l} className="flex flex-col-reverse gap-3">
                  <dt className="text-[14px] text-fog">{l}</dt>
                  <dd className="num text-[36px] leading-none text-bone">{v}</dd>
                </div>
              ))
            : [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
        </dl>
        <p className="mt-10 text-[12px] text-fog">
          Calculate de motoarele SunProof pe scenariile simulate; nu sunt date de la clienți reali.
        </p>
      </div>
    </section>
  );
}

/** Single-line graphic: a clear-sky production day whose midday crest is clipped, like a trip. */
function Ridge() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] w-full"
    >
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
        stroke="var(--smoke)"
        strokeDasharray="2 6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
