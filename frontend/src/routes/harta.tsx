import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CasePanel } from "@/components/sunproof/workspace/CasePanel";
import { MapStage } from "@/components/sunproof/workspace/MapStage";
import { NetworkPanel } from "@/components/sunproof/workspace/NetworkPanel";
import { api } from "@/lib/api";
import { worstSlot } from "@/lib/geo";
import { householdQuery, neighborhoodsQuery, portfolioQuery } from "@/lib/queries";
import type { GridState, GridWhatIfParams, Neighborhood } from "@/lib/types";

export const Route = createFileRoute("/harta")({
  validateSearch: (s: Record<string, unknown>): { household: string; n?: string } => ({
    household: typeof s["household"] === "string" ? (s["household"] as string) : "RO-TM-001",
    ...(typeof s["n"] === "string" ? { n: s["n"] as string } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Hartă rețea & congestie — SunProof" },
      {
        name: "description",
        content:
          "Harta rețelei de joasă tensiune: prosumatori, vecini, încărcarea posturilor de transformare și supratensiuni pe parcursul zilei.",
      },
    ],
  }),
  component: HartaPage,
});

export type CompareView = "before" | "after";

function HartaPage() {
  const { household, n } = Route.useSearch();
  const navigate = useNavigate({ from: "/harta" });
  const portfolio = useQuery(portfolioQuery());
  const neighborhoods = useQuery(neighborhoodsQuery());
  const detail = useQuery(householdQuery(household));

  const summary = portfolio.data?.households.find((h) => h.household_id === household);
  const list = neighborhoods.data ?? [];
  const nb: Neighborhood | undefined =
    list.find((x) => x.neighborhood_id === n) ??
    list.find((x) => x.neighborhood_id === summary?.neighborhood_id) ??
    list.find((x) => x.houses.some((h) => h.house_id === household)) ??
    list[0];
  const nbId = nb?.neighborhood_id;

  // what-if: null = measured baseline; otherwise the distributor measures being simulated
  const [params, setParams] = useState<Required<GridWhatIfParams> | null>(null);
  const [view, setView] = useState<CompareView>("after");
  const [slot, setSlot] = useState(54);
  useEffect(() => {
    setParams(null);
    if (nb) setSlot(worstSlot(nb, nb.houses, nb.transformer_kva));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nbId]);

  const whatIf = useQuery({
    queryKey: ["grid-what-if", nbId, params],
    queryFn: () => api.neighborhoodWhatIf(nbId!, params!),
    enabled: !!nbId && !!params,
    placeholderData: keepPreviousData,
  });
  const sim = params && whatIf.data ? whatIf.data : null;
  const grid: Neighborhood | GridState | undefined = sim
    ? view === "after"
      ? sim.after
      : sim.before
    : nb;
  const kva = sim && view === "after" ? params!.transformer_kva : (nb?.transformer_kva ?? 250);

  const select = (id: string) => navigate({ search: { household: id } });
  const pickNeighborhood = (id: string) => navigate({ search: { household, n: id } });

  return (
    <div className="flex h-full min-h-0">
      <CasePanel
        households={portfolio.data?.households}
        selected={household}
        detail={detail.data}
        nb={nb}
        grid={grid}
        slot={slot}
        onSelect={select}
      />
      <MapStage
        neighborhoods={list}
        households={portfolio.data?.households ?? []}
        nb={nb}
        grid={grid}
        kva={kva}
        slot={slot}
        onSlot={setSlot}
        selectedId={household}
        onSelectHousehold={select}
        onPickNeighborhood={pickNeighborhood}
        simulating={!!sim}
        view={view}
      />
      <NetworkPanel
        nb={nb}
        grid={grid}
        kva={kva}
        slot={slot}
        params={params}
        onParams={setParams}
        sim={sim}
        loading={whatIf.isFetching}
        view={view}
        onView={setView}
      />
    </div>
  );
}
