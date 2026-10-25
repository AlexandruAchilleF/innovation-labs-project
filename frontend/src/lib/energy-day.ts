import type { MinutePoint } from "./types";

/**
 * Pure helpers behind the prosumer energy scene and day charts. The timeseries may be per-minute
 * or downsampled (5 min), so every lookup goes through the nearest sample, never an exact match.
 */

export function pointAt(minutes: MinutePoint[], minute: number): MinutePoint | undefined {
  let best: MinutePoint | undefined;
  for (const m of minutes) {
    if (!best || Math.abs(m.minute_of_day - minute) < Math.abs(best.minute_of_day - minute))
      best = m;
  }
  return best;
}

/** Sampling step in minutes (1 for raw telemetry, 5 for the downsampled API payload). */
export function stepMinutes(minutes: MinutePoint[]): number {
  if (minutes.length < 2) return 1;
  return Math.max(1, minutes[1]!.minute_of_day - minutes[0]!.minute_of_day);
}

export interface DayTotals {
  produced: number;
  consumed: number;
  exported: number;
  imported: number;
  /** kWh the panels could have produced (PVGIS) but did not, while the inverter was tripped. */
  lostToTrips: number;
  tripMinutes: number;
}

export function dayTotals(minutes: MinutePoint[]): DayTotals {
  const h = stepMinutes(minutes) / 60;
  const t: DayTotals = {
    produced: 0,
    consumed: 0,
    exported: 0,
    imported: 0,
    lostToTrips: 0,
    tripMinutes: 0,
  };
  for (const m of minutes) {
    t.produced += m.pv_power_kw * h;
    t.consumed += m.house_load_kw * h;
    t.exported += m.grid_export_kw * h;
    t.imported += m.grid_import_kw * h;
    if (m.status === "TRIP") {
      t.tripMinutes += h * 60;
      t.lostToTrips += Math.max(0, m.pvgis_expected_kw - m.pv_power_kw) * h;
    }
  }
  return t;
}

export type FlowKey = "pv" | "battery" | "ac" | "home" | "grid";

export interface Flow {
  key: FlowKey;
  kw: number;
  /** true = energy moves from the inverter outwards (to battery, home, grid); false = inwards. */
  outward: boolean;
}

/**
 * The cables of the scene for one sample. Battery: + charging (outward), - discharging.
 * "ac" is the inverter's AC side towards the meter: PV minus what went into the battery.
 */
export function flowsAt(p: MinutePoint): Flow[] {
  const exporting = p.grid_export_kw >= p.grid_import_kw;
  const ac = p.pv_power_kw - p.battery_power_kw;
  return [
    { key: "pv", kw: p.pv_power_kw, outward: false },
    { key: "battery", kw: Math.abs(p.battery_power_kw), outward: p.battery_power_kw > 0 },
    { key: "ac", kw: Math.abs(ac), outward: ac > 0 },
    { key: "home", kw: p.house_load_kw, outward: true },
    { key: "grid", kw: exporting ? p.grid_export_kw : p.grid_import_kw, outward: exporting },
  ];
}

/** Seconds for one pulse to travel a cable: faster with more power, clamped so it stays readable. */
export function pulseSeconds(kw: number, peakKw: number): number {
  const r = Math.min(1, kw / Math.max(peakKw, 0.1));
  return +(2.6 - 1.8 * r).toFixed(2);
}

/** Visual equipment sizing from the installation: panel count from kWp, battery modules from kWh. */
export function equipmentFor(pvKw: number, batteryKwh: number) {
  return {
    panels: Math.min(12, Math.max(3, Math.round(pvKw / 0.45 / 2))),
    batteryModules: batteryKwh > 0 ? Math.min(4, Math.max(1, Math.round(batteryKwh / 5))) : 0,
  };
}

export const clock = (minute: number) =>
  `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

/**
 * The minute worth opening the day on: the first inverter trip, else (battery issue) the first
 * evening minute where the house buys from the grid while the battery still holds charge,
 * else the solar production peak.
 */
export function keyMinute(minutes: MinutePoint[], batteryIssue: boolean): number {
  const trip = minutes.find((m) => m.status === "TRIP");
  if (trip) return trip.minute_of_day;
  if (batteryIssue) {
    const evening = minutes.find(
      (m) => m.minute_of_day >= 18 * 60 && m.grid_import_kw > 0.05 && m.battery_soc_pct > 30,
    );
    return evening?.minute_of_day ?? 20 * 60;
  }
  let peak = minutes[0];
  for (const m of minutes) if (!peak || m.pv_power_kw > peak.pv_power_kw) peak = m;
  return peak && peak.pv_power_kw > 0 ? peak.minute_of_day : 13 * 60;
}
