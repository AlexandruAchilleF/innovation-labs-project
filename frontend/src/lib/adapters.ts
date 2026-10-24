/* eslint-disable @typescript-eslint/no-explicit-any */
// Pure normalizers: FastAPI JSON (sunproof/app.py + api_support.py) -> interfaces in ./types.
// Every field uses `??`, so objects already in the mock/frontend shape pass through unchanged (idempotent).
import { mockHouseholdDetail } from "./mock/households";
import type {
  BatteryKpis,
  FeederHouse,
  GridState,
  GuardrailResult,
  HouseholdDetail,
  HouseholdSummary,
  MinutePoint,
  Neighborhood,
  Portfolio,
  PzuPoint,
  ResponsibleParty,
  ScenarioCode,
  Severity,
  WhatIfBatteryResult,
} from "./types";

type Raw = any;

const SEVERITIES = ["CRITICAL", "WARNING", "OK", "INFO"];
const FLAGSHIP_IDS = ["RO-TM-001", "RO-IF-002", "RO-CJ-003", "RO-BV-004", "RO-B-005"];
const r2 = (n: number) => Math.round(n * 100) / 100;
const sev = (status: unknown, fallback: unknown): Severity =>
  (SEVERITIES.includes(status as string)
    ? status
    : SEVERITIES.includes(fallback as string)
      ? fallback
      : "OK") as Severity;
const txt = (v: unknown): string =>
  typeof v === "string" ? v : ((v as Raw | null | undefined)?.text_ro ?? "");

// ---------- portfolio ----------
export function deriveScenarioCode(h: Raw): ScenarioCode {
  if (h.grid_cause === "GRID_OVERVOLTAGE") return "GRID_OVERVOLTAGE";
  if (
    ["LOCAL_OVERVOLTAGE_SENSITIVITY", "LOCAL_CABLE_IMPEDANCE", "LOCAL_EQUIPMENT_FAULT"].includes(
      h.grid_cause,
    )
  )
    return "LOCAL_OVERVOLTAGE_SENSITIVITY";
  if (
    ["MISSING_EXPORT_INDEX", "ESTIMATED_INDEX_OVERCHARGE", "METER_INVERTER_DISCREPANCY"].includes(
      h.billing_status,
    )
  )
    return "MISSING_EXPORT_INDEX";
  if (
    ["MISCONFIGURED_SOC_RESERVE", "MISCONFIGURED_MODE", "UNDERPERFORMING_CAPACITY"].includes(
      h.battery_status,
    )
  )
    return "MISCONFIGURED_MODE";
  if (h.billing_status === "INVOICE_VALID_EXPLAINED" && h.overall_severity !== "OK")
    return "INVOICE_VALID_EXPLAINED";
  return "HEALTHY";
}

export function normalizeHouseholdSummary(h: Raw): HouseholdSummary {
  return {
    ...h,
    scenario_code: h.scenario_code ?? deriveScenarioCode(h),
    monthly_impact_ron:
      h.monthly_impact_ron ??
      r2((h.total_supplier_monthly_benefit_ron ?? 0) + (h.total_customer_monthly_benefit_ron ?? 0)),
    is_flagship: h.is_flagship ?? FLAGSHIP_IDS.includes(h.household_id),
  } as HouseholdSummary;
}

export function normalizePortfolio(p: Raw): Portfolio {
  const m: Raw = p.metrics ?? {};
  return {
    ...p,
    metrics: {
      ...m,
      misconfigured_Batteries_count:
        m.misconfigured_Batteries_count ?? m.misconfigured_batteries_count ?? 0,
    },
    households: (p.households ?? []).map(normalizeHouseholdSummary),
  } as Portfolio;
}

