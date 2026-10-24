import { useSyncExternalStore } from "react";
import { fmt } from "./format";
import { mockHouseholdDetail, mockPortfolio } from "./mock/households";
import { neighborhoods } from "./mock/neighborhoods";
import { HALLUCINATION_SUFFIX, batteryKpis, gridState, runGuardrail, simulateDay } from "./sim";
import { householdSpecs } from "./mock/households";
import {
  normalizeGridState,
  normalizeGuardrail,
  normalizeHouseholdDetail,
  normalizeNeighborhood,
  normalizePortfolio,
  normalizeWhatIfBattery,
} from "./adapters";
import type {
  GridWhatIfParams,
  GridWhatIfResult,
  GuardrailDocType,
  GuardrailResult,
  HouseholdDetail,
  Neighborhood,
  Portfolio,
  TelegramResult,
  WhatIfBatteryResult,
} from "./types";

export const API_BASE: string = import.meta.env["VITE_API_URL"] || "http://127.0.0.1:8000";

// ---------- connection status store ----------
type Mode = "unknown" | "live" | "demo";
let mode: Mode = "unknown";
const listeners = new Set<() => void>();
function setMode(m: Mode) {
  if (mode === "live" && m === "demo") return; // one success is enough to show live
  if (m !== mode) {
    mode = m;
    listeners.forEach((l) => l());
  }
}
export function useApiMode(): Mode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => mode,
    () => "unknown",
  );
}

let backendDown = false;

