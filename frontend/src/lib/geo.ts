// Pure geometry + congestion helpers for the map workspace.
// Live backend houses carry x_m/y_m (metres east/north of the transformer) and 15-min PCC voltages;
// the offline mocks do not, so every accessor has a deterministic fallback.
import { NB_META } from "./mock/households";
import { DERATING_START_V, LEGAL_LIMIT_V } from "./sim";
import type { FeederHouse, GridState, Neighborhood, TransformerPoint } from "./types";

export const SLOTS = 96; // 15-minute slots per day
export const ROMANIA_CENTER: [number, number] = [24.97, 45.94];

export type LngLat = [number, number];
export type HouseStatus = "night" | "normal" | "derating" | "trip";

/** Voltage colour stops (CSS token names) shared by the map layers and legend. */
export const VOLTAGE_STOPS: [number, string][] = [
  [230, "--smoke"],
  [240, "--fog"],
  [DERATING_START_V, "--warning"],
  [LEGAL_LIMIT_V, "--critical"],
];

export const slotLabel = (slot: number) => {
  const m = Math.max(0, Math.min(SLOTS - 1, slot)) * 15;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** August clear-sky shape, 0 at night, 1 at solar noon (~13:15 local). */
export function solarFactor(slot: number): number {
  const h = slot / 4;
  if (h <= 6.25 || h >= 20.25) return 0;
  return Math.sin(((h - 6.25) / 14) * Math.PI);
}

export function nbCenter(
  nb: Pick<Neighborhood, "neighborhood_id" | "latitude" | "longitude">,
): LngLat {
  if (typeof nb.longitude === "number" && typeof nb.latitude === "number")
    return [nb.longitude, nb.latitude];
  const meta = NB_META[nb.neighborhood_id];
  return meta ? [meta.lon, meta.lat] : ROMANIA_CENTER;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const feederKey = (h: FeederHouse) => h.feeder_id ?? `F${h.feeder}`;

/** Plan position in metres relative to the transformer. */
export function housePlanXY(h: FeederHouse): { x: number; y: number } {
  if (typeof h.x_m === "number" && typeof h.y_m === "number") return { x: h.x_m, y: h.y_m };
  // Mock fallback: each feeder leaves the PT at its own bearing, houses alternate street sides.
  const angle = (-15 + (h.feeder % 4) * 95) * (Math.PI / 180);
  const side = hash(h.house_id) > 0.5 ? 1 : -1;
  const d = h.distance_m;
  return {
    x: Math.cos(angle) * d - Math.sin(angle) * 14 * side,
    y: Math.sin(angle) * d + Math.cos(angle) * 14 * side,
  };
}

export function toLngLat(center: LngLat, x: number, y: number): LngLat {
  const [lon, lat] = center;
  return [lon + x / (111320 * Math.cos((lat * Math.PI) / 180)), lat + y / 110540];
}

export function houseVoltageAt(h: FeederHouse, slot: number): number {
  const series = h.pcc_voltage_15m;
  if (series && series.length === SLOTS) return series[slot] ?? h.voltage_v;
  return 230.5 + (h.voltage_v - 230.5) * Math.pow(solarFactor(slot), 1.2);
}

export function houseStatusAt(h: FeederHouse, slot: number): HouseStatus {
  const raw = h.worst_status_15m?.[slot];
  if (raw) {
    if (raw.startsWith("TRIP") || raw === "OFFLINE") return "trip";
    if (raw.startsWith("DERATING")) return "derating";
    if (raw === "STANDBY_NIGHT") return "night";
    return "normal";
  }
  if (solarFactor(slot) === 0) return "night";
  const v = houseVoltageAt(h, slot);
  return v >= LEGAL_LIMIT_V ? "trip" : v >= DERATING_START_V ? "derating" : "normal";
}

/** Transformer state for a 15-min slot (5-min backend series sampled every 3rd point). */
export function transformerAt(
  nb: Neighborhood | GridState,
  kva: number,
  slot: number,
): TransformerPoint {
  const ts = nb.transformer_timeseries;
  if (ts && ts.length >= SLOTS) {
    const p = ts[Math.min(ts.length - 1, Math.round((slot * ts.length) / SLOTS))]!;
    return p;
  }
  const houses = nb.houses;
  const pv = houses.reduce((s, h) => s + h.pv_kw, 0) * 0.85 * solarFactor(slot);
  const h = slot / 4;
  const load =
    houses.length *
    (0.35 + 0.9 * Math.exp(-((h - 7.5) ** 2)) + 2.1 * Math.exp(-(((h - 20) / 1.8) ** 2)));
  const p = load - pv;
  const volts = houses.map((x) => houseVoltageAt(x, slot));
  return {
    minute_of_day: slot * 15,
    timestamp: slotLabel(slot),
    active_power_kw: Math.round(p * 10) / 10,
    loading_pct: Math.round((Math.abs(p) / kva) * 1000) / 10,
    max_house_voltage_v: Math.max(230, ...volts),
    pv_production_kw: Math.round(pv * 10) / 10,
    houses_tripped: houses.filter((x) => houseStatusAt(x, slot) === "trip").length,
    houses_derating: houses.filter((x) => houseStatusAt(x, slot) === "derating").length,
  };
}

export function transformerDay(nb: Neighborhood | GridState, kva: number): TransformerPoint[] {
  return Array.from({ length: SLOTS }, (_, s) => transformerAt(nb, kva, s));
}

export interface FeederRun {
  key: string;
  street: string;
  houses: FeederHouse[]; // sorted by distance from the PT
  trunk: { x: number; y: number }[]; // PT at index 0, then one vertex per house
  peakLoadingPct: number;
}

/** Group houses into feeders and derive a street trunk through the midpoints of consecutive houses. */
export function feederRuns(nb: Neighborhood | GridState, houses: FeederHouse[]): FeederRun[] {
  const groups = new Map<string, FeederHouse[]>();
  houses.forEach((h) => groups.set(feederKey(h), [...(groups.get(feederKey(h)) ?? []), h]));
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => a.distance_m - b.distance_m);
      const pts = sorted.map(housePlanXY);
      const trunk = [
        { x: 0, y: 0 },
        ...pts.map((p, i) => {
          const n = pts[i + 1] ?? p;
          return { x: (p.x + n.x) / 2, y: (p.y + n.y) / 2 };
        }),
      ];
      const info = nb.feeders?.find((f) => f.feeder_id === key);
      const pv = sorted.reduce((s, h) => s + h.pv_kw, 0);
      return {
        key,
        street: info?.street_name ?? `Plecarea ${key.replace(/^.*-/, "")}`,
        houses: sorted,
        trunk,
        // Mock fallback: ampacity of a 3x95 Al cable (~230 A) carrying 85% of the feeder PV at 400 V.
        peakLoadingPct:
          info?.peak_loading_pct_of_ampacity ??
          Math.round(((pv * 0.85 * 1000) / (Math.sqrt(3) * 400) / 230) * 1000) / 10,
      };
    });
}