// ---------- household detail ----------
const RESPONSIBLE: Record<string, ResponsibleParty> = {
  DISTRIBUTOR: "DISTRIBUTION_OPERATOR",
  INSTALLER_TECHNICIAN: "INSTALLER",
  CUSTOMER_SETTINGS: "CUSTOMER_SETTING",
};
const MINUTE_STATUS: Record<string, MinutePoint["status"]> = {
  NORMAL: "OK",
  STANDBY_NIGHT: "OK",
  OK: "OK",
  TRIPPED_OVERVOLTAGE: "TRIP",
  OFFLINE: "TRIP",
  TRIP: "TRIP",
  DERATING: "DERATING",
};
const PZU_ZONE: Record<string, PzuPoint["zone"]> = {
  OFF_PEAK: "NIGHT",
  MORNING_PEAK: "MORNING",
  SOLAR_DIP: "MIDDAY",
  EVENING_PEAK: "EVENING_PEAK",
  NIGHT: "NIGHT",
  MORNING: "MORNING",
  MIDDAY: "MIDDAY",
};

export function toMinutePoint(p: Raw): MinutePoint {
  return {
    minute_of_day: 0,
    time: "00:00",
    ac_voltage_v: 230,
    pv_power_kw: 0,
    pvgis_expected_kw: 0,
    house_load_kw: 0,
    battery_power_kw: 0,
    battery_soc_pct: 0,
    grid_import_kw: 0,
    grid_export_kw: 0,
    ...p,
    status: MINUTE_STATUS[p.status] ?? "OK",
  };
}

