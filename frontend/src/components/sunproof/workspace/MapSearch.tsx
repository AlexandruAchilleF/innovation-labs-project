import { useMemo, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { useMapApi } from "@/components/sunproof/map/MapCanvas";
import type { HouseholdSummary, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";
import { glass } from "./MapChrome";

const COORDS = /^\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/;

export function MapSearch({
  households,
  neighborhoods,
  onHousehold,
  onNeighborhood,
}: {
  households: HouseholdSummary[];
  neighborhoods: Neighborhood[];
  onHousehold: (id: string) => void;
  onNeighborhood: (id: string) => void;
}) {
  const api = useMapApi();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const coords = COORDS.exec(q);
  const results = useMemo(() => {
    const t = norm(q.trim());
    if (!t || coords) return { hh: [], nb: [] };
    return {
      nb: neighborhoods
        .filter((n) => norm(`${n.name} ${n.city} ${n.transformer_id}`).includes(t))
        .slice(0, 4),
      hh: households
        .filter((h) => norm(`${h.household_id} ${h.customer_name} ${h.city}`).includes(t))
        .slice(0, 7),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, households, neighborhoods]);
  const done = () => {
    setQ("");
    setOpen(false);
  };
  const goCoords = () => {
    if (!coords || !api) return;
    const [a, b] = [
      parseFloat(coords[1]!.replace(",", ".")),
      parseFloat(coords[2]!.replace(",", ".")),
    ];
    api.map.flyTo({ center: [b, a], zoom: 15, essential: true });
    done();
  };
  const any = results.hh.length + results.nb.length > 0 || !!coords;

  return (
    <div className="relative w-full">
      <label
        className={cn(
          "flex h-10 items-center gap-2 rounded-[4px] px-3",
          glass,
          "focus-within:border-voltage",
        )}
      >
        <Search className="size-4 text-fog" strokeWidth={1.5} />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            (coords
              ? goCoords()
              : results.hh[0]
                ? (onHousehold(results.hh[0].household_id), done())
                : results.nb[0] && (onNeighborhood(results.nb[0].neighborhood_id), done()))
          }
          placeholder="Caută client, POD, cartier sau coordonate (45.79, 21.24)"
          className="h-full w-full bg-transparent text-[13px] text-bone outline-none placeholder:text-smoke"
        />
      </label>
      {open && any && (
        <div
          className={cn(
            "absolute inset-x-0 top-11 overflow-hidden rounded-[4px] bg-slate py-1 shadow-overlay",
            "border border-iron",
          )}
        >
          {coords && (
            <button
              onMouseDown={goCoords}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-iron"
            >
              <LocateFixed className="size-3.5 text-fog" /> Mergi la{" "}
              <span className="num">
                {coords[1]}, {coords[2]}
              </span>
            </button>
          )}
          {results.nb.map((n) => (
            <button
              key={n.neighborhood_id}
              onMouseDown={() => (onNeighborhood(n.neighborhood_id), done())}
              className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left hover:bg-iron"
            >
              <span className="text-[13px] text-bone">{n.name}</span>
              <span className="eyebrow">cartier</span>
            </button>
          ))}
          {results.hh.map((h) => (
            <button
              key={h.household_id}
              onMouseDown={() => (onHousehold(h.household_id), done())}
              className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left hover:bg-iron"
            >
              <span className="truncate text-[13px] text-bone">
                {h.customer_name} <span className="text-fog">· {h.city}</span>
              </span>
              <span className="num text-[11px] text-fog">{h.household_id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
