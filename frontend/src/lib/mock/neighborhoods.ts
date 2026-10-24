import { gridState } from "../sim";
import type { FeederHouse, Neighborhood } from "../types";
import { NB_META, householdSpecs } from "./households";

const defs: Array<{ id: string; name: string; kva: number; tap: number; rise: number; imb: number; cause: string; feeders: number; houses: number }> = [
  { id: "NB-DUMBRAVITA", name: "Dumbrăvița Nord", kva: 250, tap: 2.5, rise: 19, imb: 1.25, cause: "Densitate PV mare + plot trafo +2,5%", feeders: 3, houses: 18 },
  { id: "NB-GIROC", name: "Giroc – Planetelor", kva: 160, tap: 2.5, rise: 10, imb: 1.3, cause: "Trafo subdimensionat 160 kVA", feeders: 2, houses: 14 },
  { id: "NB-FLORESTI", name: "Florești – Eroilor", kva: 400, tap: 0, rise: 14, imb: 1.35, cause: "Dezechilibru faze L1 supraîncărcată", feeders: 3, houses: 16 },
  { id: "NB-BRAGADIRU", name: "Bragadiru Sud", kva: 250, tap: 2.5, rise: 17, imb: 1.2, cause: "Linie lungă 620 m, secțiune mică", feeders: 2, houses: 15 },
  { id: "NB-CORBEANCA", name: "Corbeanca Centru", kva: 400, tap: 0, rise: 8, imb: 1.1, cause: "Rețea sănătoasă — probleme doar locale", feeders: 2, houses: 12 },
  { id: "NB-CLUJ", name: "Cluj – Mărăști", kva: 630, tap: 0, rise: 9, imb: 1.15, cause: "Baterii neoptimizate seara", feeders: 3, houses: 14 },
  { id: "NB-BRASOV", name: "Brașov – Schei", kva: 400, tap: 0, rise: 10, imb: 1.15, cause: "Stres moderat la prânz", feeders: 2, houses: 12 },
  { id: "NB-BUCURESTI", name: "București – Drumul Taberei", kva: 630, tap: -2.5, rise: 12, imb: 1.2, cause: "Rețea urbană robustă", feeders: 3, houses: 15 },
];

function build(): Neighborhood[] {
  return defs.map((d, ni) => {
    const meta = NB_META[d.id]!;
    const houses: FeederHouse[] = Array.from({ length: d.houses }, (_, i) => {
      const feeder = i % d.feeders;
      const idx = Math.floor(i / d.feeders);
      const perFeeder = Math.ceil(d.houses / d.feeders);
      return {
        house_id: `${d.id}-H${i + 1}`,
        label: `Casa ${i + 1}`,
        feeder,
        distance_m: Math.round(60 + (idx / Math.max(1, perFeeder - 1)) * (420 + feeder * 60)),
        phase: (["L1", "L2", "L3", "3P", "L1", "L2"] as const)[(i + ni) % 6]!,
        pv_kw: [5, 6, 8, 10, 6, 12][(i * 3 + ni) % 6]!,
        voltage_v: 0,
      };
    });
    // Link the fleet's monitored households to evenly spread connection points so the map can find them.
    const members = householdSpecs.filter((h) => h.neighborhood_id === d.id).slice(0, houses.length);
    members.forEach((m, k) => {
      const i = Math.floor((k * houses.length) / members.length);
      houses[i] = { ...houses[i]!, house_id: m.id, label: m.id, household_id: m.id, monitored: true, pv_kw: m.pv_kw };
    });
    const n: Neighborhood = {
      neighborhood_id: d.id,
      name: d.name,
      city: meta.city,
      transformer_id: meta.pt,
      transformer_kva: d.kva,
      tap_setting_pct: d.tap,
      stress_cause_ro: d.cause,
      base_rise_v: d.rise,
      phase_imbalance: d.imb,
      peak_voltage_v: 0,
      houses_tripped: 0,
      houses,
    };
    const st = gridState(n, {});
    n.houses = st.houses;
    n.peak_voltage_v = st.peak_voltage_v;
    n.houses_tripped = st.houses_tripped;
    return n;
  });
}

export const neighborhoods: Neighborhood[] = build();
