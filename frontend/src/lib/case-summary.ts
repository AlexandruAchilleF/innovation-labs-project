import { fmt } from "./format";
import { scenarioLabel } from "./i18n";
import type { HouseholdDetail, ScenarioCode } from "./types";

/**
 * "Conclusion first, numbers as proof": one main problem per household, picked from the scenario
 * code, plus the three engine numbers that prove it. Every number comes from the engine verdicts.
 */
export type CaseKind = "grid" | "local" | "battery" | "billing" | "billing_ok" | "healthy";

const KIND: Record<ScenarioCode, CaseKind> = {
  GRID_OVERVOLTAGE: "grid",
  LOCAL_OVERVOLTAGE_SENSITIVITY: "local",
  MISCONFIGURED_MODE: "battery",
  MISSING_EXPORT_INDEX: "billing",
  INVOICE_VALID_EXPLAINED: "billing_ok",
  HEALTHY: "healthy",
};

export const caseKind = (d: HouseholdDetail): CaseKind => KIND[d.scenario.code] ?? "healthy";

export interface Proof {
  label: string;
  value: string;
  note: string;
}

export interface SupplierCase {
  kind: CaseKind;
  title: string;
  /** Monthly loss attached to the main problem (RON); null when nothing is lost. */
  lossRon: number | null;
  proof: Proof[];
}

export function supplierCase(d: HouseholdDetail): SupplierCase {
  const { grid_verdict: g, battery_verdict: b, billing_verdict: f } = d.analysis;
  const kind = caseKind(d);
  const limit = `limita legală ${fmt(g.legal_limit_v)} V`;
  const neighbors: Proof = {
    label: "Vecini căzuți simultan",
    value: `${g.neighbors_affected_simultaneously} din ${g.neighbors_total}`,
    note: kind === "local" ? "rețeaua stradală e sănătoasă" : "pe același transformator",
  };
  const proofs: Record<CaseKind, Proof[]> = {
    grid: [
      {
        label: "Tensiune maximă la invertor",
        value: `${fmt(g.max_inverter_voltage_v, 1)} V`,
        note: `${limit} · la contor ${fmt(g.max_meter_voltage_v, 1)} V`,
      },
      neighbors,
      {
        label: "Timp oprire",
        value: `${g.trip_minutes} min/zi`,
        note: "invertor deconectat la prânz",
      },
    ],
    local: [
      { label: "Tensiune la contor", value: `${fmt(g.max_meter_voltage_v, 1)} V`, note: limit },
      {
        label: "Creștere pe cablul intern",
        value: `+${fmt(g.voltage_rise_internal_cable_v, 1)} V`,
        note: `${fmt(g.cable_mm2, 1)} mm² · ${fmt(g.cable_length_m)} m până la invertor`,
      },
      neighbors,
    ],
    battery: [
      {
        label: "Rezervă setată",
        value: `${fmt(b.configured_min_soc_pct)}%`,
        note: `clientul vrea ${fmt(b.desired_min_soc_pct)}%`,
      },
      {
        label: "Energie blocată",
        value: `${fmt(b.locked_kwh, 1)} kWh/zi`,
        note: "nu ajunge în vârful de seară",
      },
      {
        label: "PZU seară / prânz",
        value: `${fmt(b.pzu_evening_ron_mwh)} / ${fmt(b.pzu_midday_ron_mwh)}`,
        note: "RON/MWh",
      },
    ],
    billing: [
      { label: "Export contor (2.8.0)", value: `${fmt(f.meter_export_kwh)} kWh`, note: "măsurat" },
      { label: "Export pe factură", value: `${fmt(f.billed_export_kwh)} kWh`, note: "facturat" },
      {
        label: "Diferență factură",
        value: `${fmt(Math.abs(f.delta_ron), 2)} RON`,
        note: `facturat ${fmt(f.billed_ron, 2)} vs. corect ${fmt(f.verified_ron, 2)} RON`,
      },
    ],
    billing_ok: [
      { label: "Export contor (2.8.0)", value: `${fmt(f.meter_export_kwh)} kWh`, note: "măsurat" },
      {
        label: "Export pe factură",
        value: `${fmt(f.billed_export_kwh)} kWh`,
        note: "compensat 1:1",
      },
      {
        label: "Factură verificată",
        value: `${fmt(f.verified_ron, 2)} RON`,
        note: "egală cu suma facturată",
      },
    ],
    healthy: [
      { label: "Tensiune la contor", value: `${fmt(g.max_meter_voltage_v, 1)} V`, note: limit },
      { label: "Timp oprire", value: `${g.trip_minutes} min/zi`, note: "fără deconectări" },
      {
        label: "Diferență factură",
        value: `${fmt(Math.abs(f.delta_ron), 2)} RON`,
        note: "factură corectă",
      },
    ],
  };
  const loss: Record<CaseKind, number | null> = {
    grid: g.lost_ron_month,
    local: g.lost_ron_month,
    battery: b.monthly_pzu_loss_ron,
    billing: Math.abs(f.delta_ron),
    billing_ok: null,
    healthy: null,
  };
  const lossRon = loss[kind];
  return {
    kind,
    title: scenarioLabel[d.scenario.code] ?? d.scenario.scenario_badge_ro,
    lossRon: lossRon && lossRon > 0 ? lossRon : null,
    proof: proofs[kind],
  };
}