/** Try the FastAPI backend; on any failure fall back to deterministic mock data. */
export async function withFallback<T>(path: string, init: RequestInit | undefined, mock: () => T, fetcher: typeof fetch = fetch): Promise<T> {
  if (!backendDown) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetcher(`${API_BASE}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as T;
      setMode("live");
      return data;
    } catch {
      backendDown = mode !== "live";
    }
  }
  setMode("demo");
  return mock();
}

// test hook
export function __resetApiState() {
  backendDown = false;
  mode = "unknown";
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

const fetchNeighborhood = async (nid: string) =>
  normalizeNeighborhood(
    await withFallback<Neighborhood>(`/api/neighborhoods/${nid}`, undefined, () => neighborhoods.find((n) => n.neighborhood_id === nid) ?? neighborhoods[0]!),
  );

export const api = {
  portfolio: async () => normalizePortfolio(await withFallback<Portfolio>("/api/portfolio", undefined, mockPortfolio)),

  household: async (id: string) =>
    normalizeHouseholdDetail(await withFallback<HouseholdDetail>(`/api/households/${id}`, undefined, () => mockHouseholdDetail(id)), id),

  whatIfBattery: async (id: string, min_soc_pct: number, modeName?: string) =>
    normalizeWhatIfBattery(
      await withFallback<WhatIfBatteryResult>(`/api/households/${id}/what-if-battery`, post({ min_soc_pct, mode: modeName }), () => mockWhatIfBattery(id, min_soc_pct)),
    ),

  telegram: (id: string) =>
    withFallback<TelegramResult>(`/api/households/${id}/telegram-alert`, post({}), () => mockTelegram(id)),

  guardrail: async (id: string, doc_type: GuardrailDocType, text_ro?: string) =>
    normalizeGuardrail(
      await withFallback<GuardrailResult>(`/api/households/${id}/test-guardrail`, post({ doc_type, text_ro }), () => mockGuardrail(id, doc_type, text_ro)),
    ),

  // the list endpoint omits `houses`; fill them from the per-neighborhood detail endpoint
  neighborhoods: async () => {
    const list = await withFallback<Neighborhood[]>("/api/neighborhoods", undefined, () => neighborhoods);
    return Promise.all(list.map((n) => (n.houses ? normalizeNeighborhood(n) : fetchNeighborhood(n.neighborhood_id))));
  },

  neighborhood: fetchNeighborhood,

  neighborhoodWhatIf: async (nid: string, params: GridWhatIfParams) => {
    const res = await withFallback<GridWhatIfResult>(`/api/neighborhoods/${nid}/what-if`, post(params), () => mockGridWhatIf(nid, params));
    return { ...res, before: normalizeGridState(res.before), after: normalizeGridState(res.after) };
  },

  openPdfDossier: (id: string) => {
    if (mode === "live") {
      window.open(`${API_BASE}/api/households/${id}/pdf-dossier`, "_blank");
      return;
    }
    openPrintableDossier(id);
  },
};

// ---------- mock implementations ----------
export function mockWhatIfBattery(id: string, min_soc: number): WhatIfBatteryResult {
  const spec = householdSpecs.find((h) => h.id === id) ?? householdSpecs[0]!;
  const p = {
    pv_kw: spec.pv_kw,
    battery_kwh: spec.battery_kwh,
    meter_peak_v: spec.meter_peak_v,
    cable_rise_v: spec.cable_rise_v,
    inverter_threshold_v: spec.inverter_threshold_v,
  };
  const b = simulateDay({ ...p, min_soc_pct: spec.configured_soc });
  const a = simulateDay({ ...p, min_soc_pct: min_soc });
  const before = batteryKpis(spec.configured_soc, b);
  const after = batteryKpis(min_soc, a);
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    before,
    after,
    delta: {
      min_soc_pct: min_soc - spec.configured_soc,
      evening_kwh_delivered_day: r(after.evening_kwh_delivered_day - before.evening_kwh_delivered_day),
      supplier_pzu_savings_month_ron: r(after.supplier_pzu_savings_month_ron - before.supplier_pzu_savings_month_ron),
      customer_grid_tax_savings_month_ron: r(after.customer_grid_tax_savings_month_ron - before.customer_grid_tax_savings_month_ron),
    },
    timeseries: { before: b, after: a },
  };
}

function mockTelegram(id: string): TelegramResult {
  const { analysis: a, scenario: s } = mockHouseholdDetail(id);
  const g = a.grid_verdict;
  const msg = [
    `⚡ SunProof · Alertă O&M — ${a.household_id}`,
    `Client: ${a.customer_name}, ${a.street_address}`,
    `Coordonate: ${s.coordinates.lat.toFixed(5)}, ${s.coordinates.lon.toFixed(5)}`,
    `Invertor: ${a.inverter_brand} ${a.inverter_model} · ${fmt(a.installed_pv_kw, 1)} kWp · ${a.phase}`,
    ``,
    `Diagnostic: ${a.one_line_triage_ro}`,
    ``,
    `Tensiune contor (PCC): ${fmt(g.max_meter_voltage_v, 1)} V`,
    `Tensiune invertor: ${fmt(g.max_inverter_voltage_v, 1)} V`,
    `Creștere pe cablu intern: +${fmt(g.voltage_rise_internal_cable_v, 1)} V (${fmt(g.cable_mm2, 1)} mm² × ${g.cable_length_m} m)`,
    `Prag invertor: ${g.inverter_threshold_v} V (legal: ${g.legal_limit_v} V)`,
    `Vecini declanșați: ${g.neighbors_affected_simultaneously}/${g.neighbors_total}`,
  ].join("\n");
  return { sent: true, simulated: true, message_text: msg, chat_id: "-1002026160" };
}

function docText(id: string, doc: GuardrailDocType) {
  const a = mockHouseholdDetail(id).analysis;
  return doc === "invoice_explanation" ? a.invoice_explanation_text : doc === "distributor_complaint" ? a.distributor_complaint_text : a.battery_guide_text;
}

export function mockGuardrail(id: string, doc: GuardrailDocType, text?: string): GuardrailResult {
  const verified = docText(id, doc);
  const input = text ?? verified;
  const result = runGuardrail(input, verified);
  return { input_text_ro: input, result, caught: result.unverified_numbers_caught, fallback_applied: !result.guardrail_passed };
}

export function hallucinatedText(id: string, doc: GuardrailDocType) {
  return docText(id, doc) + HALLUCINATION_SUFFIX;
}

function mockGridWhatIf(nid: string, params: GridWhatIfParams): GridWhatIfResult {
  const n = neighborhoods.find((x) => x.neighborhood_id === nid) ?? neighborhoods[0]!;
  return { before: gridState(n, {}), after: gridState(n, params) };
}

function openPrintableDossier(id: string) {
  const { analysis: a } = mockHouseholdDetail(id);
  const w = window.open("", "_blank");
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  w.document.write(`<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>Dosar tehnic ${a.household_id}</title>
<style>body{font-family:Inter,system-ui,sans-serif;max-width:760px;margin:40px auto;color:#0f172a;line-height:1.5}h1{font-size:20px}h2{font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin-top:28px}table{width:100%;border-collapse:collapse;font-size:13px}td{border-bottom:1px solid #e2e8f0;padding:6px 0}td:last-child{text-align:right;font-family:'JetBrains Mono',monospace}p{font-size:13px}</style></head><body>
<h1>Dosar tehnic — ${esc(a.customer_name)} (${a.household_id})</h1>
<p>${esc(a.street_address)} · POD ${a.pod_code} · ${esc(a.distribution_operator)} · ${a.transformer_id}</p>
<h2>Diagnostic</h2><p>${esc(a.one_line_triage_ro)}</p>
<h2>Măsurători</h2><table>
<tr><td>Tensiune maximă contor (PCC)</td><td>${fmt(a.grid_verdict.max_meter_voltage_v, 1)} V</td></tr>
<tr><td>Tensiune maximă invertor</td><td>${fmt(a.grid_verdict.max_inverter_voltage_v, 1)} V</td></tr>
<tr><td>Limita legală EN 50549-1</td><td>${a.grid_verdict.legal_limit_v} V</td></tr>
<tr><td>Vecini declanșați simultan</td><td>${a.grid_verdict.neighbors_affected_simultaneously}/${a.grid_verdict.neighbors_total}</td></tr>
<tr><td>Minute deconectare / zi</td><td>${a.grid_verdict.trip_minutes}</td></tr></table>
<h2>Sesizare către distribuitor</h2><p>${esc(a.distributor_complaint_text)}</p>
<p style="margin-top:40px;color:#64748b;font-size:11px">Generat de SunProof · mod demonstrativ</p>
<script>setTimeout(()=>print(),300)</script></body></html>`);
  w.document.close();
}
