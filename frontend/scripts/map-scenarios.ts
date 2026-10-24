// Build-time input for scripts/import_map_geometry.py; never shipped as UI logic.
import { neighborhoods } from "../src/lib/mock/neighborhoods";
import { NB_META } from "../src/lib/mock/households";
export default neighborhoods.map((n) => ({
  id: n.neighborhood_id,
  center: [NB_META[n.neighborhood_id]!.lon, NB_META[n.neighborhood_id]!.lat],
  houses: n.houses.map((h) => ({
    id: h.house_id,
    feeder: String(h.feeder),
    distance: h.distance_m,
  })),
}));