export function normalizeHouseholdDetail(d: Raw, id: string): HouseholdDetail {
  const s: Raw = d.scenario ?? {};
  const a: Raw = d.analysis ?? {};
  const ts: Raw = d.timeseries ?? {};
  const gv: Raw = a.grid_verdict ?? {};
  const bv: Raw = a.battery_verdict ?? {};
  const blv: Raw = a.billing_verdict ?? {};

  return {
    scenario: {
      ...s,
      code:
        s.code ??
        deriveScenarioCode({
          grid_cause: gv.cause,
          battery_status: bv.status,
          billing_status: blv.status,
          overall_severity: a.overall_severity,
        }),
      scenario_badge_ro: s.scenario_badge_ro ?? "",
      customer_question_ro: s.customer_question_ro ?? s.invoice?.customer_question_ro ?? "",
      customer_answer_ro: s.customer_answer_ro ?? blv.customer_explanation_ro ?? "",
      app_name: s.app_name ?? `${s.inverter_brand ?? ""}`,
      app_setting_path_ro: s.app_setting_path_ro ?? s.battery_config?.app_setting_path_ro ?? "",
      app_steps_ro: s.app_steps_ro ?? bv.step_by_step_fix_ro ?? [],
      coordinates: s.coordinates ?? mockHouseholdDetail(id).scenario.coordinates,
    },
    analysis: {
      ...a,
      street_address: a.street_address ?? s.street_address ?? "",
      pod_code: a.pod_code ?? s.pod_code ?? "",
      distribution_operator: a.distribution_operator ?? s.distribution_operator ?? "",
      inverter_model: a.inverter_model ?? s.inverter_model ?? "",
      primary_responsible_party:
        RESPONSIBLE[a.primary_responsible_party] ?? a.primary_responsible_party,
      phase: a.phase ?? s.connection_phase ?? "L1",
      grid_verdict: {
        ...gv,
        status: sev(gv.status, gv.severity),
        max_inverter_voltage_v: gv.max_inverter_voltage_v ?? 0,
        max_meter_voltage_v: gv.max_meter_voltage_v ?? 0,
        voltage_rise_internal_cable_v: gv.voltage_rise_internal_cable_v ?? 0,
        inverter_threshold_v: gv.inverter_threshold_v ?? gv.configured_trip_threshold_v,
        legal_limit_v: gv.legal_limit_v ?? gv.en50549_legal_limit_v ?? 253,
        neighbors_affected_simultaneously: gv.neighbors_affected_simultaneously ?? 0,
        neighbors_total: gv.neighbors_total ?? 0,
        trip_minutes: gv.trip_minutes ?? gv.total_trip_minutes_today ?? 0,
        lost_ron_month: gv.lost_ron_month ?? gv.lost_value_customer_month_ron ?? 0,
        cable_mm2: gv.cable_mm2 ?? s.internal_ac_cable_section_mm2 ?? 6,
        cable_length_m: gv.cable_length_m ?? s.internal_ac_cable_length_m ?? 12,
        verdict_text_ro: gv.verdict_text_ro ?? gv.explanation_ro ?? gv.headline_ro ?? "",
      },
      battery_verdict: {
        ...bv,
        status: sev(bv.status, bv.severity),
        battery_brand:
          bv.battery_brand ??
          bv.battery_model ??
          s.battery_config?.battery_brand_model ??
          "Fără baterie",
        battery_kwh: bv.battery_kwh ?? bv.usable_capacity_kwh ?? 0,
        desired_min_soc_pct: bv.desired_min_soc_pct ?? 0,
        configured_min_soc_pct: bv.configured_min_soc_pct ?? 0,
        mode_ro: bv.mode_ro ?? bv.configured_mode ?? "",
        locked_kwh: bv.locked_kwh ?? bv.locked_capacity_kwh ?? 0,
        pzu_evening_ron_mwh: bv.pzu_evening_ron_mwh ?? bv.avg_evening_pzu_ron_mwh ?? 0,
        pzu_midday_ron_mwh: bv.pzu_midday_ron_mwh ?? bv.avg_midday_pzu_ron_mwh ?? 0,
        monthly_pzu_loss_ron: bv.monthly_pzu_loss_ron ?? bv.supplier_monthly_pzu_loss_ron ?? 0,
        customer_grid_tax_loss_ron:
          bv.customer_grid_tax_loss_ron ?? bv.customer_monthly_grid_tax_loss_ron ?? 0,
        verdict_text_ro: bv.verdict_text_ro ?? bv.explanation_ro ?? bv.headline_ro ?? "",
      },
      billing_verdict: {
        ...blv,
        status: sev(blv.status, blv.severity),
        produced_kwh: blv.produced_kwh ?? blv.inverter_production_kwh ?? 0,
        self_consumed_kwh: blv.self_consumed_kwh ?? blv.direct_self_consumption_kwh ?? 0,
        battery_cycled_kwh: blv.battery_cycled_kwh ?? blv.battery_net_buffered_kwh ?? 0,
        meter_export_kwh: blv.meter_export_kwh ?? 0,
        billed_export_kwh: blv.billed_export_kwh ?? 0,
        billed_ron: blv.billed_ron ?? blv.billed_payable_ron ?? 0,
        verified_ron: blv.verified_ron ?? blv.correct_payable_ron ?? 0,
        delta_ron: blv.delta_ron ?? blv.financial_discrepancy_ron ?? 0,
        self_consumption_savings_ron: blv.self_consumption_savings_ron ?? 0,
        verdict_text_ro:
          blv.verdict_text_ro ?? blv.customer_explanation_ro ?? blv.headline_ro ?? "",
      },
      distributor_complaint_text: txt(a.distributor_complaint_text),
      invoice_explanation_text: txt(a.invoice_explanation_text),
      battery_guide_text: txt(a.battery_guide_text),
      call_center_script_text: txt(a.call_center_script_text ?? blv.call_center_script_ro),
    },
    timeseries: {
      ...ts,
      minutes: (ts.minutes ?? []).map(toMinutePoint),
      meter_voltage_15m: ts.meter_voltage_15m ?? [],
      neighbors: ts.neighbors ?? [],
      pzu: (ts.pzu ?? []).map((p: Raw) => ({ ...p, zone: PZU_ZONE[p.zone] ?? "NIGHT" })),
    },
  } as HouseholdDetail;
}

