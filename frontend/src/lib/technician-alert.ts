import { fmt } from "./format";
import type { HouseholdDetail } from "./types";

/** Readable plain-text preview, also used by the simulated alert. */
export function technicianAlertText(d: HouseholdDetail): string {
  const a = d.analysis;
  const g = a.grid_verdict;
  const model = a.inverter_model.toLowerCase().startsWith(a.inverter_brand.toLowerCase())
    ? a.inverter_model
    : `${a.inverter_brand} ${a.inverter_model}`;
  const issues = a.one_line_triage_ro
    .split(/\. Valoare lunară recuperabilă:/)[0]!
    .split(";")
    .map((issue) => issue.trim())
    .filter(Boolean)
    .map((issue) => `• ${issue[0]!.toLocaleUpperCase("ro-RO")}${issue.slice(1)}`);
  const verdict = (g as typeof g & { headline_ro?: string }).headline_ro || g.verdict_text_ro;

  return [
    `SunProof · Alertă O&M\nInstalație: ${a.household_id}`,
    `Client și instalație\n${a.customer_name}\n${a.street_address}\nInvertor: ${model}\nPutere instalată: ${fmt(a.installed_pv_kw, 1)} kWp\nAlimentare: ${a.phase}`,
    `Probleme identificate\n${issues.join("\n")}`,
    ...(verdict ? [`Concluzie privind rețeaua\n${verdict}`] : []),
    `Măsurători de tensiune\n• La contor (PCC): ${fmt(g.max_meter_voltage_v, 1)} V\n• La invertor: ${fmt(g.max_inverter_voltage_v, 1)} V\n• Creștere pe cablul intern: ${g.voltage_rise_internal_cable_v > 0 ? "+" : ""}${fmt(g.voltage_rise_internal_cable_v, 1)} V\n• Prag de oprire al invertorului: ${fmt(g.inverter_threshold_v)} V\n• Limită legală: ${fmt(g.legal_limit_v)} V`,
    `Instalație și opriri simultane\nCablu intern: secțiune ${fmt(g.cable_mm2, 1)} mm², lungime ${fmt(g.cable_length_m)} m\nEchipamente oprite simultan: ${g.neighbors_affected_simultaneously} din ${g.neighbors_total}`,
    `Valoare lunară recuperabilă\n• Furnizor: ${fmt(a.total_supplier_monthly_benefit_ron, 2)} RON/lună\n• Client: ${fmt(a.total_customer_monthly_benefit_ron, 2)} RON/lună`,
  ].join("\n\n");
}
