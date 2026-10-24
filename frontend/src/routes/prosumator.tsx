import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DiagnosisCard } from "@/components/sunproof/prosumator/DiagnosisCard";
import { EnergyFlow } from "@/components/sunproof/prosumator/EnergyFlow";
import { EnergySummary } from "@/components/sunproof/prosumator/EnergySummary";
import { TicketForm } from "@/components/sunproof/prosumator/TicketForm";
import { householdQuery } from "@/lib/queries";
import type { HouseholdDetail } from "@/lib/types";

export const Route = createFileRoute("/prosumator")({
  validateSearch: (s: Record<string, unknown>) => ({
    household: typeof s["household"] === "string" ? (s["household"] as string) : "RO-B-005",
  }),
  head: () => ({
    meta: [
      { title: "Aplicația Prosumatorului — SunProof" },
      {
        name: "description",
        content:
          "Explicații simple pentru prosumatori: cât produci, de ce se oprește invertorul, ce faci cu bateria și dacă factura e corectă.",
      },
      { property: "og:title", content: "Aplicația Prosumatorului — SunProof" },
      {
        property: "og:description",
        content:
          "Explicații simple pentru prosumatori: cât produci, de ce se oprește invertorul, ce faci cu bateria și dacă factura e corectă.",
      },
    ],
  }),
  component: ProsumatorPage,
});

function ProsumatorPage() {
  const { household } = Route.useSearch();
  const d = useQuery(householdQuery(household));
  // the shared query cache can resolve before hydration; render data only on the client
  const hydrated = useHydrated();
  const detail = hydrated ? d.data : undefined;

  return (
    <main className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 sm:px-6 sm:py-10">
      {detail ? (
        <Dashboard key={household} d={detail} />
      ) : (
        <div className="space-y-6">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-[320px]" />
          <Skeleton className="h-[280px]" />
        </div>
      )}
    </main>
  );
}

function Dashboard({ d }: { d: HouseholdDetail }) {
  const a = d.analysis;
  return (
    <>
      <header>
        <h1 className="font-display text-[32px] leading-tight text-bone sm:text-[36px]">
          Bună ziua, {a.customer_name}
        </h1>
        <p className="mt-2 text-[14px] text-fog">
          {a.street_address} · <span className="num">{a.installed_pv_kw} kWp</span> ·{" "}
          {a.inverter_brand}
        </p>
      </header>

      <section aria-label="Energia ta" className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <EnergySummary d={d} />
        </div>
        <div className="lg:col-span-5">
          <EnergyFlow d={d} />
        </div>
      </section>

      <DiagnosisCard d={d} />

      <TicketForm d={d} />
    </>
  );
}
