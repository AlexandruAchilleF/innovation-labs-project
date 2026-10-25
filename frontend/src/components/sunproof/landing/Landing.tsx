import { BatteryChapter } from "./BatteryChapter";
import { BillingChapter } from "./BillingChapter";
import { GridChapter } from "./GridChapter";
import { LegalFooter } from "./LegalPages";
import { ProofChain } from "./ProofChain";
import { ProsumerEntry, SupplierEntry } from "./RoleEntry";
import { Shot } from "./Shot";
import { Hero } from "./Hero";
import { LimitRule } from "./LimitRule";

export function Landing() {
  return (
    <div className="lp min-h-screen overflow-x-clip bg-canvas text-bone">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
        <span className="font-display text-[20px]">SunProof</span>
        <nav aria-label="Intrare" className="flex items-center gap-5">
          <ProsumerEntry
            size="sm"
            variant="text"
            className="hidden h-10 text-[13px] sm:inline-flex"
          >
            Sunt prosumator
          </ProsumerEntry>
          <SupplierEntry size="sm">Deschide demo-ul</SupplierEntry>
        </nav>
      </header>

      <main>
        <Hero />

        <LimitRule />
        <section aria-labelledby="dovezi">
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

        <LimitRule />
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
    <div className="flex flex-col gap-4 rounded-[8px] border border-iron bg-graphite p-4 transition-colors hover:border-pewter">
      <div className="overflow-hidden rounded-[6px]">
        <Shot src={src} alt={alt} w={1000} h={h} className="rounded-[6px] border-iron" />
      </div>
      {entry}
    </div>
  );
}
