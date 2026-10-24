import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { HouseholdList } from "@/components/sunproof/triaj/HouseholdList";
import { TriageHeader } from "@/components/sunproof/triaj/Diagnostic";
import { DiagnosticTabs } from "@/components/sunproof/triaj/DiagnosticTabs";
import { householdQuery, portfolioQuery } from "@/lib/queries";

export const Route = createFileRoute("/triaj")({
  validateSearch: (s: Record<string, unknown>) => ({ household: typeof s["household"] === "string" ? (s["household"] as string) : "RO-TM-001" }),
  head: () => ({
    meta: [
      { title: "Triaj Portofoliu & Diagnostic — SunProof" },
      { name: "description", content: "Triaj O&M pentru prosumatori: rețea vs instalație locală, baterii și reconciliere facturi." },
      { property: "og:title", content: "Triaj Portofoliu & Diagnostic — SunProof" },
      { property: "og:description", content: "Triaj O&M pentru prosumatori: rețea vs instalație locală, baterii și reconciliere facturi." },
    ],
  }),
  component: TriajPage,
});

function TriajPage() {
  const { household } = Route.useSearch();
  const navigate = useNavigate({ from: "/triaj" });
  const portfolio = useQuery(portfolioQuery());
  const detail = useQuery(householdQuery(household));

  return (
    <main className="mx-auto max-w-[1800px] space-y-3 px-4 py-3">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4 xl:col-span-3">
          {portfolio.data ? (
            <HouseholdList households={portfolio.data.households} selected={household} onSelect={(id) => navigate({ search: { household: id } })} />
          ) : (
            <Skeleton className="h-[600px]" />
          )}
        </div>
        <div className="col-span-12 min-w-0 space-y-3 md:col-span-8 xl:col-span-9">
          {detail.data ? (
            <>
              <TriageHeader d={detail.data} />
              <DiagnosticTabs d={detail.data} />
            </>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
