export type Severity = "CRITICAL" | "WARNING" | "OK" | "INFO";
export type ResponsibleParty = "DISTRIBUTION_OPERATOR" | "INSTALLER" | "CUSTOMER_SETTING" | "SUPPLIER_BILLING" | "NONE";
export type ScenarioCode =
  | "GRID_OVERVOLTAGE"
  | "LOCAL_OVERVOLTAGE_SENSITIVITY"
  | "MISCONFIGURED_MODE"
  | "MISSING_EXPORT_INDEX"
  | "INVOICE_VALID_EXPLAINED"
  | "HEALTHY";

export interface PortfolioSummaryMetrics {
  monitored_households_count: number;
  grid_fault_households_count: number;
  local_fault_households_count: number;
  misconfigured_Batteries_count: number;
  invoice_issues_count: number;
  fleet_avoided_truck_rolls_ron: number;
  fleet_monthly_pzu_savings_ron: number;
  fleet_total_supplier_monthly_value_ron: number;
  fleet_total_customer_monthly_value_ron: number;
  fleet_anre_complaints_prevented: number;
  extrapolated_prosumers_count: number;
  extrapolated_annual_supplier_savings_eur: number;
  extrapolated_evening_peak_shifted_mwh_year: number;
}

export interface HouseholdSummary {
  household_id: string;
  customer_name: string;
  city: string;
  overall_severity: Severity;
  scenario_code: ScenarioCode;
  scenario_badge_ro: string;
  monthly_impact_ron: number;
  is_flagship: boolean;
  neighborhood_id: string;
  installed_pv_kw?: number;
}

export interface Portfolio {
  metrics: PortfolioSummaryMetrics;
  households: HouseholdSummary[];
}

export interface GridVerdict {
  status: Severity;
  max_inverter_voltage_v: number;
  max_meter_voltage_v: number;
  voltage_rise_internal_cable_v: number;
  inverter_threshold_v: number;
  legal_limit_v: number;
  neighbors_affected_simultaneously: number;
  neighbors_total: number;
  trip_minutes: number;
  lost_ron_month: number;
  cable_mm2: number;
  cable_length_m: number;
  verdict_text_ro: string;
}

export interface BatteryVerdict {
  status: Severity;
  battery_brand: string;
  battery_kwh: number;
  desired_min_soc_pct: number;
  configured_min_soc_pct: number;
  mode_ro: string;
  locked_kwh: number;
  pzu_evening_ron_mwh: number;
  pzu_midday_ron_mwh: number;
  monthly_pzu_loss_ron: number;
  customer_grid_tax_loss_ron: number;
  verdict_text_ro: string;
}

export interface BillingVerdict {
  status: Severity;
  produced_kwh: number;
  self_consumed_kwh: number;
  battery_cycled_kwh: number;
  meter_export_kwh: number;
  billed_export_kwh: number;
  billed_ron: number;
  verified_ron: number;
  delta_ron: number;
  self_consumption_savings_ron: number;
  verdict_text_ro: string;
}

export interface HouseholdAnalysis {
  household_id: string;
  customer_name: string;
  city: string;
  street_address: string;
  pod_code: string;
  distribution_operator: string;
  transformer_id: string;
  inverter_brand: string;
  inverter_model: string;
  installed_pv_kw: number;
  phase: string;
  overall_severity: Severity;
  primary_responsible_party: ResponsibleParty;
  one_line_triage_ro: string;
  total_supplier_monthly_benefit_ron: number;
  total_customer_monthly_benefit_ron: number;
  grid_verdict: GridVerdict;
  battery_verdict: BatteryVerdict;
  billing_verdict: BillingVerdict;
  distributor_complaint_text: string;
  invoice_explanation_text: string;
  battery_guide_text: string;
  call_center_script_text: string;
}

export interface Scenario {
  code: ScenarioCode;
  scenario_badge_ro: string;
  customer_question_ro: string;
  customer_answer_ro: string;
  app_name: string;
  app_setting_path_ro: string;
  app_steps_ro: string[];
  coordinates: { lat: number; lon: number };
}

export interface MinutePoint {
  minute_of_day: number;
  time: string;
  ac_voltage_v: number;
  pv_power_kw: number;
  pvgis_expected_kw: number;
  house_load_kw: number;
  battery_power_kw: number;
  battery_soc_pct: number;
  grid_import_kw: number;
  grid_export_kw: number;
  status: "OK" | "DERATING" | "TRIP";
}

export interface NeighborSeries {
  neighbor_id: string;
  label: string;
  distance_from_transformer_m: number;
  phase: string;
  voltage_max_5min: number[];
  tripped_minutes: number;
}

export interface PzuPoint {
  hour: number;
  interval_label: string;
  pzu_price_ron_mwh: number;
  zone: "NIGHT" | "MORNING" | "MIDDAY" | "EVENING_PEAK";
}

export interface Timeseries {
  minutes: MinutePoint[];
  meter_voltage_15m: number[];
  neighbors: NeighborSeries[];
  pzu: PzuPoint[];
}

export interface HouseholdDetail {
  scenario: Scenario;
  analysis: HouseholdAnalysis;
  timeseries: Timeseries;
}

export interface BatteryKpis {
  min_soc_pct: number;
  evening_kwh_delivered_day: number;
  supplier_pzu_savings_month_ron: number;
  customer_grid_tax_savings_month_ron: number;
}

export interface WhatIfBatteryResult {
  before: BatteryKpis;
  after: BatteryKpis;
  delta: BatteryKpis;
  timeseries: { before: MinutePoint[]; after: MinutePoint[] };
}

export type GuardrailDocType = "invoice_explanation" | "distributor_complaint" | "battery_guide";

export interface GuardrailResult {
  input_text_ro: string;
  result: {
    text_ro: string;
    source: "LLM" | "DETERMINISTIC_TEMPLATE";
    guardrail_passed: boolean;
    numbers_extracted_from_text: number[];
    unverified_numbers_caught: number[];
  };
  caught: number[];
  fallback_applied: boolean;
}

export interface TelegramResult {
  sent: boolean;
  simulated: boolean;
  message_text: string;
  chat_id: string;
}

export interface FeederHouse {
  house_id: string;
  label: string;
  feeder: number;
  distance_m: number;
  phase: "L1" | "L2" | "L3" | "3P";
  pv_kw: number;
  voltage_v: number;
}

export interface Neighborhood {
  neighborhood_id: string;
  name: string;
  city: string;
  transformer_id: string;
  transformer_kva: number;
  tap_setting_pct: number;
  stress_cause_ro: string;
  base_rise_v: number;
  phase_imbalance: number;
  peak_voltage_v: number;
  houses_tripped: number;
  houses: FeederHouse[];
}

export interface GridWhatIfParams {
  tap_setting_pct?: number;
  transformer_kva?: number;
  rebalance_phases?: boolean;
  enable_volt_watt_all?: boolean;
  fix_all_batteries?: boolean;
}

export interface GridState {
  peak_voltage_v: number;
  houses_tripped: number;
  houses_derating: number;
  curtailed_kwh_day: number;
  houses: FeederHouse[];
}

export interface GridWhatIfResult {
  before: GridState;
  after: GridState;
}
