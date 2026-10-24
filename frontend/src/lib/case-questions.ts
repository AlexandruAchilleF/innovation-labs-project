import { caseKind } from "./case-summary";
import { fmt } from "./format";
import type { HouseholdDetail, ResponsibleParty, Severity } from "./types";

/**
 * The three questions SunProof answers for every household, each with a one-line answer.
 * Every number comes from the engine verdicts; this file only words them.
 */
export type QuestionId = "grid" | "battery" | "billing";

export interface QuestionAnswer {
  id: QuestionId;
  /** short tab label */
  label: string;
  question: string;
  /** the conclusion in a few words */
  answer: string;
  /** compact value for small chips */
  short: string;
  s: Severity;
  party: ResponsibleParty;
}

export const QUESTION_IDS: QuestionId[] = ["grid", "battery", "billing"];

/** Which question the case is mainly about, so the detail panel opens on it. */
export function mainQuestion(d: HouseholdDetail): QuestionId {
  const k = caseKind(d);
  return k === "battery" ? "battery" : k === "billing" || k === "billing_ok" ? "billing" : "grid";
}

/** Grid vs local trip: the scenario decides; without one, many neighbours down at once means the grid. */
export function gridCause(d: HouseholdDetail): "grid" | "local" | "none" {
  const g = d.analysis.grid_verdict;
  const k = caseKind(d);
  if (k === "grid" || k === "local") return k;
  if (g.trip_minutes <= 0) return "none";
  return g.neighbors_total > 0 && g.neighbors_affected_simultaneously / g.neighbors_total >= 0.5
    ? "grid"
    : "local";
}

export function answers(d: HouseholdDetail): Record<QuestionId, QuestionAnswer> {
  const { grid_verdict: g, battery_verdict: b, billing_verdict: f } = d.analysis;
  const cause = gridCause(d);
  const locked = b.battery_kwh > 0 && b.configured_min_soc_pct !== b.desired_min_soc_pct;
  const billWrong = Math.abs(f.delta_ron) >= 0.01;
  return {
    grid: {
      id: "grid",
      label: "Oprire la prânz",
      question: "Invertorul s-a oprit la prânz: din cauza rețelei sau a instalației din casă?",
      answer:
        cause === "grid"
          ? "Cauza: rețeaua"
          : cause === "local"
            ? "Cauza: instalația din casă"
            : "Fără opriri",
      short: cause === "grid" ? "rețea" : cause === "local" ? "instalație" : "fără opriri",
      s: cause === "none" ? "OK" : g.status,
      party: cause === "grid" ? "DISTRIBUTION_OPERATOR" : cause === "local" ? "INSTALLER" : "NONE",
    },
    battery: {
      id: "battery",
      label: "Baterie seara",
      question: "Este bateria blocată și nu livrează energie în vârful scump de seară?",
      answer: !b.battery_kwh
        ? "Fără baterie"
        : locked
          ? `Rezervă ${b.configured_min_soc_pct}% în loc de ${b.desired_min_soc_pct}%`
          : "Setare corectă",
      short: !b.battery_kwh
        ? "fără baterie"
        : locked
          ? `${fmt(b.locked_kwh, 1)} kWh blocați`
          : "corectă",
      s: !b.battery_kwh ? "OK" : locked ? b.status : "OK",
      party: locked ? "CUSTOMER_SETTING" : "NONE",
    },
    billing: {
      id: "billing",
      label: "Factură",
      question: "Este corectă factura de prosumator?",
      answer: billWrong ? `Diferență ${fmt(Math.abs(f.delta_ron), 2)} RON` : "Factură corectă",
      short: billWrong ? `${fmt(Math.abs(f.delta_ron), 2)} RON` : "corectă",
      s: billWrong ? f.status : "OK",
      party: billWrong ? "SUPPLIER_BILLING" : "NONE",
    },
  };
}
