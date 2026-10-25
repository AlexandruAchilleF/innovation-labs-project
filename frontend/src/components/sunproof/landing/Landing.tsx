import { ArrowRight } from "lucide-react";
import { BatteryChapter } from "./BatteryChapter";
import { BillingChapter } from "./BillingChapter";
import { GridChapter } from "./GridChapter";
import { LegalFooter } from "./LegalPages";
import { ProofChain } from "./ProofChain";
import { ProsumerEntry, SupplierEntry } from "./RoleEntry";
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
            Vedere prosumator
          </ProsumerEntry>
          <SupplierEntry size="sm">Deschide portofoliul demo</SupplierEntry>
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
              Ce verificăm la fiecare reclamație
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

        <LimitRule />
        <section aria-labelledby="intrare">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-20 sm:flex-row sm:items-end sm:justify-between lg:py-28">
            <h2
              id="intrare"
              className="font-display text-balance text-[32px] leading-tight sm:text-[40px]"
            >
              Încercați pe portofoliul demonstrativ
            </h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <SupplierEntry size="lg">
                Deschide portofoliul demo
                <ArrowRight className="size-4" />
              </SupplierEntry>
              <ProsumerEntry size="lg" variant="text">
                Vedere prosumator
              </ProsumerEntry>
            </div>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