// ---------- battery what-if ----------
export function normalizeWhatIfBattery(res: Raw): WhatIfBatteryResult {
  const timeseries = {
    before: (res.timeseries?.before ?? []).map(toMinutePoint),
    after: (res.timeseries?.after ?? []).map(toMinutePoint),
  };
  const bb: Raw | undefined = res.before?.battery_verdict;
  const ab: Raw | undefined = res.after?.battery_verdict;
  if (!bb || !ab) return { ...res, timeseries } as WhatIfBatteryResult;

  const kpis = (bv: Raw, supSaved: number, custSaved: number): BatteryKpis => ({
    min_soc_pct: bv.configured_min_soc_pct ?? 0,
    evening_kwh_delivered_day: bv.evening_battery_discharge_kwh_today ?? 0,
    supplier_pzu_savings_month_ron: supSaved,
    customer_grid_tax_savings_month_ron: custSaved,
  });
  const saved = (key: string) => r2(Math.max(0, (bb[key] ?? 0) - (ab[key] ?? 0)));
  const before = kpis(bb, 0, 0);
  const after = kpis(
    ab,
    saved("supplier_monthly_pzu_loss_ron"),
    saved("customer_monthly_grid_tax_loss_ron"),
  );
  return {
    before,
    after,
    delta: {
      min_soc_pct: r2(after.min_soc_pct - before.min_soc_pct),
      evening_kwh_delivered_day: r2(
        after.evening_kwh_delivered_day - before.evening_kwh_delivered_day,
      ),
      supplier_pzu_savings_month_ron: r2(
        after.supplier_pzu_savings_month_ron - before.supplier_pzu_savings_month_ron,
      ),
      customer_grid_tax_savings_month_ron: r2(
        after.customer_grid_tax_savings_month_ron - before.customer_grid_tax_savings_month_ron,
      ),
    },
    timeseries,
  };
}

// ---------- neighborhoods ----------
export function mapFeederHouses(houses: Raw[] | undefined): FeederHouse[] {
  return (houses ?? []).map((h) => {
    const id = h.household_id || h.house_id;
    return {
      ...h,
      house_id: id,
      label: h.label ?? id,
      feeder:
        typeof h.feeder === "number"
          ? h.feeder
          : parseInt(/(\d+)\D*$/.exec(String(h.feeder_id ?? ""))?.[1] ?? "1", 10) || 1, // "PT04-F2" -> 2
      distance_m: h.distance_m ?? 0,
      phase: h.phase === "THREE_PHASE" ? "3P" : (h.phase ?? "L1"),
      pv_kw: h.pv_kw ?? h.installed_pv_kw ?? 0,
      voltage_v: h.voltage_v ?? h.max_pcc_voltage_v ?? 230,
    } as FeederHouse;
  });
}

export function normalizeNeighborhood(n: Raw): Neighborhood {
  return {
    ...n,
    name: n.name ?? n.name_ro,
    transformer_kva: n.transformer_kva ?? n.rated_kva,
    stress_cause_ro: n.stress_cause_ro ?? n.headline_ro,
    peak_voltage_v: n.peak_voltage_v ?? n.max_voltage_v,
    base_rise_v: n.base_rise_v ?? Math.max(0, (n.max_voltage_v ?? 230) - 230),
    phase_imbalance: n.phase_imbalance ?? 0.15,
    houses_tripped: n.houses_tripped ?? 0,
    houses: mapFeederHouses(n.houses),
  } as Neighborhood;
}

export function normalizeGridState(s: Raw): GridState {
  return {
    ...s,
    peak_voltage_v: s.peak_voltage_v ?? s.max_voltage_v,
    houses_tripped: s.houses_tripped ?? 0,
    houses_derating:
      s.houses_derating ??
      (s.houses ?? []).filter((h: Raw) => (h.derating_minutes ?? 0) > 0).length,
    curtailed_kwh_day: s.curtailed_kwh_day ?? s.lost_energy_kwh ?? 0,
    houses: mapFeederHouses(s.houses),
  } as GridState;
}

// ---------- guardrail ----------
export function normalizeGuardrail(g: Raw): GuardrailResult {
  const r: Raw = g.result ?? {};
  return {
    ...g,
    result: {
      ...r,
      source: String(r.source).toLowerCase() === "llm" ? "LLM" : "DETERMINISTIC_TEMPLATE",
      numbers_extracted_from_text: r.numbers_extracted_from_text ?? [],
      unverified_numbers_caught: r.unverified_numbers_caught ?? [],
    },
    caught: g.caught ?? r.unverified_numbers_caught ?? [],
    fallback_applied: g.fallback_applied ?? false,
  } as GuardrailResult;
}
