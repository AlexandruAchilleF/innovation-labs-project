// Pure, deterministic simulation rules shared by the mock API and the UI.
import type {
  BatteryKpis,
  FeederHouse,
  GridState,
  GridWhatIfParams,
  MinutePoint,
  Neighborhood,
  PzuPoint,
} from "./types";

export const LEGAL_LIMIT_V = 253;
export const DERATING_START_V = 248;
export const GRID_TARIFF_RON_KWH = 0.62;
export const PZU_EVENING = 1040;
export const PZU_MIDDAY = 95;
export const BASELINE_PROSUMERS = 25000;
export const BASELINE_ANNUAL_EUR = 5667168;
export const BASELINE_MWH_YEAR = 14250;
export const STEP_MIN = 5;

/** Linear extrapolation of supplier value from the 25,000-prosumer baseline. */
export function extrapolate(prosumers: number) {
  const k = prosumers / BASELINE_PROSUMERS;
  return {
    annual_eur: Math.round(BASELINE_ANNUAL_EUR * k),
    mwh_year: Math.round(BASELINE_MWH_YEAR * k),
  };
}

export function billingDelta(billed_ron: number, verified_ron: number) {
  return Math.round((billed_ron - verified_ron) * 100) / 100;
}

export function pzuCurve(): PzuPoint[] {
  const prices = [410, 380, 360, 350, 360, 420, 560, 640, 520, 300, 160, 110, 95, 95, 100, 140, 320, 620, 880, 1040, 1040, 960, 720, 520];
  return prices.map((p, h) => ({
    hour: h,
    interval_label: `${String(h).padStart(2, "0")}:00–${String((h + 1) % 24).padStart(2, "0")}:00`,
    pzu_price_ron_mwh: p,
    zone: h >= 18 && h <= 22 ? "EVENING_PEAK" : h >= 10 && h <= 15 ? "MIDDAY" : h >= 6 && h <= 9 ? "MORNING" : "NIGHT",
  }));
}

export interface HouseSimParams {
  pv_kw: number;
  battery_kwh: number;
  min_soc_pct: number;
  meter_peak_v: number;
  cable_rise_v: number;
  inverter_threshold_v: number;
  load_scale?: number;
}

const pvShape = (h: number) => (h < 6.5 || h > 19.5 ? 0 : Math.pow(Math.sin(((h - 6.5) / 13) * Math.PI), 1.4));
const loadShape = (h: number) =>
  0.35 + 0.9 * Math.exp(-Math.pow((h - 7.5) / 1, 2)) + 2.1 * Math.exp(-Math.pow((h - 20) / 1.8, 2)) + 0.25 * Math.exp(-Math.pow((h - 13) / 3, 2));