/** The exact cause, in plain Romanian for the homeowner. */
export function prosumerCause(d: HouseholdDetail): string {
  const { grid_verdict: g, battery_verdict: b, billing_verdict: f } = d.analysis;
  const limit = fmt(g.legal_limit_v);
  switch (caseKind(d)) {
    case "grid":
      return g.max_meter_voltage_v >= g.legal_limit_v
        ? `Tensiunea pe strada ta a depășit limita legală (${fmt(g.max_meter_voltage_v, 1)} V față de ${limit} V), oprind simultan invertorul tău și încă ${g.neighbors_affected_simultaneously} vecini. Panourile tale nu sunt stricate.`
        : `Tensiunea rețelei de pe strada ta urcă la prânz până la ${fmt(g.max_meter_voltage_v, 1)} V la contor, iar la invertor ajunge la ${fmt(g.max_inverter_voltage_v, 1)} V — peste limita legală de ${limit} V. În aceleași minute s-au oprit și încă ${g.neighbors_affected_simultaneously} vecini de pe același transformator. Panourile tale nu sunt stricate.`;
    case "local":
      return `${g.max_meter_voltage_v < g.legal_limit_v ? "Rețeaua stradală este în parametri normali" : "Rețeaua stradală este aproape de limită"} (${fmt(g.max_meter_voltage_v, 1)} V la contor), dar tensiunea crește cu +${fmt(g.voltage_rise_internal_cable_v, 1)} V pe cablul dintre contor și invertor (${fmt(g.cable_mm2, 1)} mm² pe ${fmt(g.cable_length_m)} m — subdimensionat sau prea lung).`;
    case "battery":
      return `Bateria ta păstrează ${fmt(b.configured_min_soc_pct)}% rezervă de avarie și nu se descarcă seara. Pierzi ${fmt(b.customer_grid_tax_loss_ron)} RON/lună.`;
    case "billing":
      return `Contorul a înregistrat ${fmt(f.meter_export_kwh)} kWh injectați, dar pe factură apar doar ${fmt(f.billed_export_kwh)} kWh (diferență ${fmt(Math.abs(f.delta_ron), 2)} RON).`;
    case "billing_ok":
      return `Factura ta este corectă: contorul a înregistrat ${fmt(f.meter_export_kwh)} kWh injectați și toți ${fmt(f.billed_export_kwh)} kWh apar pe factură, compensați 1:1 (Legea 160/2026).`;
    default:
      return `Instalația și rețeaua funcționează normal: tensiunea maximă la contor a fost ${fmt(g.max_meter_voltage_v, 1)} V (limita ${limit} V), iar factura este corectă.`;
  }
}

/** What happens next, phrased for the homeowner. */
export function prosumerSolution(d: HouseholdDetail): string {
  const a = d.analysis;
  switch (a.primary_responsible_party) {
    case "DISTRIBUTION_OPERATOR":
      return `Furnizorul trimite dosarul tehnic către ${a.distribution_operator}. Nu trebuie să schimbi nimic la panouri sau la invertor.`;
    case "INSTALLER":
      return "Cere instalatorului să verifice sau să înlocuiască cablul dintre contor și invertor. Rețeaua stradală nu este cauza.";
    case "CUSTOMER_SETTING":
      return `Schimbă rezerva bateriei din aplicația ${d.scenario.app_name} — pașii sunt mai jos.`;
    case "SUPPLIER_BILLING":
      return "Furnizorul corectează factura. Trimite tichetul de mai jos; măsurătorile contorului sunt atașate automat.";
    default:
      return "Nu trebuie să faci nimic.";
  }
}

export function inverterState(d: HouseholdDetail): { ok: boolean; label: string } {
  const t = d.analysis.grid_verdict.trip_minutes;
  return t > 0
    ? { ok: false, label: `Oprit la prânz — ${t} min pierdute` }
    : { ok: true, label: "Funcționare normală" };
}

/** Ticket topic pre-selected from the detected problem. */
export const TICKET_TOPICS = [
  "Invertorul se oprește la prânz",
  "Bateria nu se descarcă seara",
  "Factura nu corespunde",
  "Altă întrebare",
] as const;

export function defaultTopic(d: HouseholdDetail): (typeof TICKET_TOPICS)[number] {
  const k = caseKind(d);
  return k === "grid" || k === "local"
    ? TICKET_TOPICS[0]
    : k === "battery"
      ? TICKET_TOPICS[1]
      : k === "billing" || k === "billing_ok"
        ? TICKET_TOPICS[2]
        : TICKET_TOPICS[3];
}
