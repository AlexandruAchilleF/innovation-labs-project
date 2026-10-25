import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CaseChip, CasePanel } from "@/components/sunproof/workspace/CasePanel";
import { MapStage } from "@/components/sunproof/workspace/MapStage";
import { CaseDetail, type DetailFocus } from "@/components/sunproof/workspace/CaseDetail";
import { SidePanel } from "@/components/sunproof/workspace/SidePanel";
import { sevDot } from "@/components/sunproof/workspace/SeverityTag";
import { answers, QUESTION_IDS, type QuestionId } from "@/lib/case-questions";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";
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
          "Harta rețelei de joasă tensiune: prosumatori, echipamente, încărcarea posturilor de transformare și supratensiuni pe parcursul zilei.",
      },
    ],
  }),
  component: HartaPage,
});

export type CompareView = "before" | "after";
/** Which side panel is open; the two never open together so the map keeps its width. */
export type OpenSide = "left" | "right" | null;

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
  const [side, setSide] = useState<OpenSide>("left");
  const [focus, setFocus] = useState<DetailFocus | null>(null);
  useEffect(() => setFocus(null), [household]);
  const qs = detail.data ? answers(detail.data) : null;
  const openDetail = (q?: QuestionId) => {
    if (q) setFocus({ q });
    setSide("right");
  };
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
        open={side === "left"}
        onOpen={() => setSide("left")}
        onClose={() => setSide(null)}
        onSelect={select}
        onDetail={openDetail}
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
        caseChip={<CaseChip detail={detail.data} grid={grid} slot={slot} />}
      />
      <SidePanel
        side="right"
        open={side === "right"}
        onOpen={() => setSide("right")}
        onClose={() => setSide(null)}
        width="w-[400px]"
        title={
          <>
            Analiză detaliată
            {detail.data && (
              <span className="text-fog"> · {detail.data.analysis.customer_name}</span>
            )}
          </>
        }
        railIcon={<ClipboardList />}
        railLabel="Analiză detaliată"
        railExtra={
          qs && (
            <span className="flex flex-col gap-1.5" aria-hidden>
              {QUESTION_IDS.map((id) => (
                <span key={id} className={cn("size-1.5 rounded-full", sevDot[qs[id].s])} />
              ))}
            </span>
          )
        }
      >
        <CaseDetail
          key={household}
          d={detail.data}
          focus={focus}
          network={{
            nb,
            grid,
            kva,
            slot,
            params,
            onParams: setParams,
            sim,
            loading: whatIf.isFetching,
            view,
            onView: setView,
          }}
        />
      </SidePanel>
    </div>
  );
}
