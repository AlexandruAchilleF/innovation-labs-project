import { dayTotals } from "./energy-day";
import type { HouseholdDetail, MinutePoint } from "./types";

/**
 * Day-by-day view of the billing month. The backend ships one reference day (minute telemetry) and the
 * month totals; this spreads the month over its days with a deterministic, seeded weather pattern
 * (same household -> same month) and rescales every day so the sums match the month totals exactly.
 */

export const MONTH = { year: 2026, month: 8, days: 31, label: "august 2026" } as const;

export interface DayStat {
  day: number;
  /** 0 = luni ... 6 = duminică */
  weekday: number;
  /** 0..1 clear-sky factor vs the reference (clear) day */
  sun: number;
  produced: number;
  selfUsed: number;
  battery: number;
  exported: number;
  consumed: number;
  imported: number;
  tripMinutes: number;
  lostKwh: number;
  peakV: number;
  savedRon: number;
  lostRon: number;
}

export interface MonthDays {
  days: DayStat[];
  totals: Omit<DayStat, "day" | "weekday" | "sun" | "peakV"> & { peakV: number; tripDays: number };
  best: DayStat;
  worst: DayStat;
}

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clear-sky factor per day: mostly sunny August with a couple of passing fronts (AR(1) cloud cover). */
export function sunPattern(seed: string, days: number = MONTH.days): number[] {
  const rnd = seeded(seed);
  let cloud = 0.15;
  return Array.from({ length: days }, () => {
    const front = rnd() < 0.09 ? 0.35 + rnd() * 0.3 : 0;
    cloud = Math.min(0.75, 0.5 * cloud + 0.18 * rnd() + front);
    return +Math.max(0.25, 1 - cloud).toFixed(3);
  });
}

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
/** Scale `raw` so it sums to `target`; a missing target keeps the raw values. */
const fit = (raw: number[], target: number) => {
  const s = sum(raw);
  return target > 0 && s > 0 ? raw.map((x) => (x * target) / s) : raw;
};

export function buildMonth(d: HouseholdDetail): MonthDays {
  const a = d.analysis;
  const b = a.billing_verdict;
  const ref = dayTotals(d.timeseries.minutes);
  const refPeakV = Math.max(...d.timeseries.minutes.map((m) => m.ac_voltage_v));
  const refBattery = a.battery_verdict.battery_kwh > 0 ? b.battery_cycled_kwh / MONTH.days : 0;
  const sun = sunPattern(a.household_id);
  const rnd = seeded(`${a.household_id}:load`);
  const firstWeekday = (new Date(MONTH.year, MONTH.month - 1, 1).getDay() + 6) % 7;
  const weekday = sun.map((_, i) => (firstWeekday + i) % 7);

  const produced = fit(
    sun.map((s) => ref.produced * s),
    b.produced_kwh,
  );
  const exported = fit(
    sun.map((s) => ref.exported * s * s),
    b.meter_export_kwh,
  ).map((x, i) => Math.min(x, produced[i]!));
  const battery = fit(
    sun.map((s) => refBattery * Math.min(1, s * 1.25)),
    b.battery_cycled_kwh,
  ).map((x, i) => Math.min(x, produced[i]! - exported[i]!));
  const selfUsed = produced.map((p, i) => Math.max(0, p - exported[i]! - battery[i]!));
  const consumed = weekday.map(
    (w, i) => ref.consumed * (w >= 5 ? 1.12 : 1) * (0.92 + rnd() * 0.16) * (0.9 + 0.15 * sun[i]!),
  );
  const imported = consumed.map((c, i) => Math.max(0, c - selfUsed[i]! - battery[i]!));

  // Overvoltage trips need a strong, clear midday: none below ~80 % sun, more on weekends (less local load).
  const tripRaw = sun.map((s, i) =>
    ref.tripMinutes > 0
      ? ref.tripMinutes * Math.max(0, (s - 0.8) / 0.2) ** 1.2 * (weekday[i]! >= 5 ? 1.15 : 1)
      : 0,
  );
  const tripMinutes = tripRaw.map((t) => (t >= 3 ? Math.round(t) : 0));
  const lostKwh = tripMinutes.map((t) =>
    ref.tripMinutes > 0 ? (ref.lostToTrips * t) / ref.tripMinutes : 0,
  );
  const threshold = a.grid_verdict.inverter_threshold_v;
  const peakV = sun.map((s, i) => {
    const v = 231 + (refPeakV - 231) * (0.55 + 0.45 * s);
    return +(
      tripMinutes[i]! > 0
        ? Math.max(v, threshold + 0.4 + (2.5 * tripMinutes[i]!) / Math.max(ref.tripMinutes, 1))
        : Math.min(v, threshold - 0.3)
    ).toFixed(1);
  });

  const savedRon = fit(
    selfUsed.map((x, i) => x + battery[i]!),
    b.self_consumption_savings_ron,
  );
  const lossMonth = a.total_customer_monthly_benefit_ron;
  const lostRon =
    sum(lostKwh) > 0 ? fit(lostKwh, lossMonth) : sun.map(() => lossMonth / MONTH.days);

  const days: DayStat[] = sun.map((s, i) => ({
    day: i + 1,
    weekday: weekday[i]!,
    sun: s,
    produced: produced[i]!,
    selfUsed: selfUsed[i]!,
    battery: battery[i]!,
    exported: exported[i]!,
    consumed: consumed[i]!,
    imported: imported[i]!,
    tripMinutes: tripMinutes[i]!,
    lostKwh: lostKwh[i]!,
    peakV: peakV[i]!,
    savedRon: savedRon[i]!,
    lostRon: lostRon[i]!,
  }));
  const total = (k: keyof DayStat) => sum(days.map((x) => x[k] as number));
  const byProduced = [...days].sort((x, y) => y.produced - x.produced);
  return {
    days,
    totals: {
      produced: total("produced"),
      selfUsed: total("selfUsed"),
      battery: total("battery"),
      exported: total("exported"),
      consumed: total("consumed"),
      imported: total("imported"),
      tripMinutes: total("tripMinutes"),
      lostKwh: total("lostKwh"),
      savedRon: total("savedRon"),
      lostRon: total("lostRon"),
      peakV: Math.max(...peakV),
      tripDays: days.filter((x) => x.tripMinutes > 0).length,
    },
    best: byProduced[0]!,
    worst: byProduced[byProduced.length - 1]!,
  };
}

/** Hourly kW profile of one day: the reference day's shape scaled by that day's sun and load. */
export function dayProfile(minutes: MinutePoint[], ref: ReturnType<typeof dayTotals>, s: DayStat) {
  const loadK = ref.consumed > 0 ? s.consumed / ref.consumed : 1;
  const pvK = ref.produced > 0 ? s.produced / ref.produced : s.sun;
  return Array.from({ length: 24 }, (_, h) => {
    const hour = minutes.filter((m) => Math.floor(m.minute_of_day / 60) === h);
    const avg = (f: (m: MinutePoint) => number) =>
      hour.length ? sum(hour.map(f)) / hour.length : 0;
    return {
      h,
      pv: avg((m) => m.pvgis_expected_kw) * pvK,
      load: avg((m) => m.house_load_kw) * loadK,
    };
  });
}

export const WEEKDAYS = ["L", "Ma", "Mi", "J", "V", "S", "D"];
export const WEEKDAYS_LONG = ["luni", "marți", "miercuri", "joi", "vineri", "sâmbătă", "duminică"];
