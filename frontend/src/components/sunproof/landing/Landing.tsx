import { BatteryChapter } from "./BatteryChapter";
import { BillingChapter } from "./BillingChapter";
import { GridChapter } from "./GridChapter";
import { LegalFooter } from "./LegalPages";
import { span, useScrollProgress } from "./motion";
import { ProofChain } from "./ProofChain";
import { ProsumerEntry, SupplierEntry } from "./RoleEntry";
import { Shot } from "./Shot";

export function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-bone">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
        <span className="font-display text-[20px]">SunProof</span>
        <nav aria-label="Intrare" className="hidden items-center gap-2 sm:flex">
          <SupplierEntry size="sm" />
          <ProsumerEntry size="sm" />
        </nav>
      </header>

      <main>
        <Hero />

        <section aria-labelledby="dovezi" className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
            <h2
              id="dovezi"
              className="font-display text-balance text-[32px] leading-tight sm:text-[40px]"
            >
              Trei întrebări, trei dovezi
            </h2>
            <ol className="mt-16 divide-y divide-border">
              <GridChapter />
              <BatteryChapter />
              <BillingChapter />
            </ol>
          </div>
        </section>

        <ProofChain />

        <section aria-labelledby="intrare" className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
            <h2
              id="intrare"
              className="font-display text-center text-[32px] leading-tight sm:text-[40px]"
            >
              Alege rolul
            </h2>
            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <RoleCard
                src="/landing/role-supplier.webp"
                alt="Harta furnizorului cu portofoliul și cazurile live"
                h={625}
                entry={<SupplierEntry size="lg" className="w-full" />}
              />
              <RoleCard
                src="/landing/role-prosumer.webp"
                alt="Aplicația prosumatorului: casa, panourile și invertorul oprit la prânz"
                h={607}
                entry={<ProsumerEntry size="lg" className="w-full" />}
              />
            </div>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}

/** Headline, then the real triage screen tilted back like a desk; it lands flat as you scroll into it. */
function Hero() {
  const [ref, p] = useScrollProgress<HTMLDivElement>();
  const t = span(p, 0.35, 1);
  return (
    <section className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--voltage)_14%,transparent),transparent)]"
      />
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 pt-20 text-center sm:pt-28">
        <h1 className="lp-rise font-display text-balance text-[38px] leading-[1.08] sm:text-[56px] lg:text-[72px]">
          Fiecare reclamație, cu dovada ei
        </h1>
        <div
          className="lp-rise flex w-full justify-center"
          style={{ "--lp-delay": "0.12s" } as React.CSSProperties}
        >
          <RoleEntries />
        </div>
      </div>
      <div className="relative mx-auto mt-14 sm:mt-20 max-w-[1280px] px-4 pb-20 [perspective:1600px] sm:px-6 lg:pb-28">
        <div ref={ref} className="lp-rise" style={{ "--lp-delay": "0.25s" } as React.CSSProperties}>
          <div
            className="origin-top will-change-transform"
            style={{ transform: `rotateX(${(1 - t) * 18}deg) scale(${0.92 + t * 0.08})` }}
          >
            <Shot
              priority
              src="/landing/hero.webp"
              alt="Analiza detaliată SunProof: portofoliul, cele trei verdicte, tensiunea și producția pierdută"
              w={2000}
              h={1354}
            />
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent"
        />
      </div>
    </section>
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

function RoleCard({
  src,
  alt,
  h,
  entry,
}: {
  src: string;
  alt: string;
  h: number;
  entry: React.ReactNode;
}) {
  return (
    <div className="group flex flex-col gap-4 rounded-[8px] border border-iron bg-graphite p-4 transition-colors hover:border-pewter">
      <div className="overflow-hidden rounded-[6px]">
        <Shot
          src={src}
          alt={alt}
          w={1000}
          h={h}
          className="rounded-[6px] border-iron transition-transform duration-700 group-hover:scale-[1.03]"
        />
      </div>
      {entry}
    </div>
  );
}