/** Simulate one sunny day in 5-minute steps (288 points). */
export function simulateDay(p: HouseSimParams): MinutePoint[] {
  const out: MinutePoint[] = [];
  const dt = STEP_MIN / 60;
  let soc = Math.max(p.min_soc_pct, 40);
  let tripCooldown = 0;
  for (let m = 0; m < 1440; m += STEP_MIN) {
    const h = m / 60;
    const shape = pvShape(h);
    const pvgis = p.pv_kw * 0.82 * shape;
    const meterV = 229 + (p.meter_peak_v - 229) * Math.pow(shape, 1.2) + Math.sin(m / 37) * 0.6;
    let inverterV = meterV + p.cable_rise_v * shape;
    let pv = pvgis * (0.97 + 0.03 * Math.sin(m / 11));
    let status: MinutePoint["status"] = "OK";
    if (tripCooldown > 0 || inverterV >= p.inverter_threshold_v) {
      if (tripCooldown <= 0) tripCooldown = 15;
      tripCooldown -= STEP_MIN;
      pv = 0;
      status = "TRIP";
      inverterV = Math.min(inverterV, p.inverter_threshold_v + 0.6);
    } else if (inverterV >= DERATING_START_V) {
      pv *= 0.85;
      status = "DERATING";
    }
    const load = loadShape(h) * (p.load_scale ?? 1);
    let net = pv - load; // + surplus, - deficit
    let batt = 0; // + discharge, - charge
    if (p.battery_kwh > 0) {
      const maxP = p.battery_kwh * 0.5;
      if (net > 0 && soc < 100) {
        const c = Math.min(net, maxP, ((100 - soc) / 100) * p.battery_kwh / dt);
        batt = -c;
        soc += (c * dt * 100) / p.battery_kwh;
      } else if (net < 0 && soc > p.min_soc_pct) {
        const d = Math.min(-net, maxP, ((soc - p.min_soc_pct) / 100) * p.battery_kwh / dt);
        batt = d;
        soc -= (d * dt * 100) / p.battery_kwh;
      }
    }
    net = pv + batt - load;
    out.push({
      minute_of_day: m,
      time: `${String(Math.floor(h)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
      ac_voltage_v: r1(inverterV),
      pv_power_kw: r2(pv),
      pvgis_expected_kw: r2(pvgis),
      house_load_kw: r2(load),
      battery_power_kw: r2(batt),
      battery_soc_pct: r1(soc),
      grid_import_kw: r2(Math.max(0, -net)),
      grid_export_kw: r2(Math.max(0, net)),
      status,
    });
  }
  return out;
}

export function batteryKpis(min_soc_pct: number, minutes: MinutePoint[]): BatteryKpis {
  const dt = STEP_MIN / 60;
  const evening = minutes
    .filter((x) => x.minute_of_day >= 17 * 60 && x.minute_of_day < 23 * 60)
    .reduce((s, x) => s + Math.max(0, x.battery_power_kw) * dt, 0);
  return {
    min_soc_pct,
    evening_kwh_delivered_day: r2(evening),
    supplier_pzu_savings_month_ron: r2((evening * 30 * (PZU_EVENING - PZU_MIDDAY)) / 1000),
    customer_grid_tax_savings_month_ron: r2(evening * 30 * GRID_TARIFF_RON_KWH),
  };
}

// ---------- Guardrail ----------
const NUM_RE = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;

export function extractNumbers(text: string): number[] {
  const found = text.match(NUM_RE) ?? [];
  return found.map((s) => Number(s.replace(/\./g, "").replace(",", ".")));
}

/** Every number in the candidate text must appear in the verified deterministic text. */
export function runGuardrail(candidate: string, verified: string) {
  const allowed = new Set(extractNumbers(verified));
  const nums = extractNumbers(candidate);
  const caught = Array.from(new Set(nums.filter((n) => !allowed.has(n))));
  const passed = caught.length === 0;
  return {
    text_ro: passed ? candidate : verified,
    source: passed && candidate !== verified ? ("LLM" as const) : ("DETERMINISTIC_TEMPLATE" as const),
    guardrail_passed: passed,
    numbers_extracted_from_text: Array.from(new Set(nums)),
    unverified_numbers_caught: caught,
  };
}

export const HALLUCINATION_SUFFIX = " În plus, vă acordăm o compensație suplimentară de 999 RON.";

// ---------- LV grid ----------
export function houseVoltage(n: Neighborhood, h: FeederHouse, p: Required<GridWhatIfParams>): number {
  const maxD = Math.max(...n.houses.map((x) => x.distance_m));
  const imbalance = p.rebalance_phases ? 1 : h.phase === "3P" ? 1 : n.phase_imbalance;
  const kvaFactor = 250 / p.transformer_kva;
  const absorb = p.fix_all_batteries ? 0.7 : 1;
  const rise = n.base_rise_v * (h.distance_m / maxD) * imbalance * kvaFactor * absorb * (0.6 + 0.4 * (h.pv_kw / 12));
  const v = 230 * (1 + p.tap_setting_pct / 100) + 4 + rise;
  return r1(p.enable_volt_watt_all ? Math.min(v, 251.8) : v);
}

export function gridState(n: Neighborhood, params: GridWhatIfParams): GridState {
  const p: Required<GridWhatIfParams> = {
    tap_setting_pct: params.tap_setting_pct ?? n.tap_setting_pct,
    transformer_kva: params.transformer_kva ?? n.transformer_kva,
    rebalance_phases: params.rebalance_phases ?? false,
    enable_volt_watt_all: params.enable_volt_watt_all ?? false,
    fix_all_batteries: params.fix_all_batteries ?? false,
  };
  const houses = n.houses.map((h) => ({ ...h, voltage_v: houseVoltage(n, h, p) }));
  const curtailed = p.enable_volt_watt_all
    ? houses.reduce((s, h) => s + (h.voltage_v >= 251 ? h.pv_kw * 0.6 : 0), 0)
    : 0;
  return {
    peak_voltage_v: Math.max(...houses.map((h) => h.voltage_v)),
    houses_tripped: houses.filter((h) => h.voltage_v >= LEGAL_LIMIT_V).length,
    houses_derating: houses.filter((h) => h.voltage_v >= DERATING_START_V && h.voltage_v < LEGAL_LIMIT_V).length,
    curtailed_kwh_day: r1(curtailed),
    houses,
  };
}

function r1(n: number) {
  return Math.round(n * 10) / 10;
}
function r2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Evening import avoided by a battery: usable kWh capped by typical evening load (7 kWh). Grid tariff + energy ≈ 1,30 RON/kWh. */
export const EVENING_IMPORT_RON_KWH = 1.3;
export function eveningBatterySavings(battery_kwh: number, min_soc_pct: number) {
  const usable = Math.min(battery_kwh * (1 - min_soc_pct / 100) * 0.95, 7);
  return { kwh_day: Math.round(usable * 100) / 100, ron_month: Math.round(usable * 30 * EVENING_IMPORT_RON_KWH) };
}