/**
 * Feeder loading for a slot. The backend publishes only each feeder's peak reverse current, so the
 * profile follows the transformer's power curve: loading(t) = peak x |P(t)| / max|P| over the day.
 */
export function feederLoadingAt(run: FeederRun, day: TransformerPoint[], slot: number): number {
  const peak = Math.max(1e-6, ...day.map((p) => Math.abs(p.active_power_kw)));
  return (
    Math.round(((run.peakLoadingPct * Math.abs(day[slot]?.active_power_kw ?? 0)) / peak) * 10) / 10
  );
}

export interface Congestion {
  slot: number;
  transformerLoadingPct: number;
  reverseFlow: boolean;
  activePowerKw: number;
  maxVoltageV: number;
  tripped: number;
  derating: number;
  feeders: { key: string; street: string; loadingPct: number; maxVoltageV: number }[];
  /** 0-100: worst of thermal (transformer / feeder loading) and voltage headroom used. */
  index: number;
}

export function congestionAt(
  nb: Neighborhood | GridState,
  houses: FeederHouse[],
  kva: number,
  slot: number,
  day = transformerDay(nb, kva),
): Congestion {
  const t = day[slot] ?? transformerAt(nb, kva, slot);
  const runs = feederRuns(nb, houses);
  const feeders = runs.map((r) => ({
    key: r.key,
    street: r.street,
    loadingPct: feederLoadingAt(r, day, slot),
    maxVoltageV: Math.max(230, ...r.houses.map((h) => houseVoltageAt(h, slot))),
  }));
  const maxV = Math.max(230, ...houses.map((h) => houseVoltageAt(h, slot)));
  const statuses = houses.map((h) => houseStatusAt(h, slot));
  const thermal = Math.max(t.loading_pct, ...feeders.map((f) => f.loadingPct));
  const voltage = ((maxV - 230) / (LEGAL_LIMIT_V - 230)) * 100;
  return {
    slot,
    transformerLoadingPct: t.loading_pct,
    reverseFlow: t.active_power_kw < 0,
    activePowerKw: t.active_power_kw,
    maxVoltageV: Math.round(maxV * 100) / 100,
    tripped: statuses.filter((s) => s === "trip").length,
    derating: statuses.filter((s) => s === "derating").length,
    feeders,
    index: Math.round(Math.max(0, Math.min(100, Math.max(thermal, voltage)))),
  };
}

/** Slot with the worst congestion index of the day (default scrubber position). */
export function worstSlot(
  nb: Neighborhood | GridState,
  houses: FeederHouse[],
  kva: number,
): number {
  if (typeof nb.peak_voltage_minute === "number" && nb.peak_voltage_minute > 0)
    return Math.floor(nb.peak_voltage_minute / 15);
  const day = transformerDay(nb, kva);
  let best = 52;
  let bestScore = -1;
  for (let s = 0; s < SLOTS; s++) {
    const c = congestionAt(nb, houses, kva, s, day);
    // index saturates at 100, so break ties on the highest connection voltage
    const score = c.index * 1000 + c.maxVoltageV;
    if (score > bestScore) [best, bestScore] = [s, score];
  }
  return best;
}

/** Rough day-level stress for the country-wide pins: worst of reverse loading and voltage headroom used. */
export const nbStressIndex = (nb: Neighborhood) =>
  Math.round(
    Math.max(
      nb.peak_reverse_loading_pct ?? 0,
      ((nb.peak_voltage_v - 230) / (LEGAL_LIMIT_V - 230)) * 100,
    ),
  );
