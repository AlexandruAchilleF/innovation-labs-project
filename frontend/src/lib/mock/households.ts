import { fmt } from "../format";
import { scenarioLabel } from "../i18n";
import {
  GRID_TARIFF_RON_KWH,
  LEGAL_LIMIT_V,
  PZU_EVENING,
  PZU_MIDDAY,
  billingDelta,
  pzuCurve,
  simulateDay,
} from "../sim";
import type {
  HouseholdAnalysis,
  HouseholdDetail,
  HouseholdSummary,
  PortfolioSummaryMetrics,
  ResponsibleParty,
  Scenario,
  ScenarioCode,
  Severity,
  Timeseries,
} from "../types";

export interface HouseholdSpec {
  id: string;
  name: string;
  city: string;
  neighborhood_id: string;
  street: string;
  operator: string;
  transformer_id: string;
  inverter_brand: "Huawei" | "Fronius" | "Deye";
  inverter_model: string;
  pv_kw: number;
  phase: string;
  battery_brand: string;
  battery_kwh: number;
  desired_soc: number;
  configured_soc: number;
  mode_ro: string;
  code: ScenarioCode;
  severity: Severity;
  responsible: ResponsibleParty;
  meter_peak_v: number;
  cable_rise_v: number;
  cable_mm2: number;
  cable_m: number;
  inverter_threshold_v: number;
  neighbors_tripped: number;
  produced_kwh: number;
  self_consumed_kwh: number;
  meter_export_kwh: number;
  billed_export_kwh: number;
  billed_ron: number;
  verified_ron: number;
  question: string;
  flagship: boolean;
  lat: number;
  lon: number;
}

export const portfolioMetrics: PortfolioSummaryMetrics = {
  monitored_households_count: 81,
  grid_fault_households_count: 15,
  local_fault_households_count: 6,
  misconfigured_Batteries_count: 7,
  invoice_issues_count: 5,
  fleet_avoided_truck_rolls_ron: 6750,
  fleet_monthly_pzu_savings_ron: 1054.2,
  fleet_total_supplier_monthly_value_ron: 7804.2,
  fleet_total_customer_monthly_value_ron: 15737.4,
  fleet_anre_complaints_prevented: 20,
  extrapolated_prosumers_count: 25000,
  extrapolated_annual_supplier_savings_eur: 5667168,
  extrapolated_evening_peak_shifted_mwh_year: 14250,
};

const base = {
  battery_brand: "",
  battery_kwh: 0,
  desired_soc: 20,
  configured_soc: 20,
  mode_ro: "Autoconsum maxim",
  cable_mm2: 6,
  cable_m: 15,
  inverter_threshold_v: 253,
  neighbors_tripped: 0,
  flagship: false,
};

const flagships: HouseholdSpec[] = [
  {
    ...base,
    id: "RO-TM-001",
    name: "Andrei Popescu",
    city: "Dumbrăvița",
    neighborhood_id: "NB-DUMBRAVITA",
    street: "Str. Petőfi Sándor 14, Dumbrăvița, Timiș",
    operator: "Rețele Electrice Banat",
    transformer_id: "PT-TM-0417",
    inverter_brand: "Huawei",
    inverter_model: "SUN2000-10KTL-M1",
    pv_kw: 10,
    phase: "3P",
    battery_brand: "Huawei LUNA2000",
    battery_kwh: 10,
    configured_soc: 80,
    mode_ro: "Rezervă backup (80%)",
    code: "GRID_OVERVOLTAGE",
    severity: "CRITICAL",
    responsible: "DISTRIBUTION_OPERATOR",
    meter_peak_v: 256.3,
    cable_rise_v: 2.1,
    neighbors_tripped: 3,
    produced_kwh: 1080,
    self_consumed_kwh: 420,
    meter_export_kwh: 610,
    billed_export_kwh: 610,
    billed_ron: 254.6,
    verified_ron: 254.6,
    question: "De ce mi se oprește invertorul în fiecare zi la prânz și de ce mai plătesc 185 RON seara dacă am baterie de 10 kWh?",
    flagship: true,
    lat: 45.7962,
    lon: 21.2421,
  },
  {
    ...base,
    id: "RO-IF-002",
    name: "Elena Ionescu",
    city: "Corbeanca",
    neighborhood_id: "NB-CORBEANCA",
    street: "Str. Libertății 7, Corbeanca, Ilfov",
    operator: "Distribuție Energie Electrică Muntenia",
    transformer_id: "PT-IF-1182",
    inverter_brand: "Fronius",
    inverter_model: "Symo GEN24 8.0 Plus",
    pv_kw: 8,
    phase: "L2",
    code: "LOCAL_OVERVOLTAGE_SENSITIVITY",
    severity: "CRITICAL",
    responsible: "INSTALLER",
    meter_peak_v: 236.4,
    cable_rise_v: 9.2,
    cable_mm2: 2.5,
    cable_m: 38,
    inverter_threshold_v: 245,
    produced_kwh: 690,
    self_consumed_kwh: 360,
    meter_export_kwh: 330,
    billed_export_kwh: 330,
    billed_ron: 241.3,
    verified_ron: 241.3,
    question: "Vecinii mei produc normal, de ce invertorul meu dă eroare de supratensiune?",
    flagship: true,
    lat: 44.6036,
    lon: 26.0503,
  },
  {
    ...base,
    id: "RO-CJ-003",
    name: "Mihai Radu",
    city: "Cluj-Napoca",
    neighborhood_id: "NB-CLUJ",
    street: "Str. Fabricii 22, Cluj-Napoca, Cluj",
    operator: "Distribuție Energie Electrică Transilvania Nord",
    transformer_id: "PT-CJ-0733",
    inverter_brand: "Deye",
    inverter_model: "SUN-10K-SG04LP3",
    pv_kw: 9,
    phase: "3P",
    battery_brand: "BYD Battery-Box HVS",
    battery_kwh: 15,
    configured_soc: 85,
    mode_ro: "Rezervă backup (85%)",
    code: "MISCONFIGURED_MODE",
    severity: "WARNING",
    responsible: "CUSTOMER_SETTING",
    meter_peak_v: 239.1,
    cable_rise_v: 1.8,
    produced_kwh: 940,
    self_consumed_kwh: 430,
    meter_export_kwh: 510,
    billed_export_kwh: 510,
    billed_ron: 389.4,
    verified_ron: 389.4,
    question: "Am o baterie de 15 kWh, de ce plătesc tot atât de mult curent seara?",
    flagship: true,
    lat: 46.7712,
    lon: 23.6236,
  },
  {
    ...base,
    id: "RO-BV-004",
    name: "Dan Munteanu",
    city: "Brașov",
    neighborhood_id: "NB-BRASOV",
    street: "Str. Lungă 118, Brașov, Brașov",
    operator: "Distribuție Energie Electrică Transilvania Sud",
    transformer_id: "PT-BV-0219",
    inverter_brand: "Huawei",
    inverter_model: "SUN2000-12KTL-M2",
    pv_kw: 12,
    phase: "3P",
    code: "MISSING_EXPORT_INDEX",
    severity: "CRITICAL",
    responsible: "SUPPLIER_BILLING",
    meter_peak_v: 240.2,
    cable_rise_v: 1.6,
    produced_kwh: 1320,
    self_consumed_kwh: 680,
    meter_export_kwh: 640,
    billed_export_kwh: 0,
    billed_ron: 598,
    verified_ron: 285.2,
    question: "Am produs 1.320 kWh luna asta, de ce factura mea e 598 RON?",
    flagship: true,
    lat: 45.6427,
    lon: 25.5887,
  },
  {
    ...base,
    id: "RO-B-005",
    name: "Cristina Dumitrescu",
    city: "București",
    neighborhood_id: "NB-BUCURESTI",
    street: "Str. Zizinului 41, Sector 6, București",
    operator: "Rețele Electrice Muntenia",
    transformer_id: "PT-B-2047",
    inverter_brand: "Huawei",
    inverter_model: "SUN2000-6KTL-L1",
    pv_kw: 6,
    phase: "L1",
    code: "INVOICE_VALID_EXPLAINED",
    severity: "INFO",
    responsible: "NONE",
    meter_peak_v: 241.5,
    cable_rise_v: 1.4,
    produced_kwh: 780,
    self_consumed_kwh: 470,
    meter_export_kwh: 310,
    billed_export_kwh: 310,
    billed_ron: 210.8,
    verified_ron: 210.8,
    question: "Am produs 780 kWh dar contorul arată doar 310 kWh injectați. Unde e restul energiei?",
    flagship: true,
    lat: 44.4268,
    lon: 26.1025,
  },
];

// ---------- Deterministic fleet generator ----------
function prng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const FIRST = ["Ioana", "Vlad", "Ana", "Bogdan", "Maria", "Cristian", "Raluca", "Sorin", "Gabriela", "Alexandru", "Diana", "Florin", "Oana", "Radu", "Simona", "Lucian", "Irina", "Marius", "Adina", "Ștefan"];
const LAST = ["Stan", "Matei", "Georgescu", "Constantin", "Marin", "Tudor", "Barbu", "Neagu", "Lazăr", "Dobre", "Ene", "Preda", "Nistor", "Moldovan", "Pop", "Rusu", "Florea", "Toma", "Sârbu", "Cozma"];
export const NB_META: Record<string, { city: string; code: string; operator: string; pt: string; lat: number; lon: number }> = {
  "NB-DUMBRAVITA": { city: "Dumbrăvița", code: "TM", operator: "Rețele Electrice Banat", pt: "PT-TM-0417", lat: 45.796, lon: 21.242 },
  "NB-GIROC": { city: "Giroc", code: "TM", operator: "Rețele Electrice Banat", pt: "PT-TM-0588", lat: 45.694, lon: 21.235 },
  "NB-FLORESTI": { city: "Florești", code: "CJ", operator: "Distribuție Energie Electrică Transilvania Nord", pt: "PT-CJ-0912", lat: 46.744, lon: 23.49 },
  "NB-BRAGADIRU": { city: "Bragadiru", code: "IF", operator: "Rețele Electrice Muntenia", pt: "PT-IF-0644", lat: 44.371, lon: 25.975 },
  "NB-CORBEANCA": { city: "Corbeanca", code: "IF", operator: "Distribuție Energie Electrică Muntenia", pt: "PT-IF-1182", lat: 44.603, lon: 26.05 },
  "NB-CLUJ": { city: "Cluj-Napoca", code: "CJ", operator: "Distribuție Energie Electrică Transilvania Nord", pt: "PT-CJ-0733", lat: 46.771, lon: 23.624 },
  "NB-BRASOV": { city: "Brașov", code: "BV", operator: "Distribuție Energie Electrică Transilvania Sud", pt: "PT-BV-0219", lat: 45.643, lon: 25.589 },
  "NB-BUCURESTI": { city: "București", code: "B", operator: "Rețele Electrice Muntenia", pt: "PT-B-2047", lat: 44.427, lon: 26.103 },
};
const NB_IDS = Object.keys(NB_META);

function generateFleet(): HouseholdSpec[] {
  const rnd = prng(160);
  // remaining counts after flagships: grid 14, local 5, battery 6, invoice 4, valid-explained 6, healthy 41
  const plan: ScenarioCode[] = [
    ...Array(14).fill("GRID_OVERVOLTAGE"),
    ...Array(5).fill("LOCAL_OVERVOLTAGE_SENSITIVITY"),
    ...Array(6).fill("MISCONFIGURED_MODE"),
    ...Array(4).fill("MISSING_EXPORT_INDEX"),
    ...Array(6).fill("INVOICE_VALID_EXPLAINED"),
    ...Array(41).fill("HEALTHY"),
  ];
  const brands = [
    { b: "Huawei" as const, m: "SUN2000-8KTL-M1" },
    { b: "Fronius" as const, m: "Symo GEN24 6.0 Plus" },
    { b: "Deye" as const, m: "SUN-8K-SG04LP3" },
  ];
  return plan.map((code, i) => {
    const nb = code === "GRID_OVERVOLTAGE" ? NB_IDS[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 3]! : NB_IDS[Math.floor(rnd() * NB_IDS.length)]!;
    const meta0 = NB_META[nb]!;
    const meta = meta0;
    const pv = Math.round((5 + rnd() * 7) * 2) / 2;
    const br = brands[i % 3]!;
    const produced = Math.round(pv * (98 + rnd() * 20));
    const self = Math.round(produced * (0.45 + rnd() * 0.15));
    const exp = produced - self;
    const verified = Math.round((150 + rnd() * 250) * 10) / 10;
    const hasBatt = code === "MISCONFIGURED_MODE" || rnd() > 0.55;
    const battKwh = hasBatt ? [5, 7, 10, 15][Math.floor(rnd() * 4)]! : 0;
    const severity: Severity =
      code === "GRID_OVERVOLTAGE" || code === "LOCAL_OVERVOLTAGE_SENSITIVITY" || code === "MISSING_EXPORT_INDEX"
        ? "CRITICAL"
        : code === "MISCONFIGURED_MODE"
          ? "WARNING"
          : code === "INVOICE_VALID_EXPLAINED"
            ? "INFO"
            : "OK";
    const responsible: ResponsibleParty =
      code === "GRID_OVERVOLTAGE"
        ? "DISTRIBUTION_OPERATOR"
        : code === "LOCAL_OVERVOLTAGE_SENSITIVITY"
          ? "INSTALLER"
          : code === "MISCONFIGURED_MODE"
            ? "CUSTOMER_SETTING"
            : code === "MISSING_EXPORT_INDEX"
              ? "SUPPLIER_BILLING"
              : "NONE";
    const billedRon = code === "MISSING_EXPORT_INDEX" ? Math.round((verified + exp * 0.48) * 10) / 10 : verified;
    return {
      ...base,
      id: `RO-${meta.code}-${String(i + 6).padStart(3, "0")}`,
      name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
      city: meta.city,
      neighborhood_id: nb,
      street: `Str. ${["Morii", "Teilor", "Viilor", "Florilor", "Câmpului", "Salcâmilor"][i % 6]} ${3 + ((i * 5) % 90)}, ${meta.city}`,
      operator: meta.operator,
      transformer_id: meta.pt,
      inverter_brand: br.b,
      inverter_model: br.m,
      pv_kw: pv,
      phase: ["L1", "L2", "L3", "3P"][i % 4]!,
      battery_brand: hasBatt ? ["Huawei LUNA2000", "BYD Battery-Box HVS", "Pylontech Force H2"][i % 3]! : "",
      battery_kwh: battKwh,
      configured_soc: code === "MISCONFIGURED_MODE" ? 75 + Math.floor(rnd() * 15) : 20,
      mode_ro: code === "MISCONFIGURED_MODE" ? "Rezervă backup" : "Autoconsum maxim",
      code,
      severity,
      responsible,
      meter_peak_v: code === "GRID_OVERVOLTAGE" ? 254 + rnd() * 3 : 234 + rnd() * 8,
      cable_rise_v: code === "LOCAL_OVERVOLTAGE_SENSITIVITY" ? 7 + rnd() * 3 : 1 + rnd() * 1.5,
      cable_mm2: code === "LOCAL_OVERVOLTAGE_SENSITIVITY" ? 2.5 : 6,
      cable_m: code === "LOCAL_OVERVOLTAGE_SENSITIVITY" ? 30 + Math.floor(rnd() * 15) : 10 + Math.floor(rnd() * 12),
      inverter_threshold_v: code === "LOCAL_OVERVOLTAGE_SENSITIVITY" ? 245 : 253,
      neighbors_tripped: code === "GRID_OVERVOLTAGE" ? 2 + Math.floor(rnd() * 3) : 0,
      produced_kwh: produced,
      self_consumed_kwh: self,
      meter_export_kwh: exp,
      billed_export_kwh: code === "MISSING_EXPORT_INDEX" ? 0 : exp,
      billed_ron: billedRon,
      verified_ron: verified,
      question:
        code === "HEALTHY"
          ? "Funcționează totul corect la instalația mea?"
          : flagships.find((f) => f.code === code)?.question ?? "",
      lat: meta.lat + (rnd() - 0.5) * 0.01,
      lon: meta.lon + (rnd() - 0.5) * 0.01,
    };
  });
}

export const householdSpecs: HouseholdSpec[] = [...flagships, ...generateFleet()];

// ---------- Builders ----------
const APP: Record<HouseholdSpec["inverter_brand"], { name: string; path: string; steps: string[] }> = {
  Huawei: {
    name: "Huawei FusionSolar",
    path: "FusionSolar › Dispozitive › Invertor › Setări › Control baterie › Mod de lucru",
    steps: [
      "Deschideți aplicația FusionSolar și autentificați-vă cu contul instalatorului sau al proprietarului.",
      "Atingeți „Dispozitive”, apoi selectați invertorul dvs.",
      "Intrați în „Setări” › „Control baterie”.",
      "La „Mod de lucru” alegeți „Autoconsum maxim” (nu „Rezervă backup”).",
      "Setați „SoC minim descărcare” la 20% și salvați.",
      "Activați opțiunea „Bonus stocare furnizor” din secțiunea Contract, dacă apare.",
    ],
  },
  Fronius: {
    name: "Fronius Solar.web",
    path: "Solar.web › Sistem › Setări › Management baterie › Limite SoC",
    steps: [
      "Deschideți aplicația Fronius Solar.web.",
      "Selectați sistemul dvs. și mergeți la „Setări”.",
      "Deschideți „Management baterie” › „Limite SoC”.",
      "Setați limita minimă la 20% și dezactivați „Rezervă permanentă”.",
      "Confirmați cu „Salvează”; modificarea se aplică în ~5 minute.",
    ],
  },
  Deye: {
    name: "Deye Cloud",
    path: "Deye Cloud › Stație › Dispozitiv › Setări sistem › Mod lucru baterie",
    steps: [
      "Deschideți aplicația Deye Cloud.",
      "Alegeți stația, apoi dispozitivul (invertorul).",
      "Mergeți la „Setări sistem” › „Mod lucru baterie”.",
      "Schimbați din „Backup / UPS” în „Self-use / Autoconsum”.",
      "La „Battery SoC minim” introduceți 20% și programați descărcarea 18:00–23:00.",
      "Apăsați „Trimite” și verificați după 10 minute că bateria se descarcă seara.",
    ],
  },
};

function triageLine(s: HouseholdSpec, lockedKwh: number): string {
  switch (s.code) {
    case "GRID_OVERVOLTAGE":
      return `Supratensiune în rețeaua OD: contorul (PCC) atinge ${fmt(s.meter_peak_v, 1)} V peste limita de ${LEGAL_LIMIT_V} V, iar ${s.neighbors_tripped} din 4 vecini declanșează simultan — NU trimiteți tehnician, depuneți sesizare la distribuitor.`;
    case "LOCAL_OVERVOLTAGE_SENSITIVITY":
      return `Problemă în instalația locală: tensiunea străzii e sănătoasă (${fmt(s.meter_peak_v, 1)} V), dar cablul AC de ${fmt(s.cable_mm2, 1)} mm² / ${s.cable_m} m adaugă +${fmt(s.cable_rise_v, 1)} V și pragul invertorului e setat greșit la ${s.inverter_threshold_v} V.`;
    case "MISCONFIGURED_MODE":
      return `Bateria ${s.battery_brand} de ${fmt(s.battery_kwh)} kWh e blocată în Rezervă backup la ${s.configured_soc}% SoC — ${fmt(lockedKwh, 1)} kWh nu se descarcă în vârful de seară PZU (${fmt(PZU_EVENING)} vs ${fmt(PZU_MIDDAY)} RON/MWh).`;
    case "MISSING_EXPORT_INDEX":
      return `Indexul de export 2.8.0 lipsește de pe factură: contorul confirmă ${fmt(s.meter_export_kwh)} kWh injectați, dar s-au facturat 0 kWh — facturat ${fmt(s.billed_ron, 2)} RON vs ${fmt(s.verified_ron, 2)} RON corect.`;
    case "INVOICE_VALID_EXPLAINED":
      return `Factura este corectă: din ${fmt(s.produced_kwh)} kWh produși, ${fmt(s.self_consumed_kwh)} kWh au fost consumați direct în casă înainte de contor; cei ${fmt(s.verified_ron, 2)} RON sunt doar tarife de rețea necompensabile.`;
    default:
      return `Instalație funcțională: tensiunea maximă ${fmt(s.meter_peak_v, 1)} V, fără declanșări, factură reconciliată.`;
  }
}

export function buildDetail(s: HouseholdSpec): HouseholdDetail {
  const minutes = simulateDay({
    pv_kw: s.pv_kw,
    battery_kwh: s.battery_kwh,
    min_soc_pct: s.configured_soc,
    meter_peak_v: s.meter_peak_v,
    cable_rise_v: s.cable_rise_v,
    inverter_threshold_v: s.inverter_threshold_v,
  });
  const tripMinutes = minutes.filter((m) => m.status === "TRIP").length * 5;
  const maxInv = Math.max(...minutes.map((m) => m.ac_voltage_v));
  const meter15: number[] = [];
  for (let q = 0; q < 96; q++) {
    const h = q / 4;
    const shape = h < 6.5 || h > 19.5 ? 0 : Math.pow(Math.sin(((h - 6.5) / 13) * Math.PI), 1.4);
    meter15.push(Math.round((229 + (s.meter_peak_v - 229) * Math.pow(shape, 1.2)) * 10) / 10);
  }
  const neighbors = [0, 1, 2, 3].map((i) => {
    const tripped = i < s.neighbors_tripped;
    const offset = s.code === "GRID_OVERVOLTAGE" ? (tripped ? 0.5 + i * 0.4 : -3.5 - i) : -1.5 - i * 0.8;
    const series = Array.from({ length: 288 }, (_, k) => {
      const h = k / 12;
      const shape = h < 6.5 || h > 19.5 ? 0 : Math.pow(Math.sin(((h - 6.5) / 13) * Math.PI), 1.4);
      return Math.round((229 + (s.meter_peak_v + offset - 229) * Math.pow(shape, 1.2)) * 10) / 10;
    });
    return {
      neighbor_id: `${s.id}-N${i + 1}`,
      label: `Vecin ${i + 1}`,
      distance_from_transformer_m: 120 + i * 45,
      phase: ["L1", "L2", "L3", "3P"][i]!,
      voltage_max_5min: series,
      tripped_minutes: series.filter((v) => v >= LEGAL_LIMIT_V).length * 5,
    };
  });
  const timeseries: Timeseries = { minutes, meter_voltage_15m: meter15, neighbors, pzu: pzuCurve() };

  const lockedKwh = s.battery_kwh > 0 ? (Math.max(0, s.configured_soc - s.desired_soc) / 100) * s.battery_kwh : 0;
  const pzuLoss = Math.round(((lockedKwh * 30 * (PZU_EVENING - PZU_MIDDAY)) / 1000) * 10) / 10;
  const taxLoss = Math.round(lockedKwh * 30 * GRID_TARIFF_RON_KWH * 10) / 10;
  const tripLost = Math.round(((tripMinutes / 60) * s.pv_kw * 0.75 * 30 * 0.45) * 10) / 10;
  const delta = billingDelta(s.billed_ron, s.verified_ron);
  const selfSavings = Math.round(s.self_consumed_kwh * 1.3);

  const gridStatus: Severity =
    s.code === "GRID_OVERVOLTAGE" || s.code === "LOCAL_OVERVOLTAGE_SENSITIVITY" ? "CRITICAL" : maxInv >= 248 ? "WARNING" : "OK";
  const battStatus: Severity = s.battery_kwh === 0 ? "INFO" : lockedKwh > 0 ? (lockedKwh >= 6 ? "CRITICAL" : "WARNING") : "OK";
  const billStatus: Severity = delta > 0 ? "CRITICAL" : s.code === "INVOICE_VALID_EXPLAINED" ? "INFO" : "OK";

  const truckRoll = s.code === "GRID_OVERVOLTAGE" ? 450 : 0;
  const supplierBenefit = Math.round((truckRoll + pzuLoss + (delta > 0 ? 150 : 0)) * 10) / 10;
  const customerBenefit = Math.round((delta + taxLoss + tripLost) * 10) / 10;

  const app = APP[s.inverter_brand];
  const dateRo = "septembrie 2026";

  const invoiceText =
    s.code === "MISSING_EXPORT_INDEX"
      ? `Stimate client, pentru ${dateRo} instalația dvs. a produs ${fmt(s.produced_kwh)} kWh. Contorul inteligent (registrul 2.8.0) confirmă ${fmt(s.meter_export_kwh)} kWh injectați în rețea, însă factura emisă a preluat 0 kWh export. Valoarea corectă de plată este ${fmt(s.verified_ron, 2)} RON în loc de ${fmt(s.billed_ron, 2)} RON. Vom emite o factură de stornare cu diferența de ${fmt(delta, 2)} RON.`
      : `Stimate client, pentru ${dateRo} instalația dvs. a produs ${fmt(s.produced_kwh)} kWh. Din aceștia, ${fmt(s.self_consumed_kwh)} kWh au fost consumați direct în casă, fără să treacă prin contor, economisind aproximativ ${fmt(selfSavings)} RON. Contorul (registrul 2.8.0) a înregistrat ${fmt(s.meter_export_kwh)} kWh injectați, compensați integral. Suma de ${fmt(s.verified_ron, 2)} RON reprezintă tarifele reglementate de rețea (${fmt(GRID_TARIFF_RON_KWH, 2)} RON/kWh) pentru energia consumată seara din rețea, care nu pot fi compensate conform Legii 160/2026.`;

  const complaintText =
    s.code === "GRID_OVERVOLTAGE"
      ? `Către ${s.operator}: Solicităm verificarea postului de transformare ${s.transformer_id}. La locul de consum ${s.street} (POD RO005E${s.id.replace(/\D/g, "")}0000), tensiunea măsurată de contorul inteligent în punctul de racordare a atins ${fmt(s.meter_peak_v, 1)} V, peste limita de ${LEGAL_LIMIT_V} V din SR EN 50160 / EN 50549-1. ${s.neighbors_tripped} din 4 prosumatori vecini au înregistrat deconectări simultane, totalizând ${fmt(tripMinutes)} minute/zi. Vă rugăm ajustarea ploturilor transformatorului și reechilibrarea fazelor.`
      : `Către ${s.operator}: Locul de consum ${s.street}, post ${s.transformer_id}. Tensiunea maximă la punctul de racordare a fost ${fmt(s.meter_peak_v, 1)} V, sub limita de ${LEGAL_LIMIT_V} V. Nu se impune o sesizare către operatorul de distribuție; ${s.code === "LOCAL_OVERVOLTAGE_SENSITIVITY" ? `cauza este creșterea de +${fmt(s.cable_rise_v, 1)} V pe cablul intern de ${fmt(s.cable_mm2, 1)} mm² și ${s.cable_m} m.` : "rețeaua funcționează în parametri."}`;

  const batteryText =
    s.battery_kwh > 0
      ? `Bateria dvs. ${s.battery_brand} de ${fmt(s.battery_kwh)} kWh este setată la ${s.configured_soc}% rezervă minimă. Ați cerut ${s.desired_soc}%. ${lockedKwh > 0 ? `Astfel ${fmt(lockedKwh, 1)} kWh rămân blocați zilnic și pierdeți circa ${fmt(taxLoss, 1)} RON/lună din tarife de rețea. Calea în aplicație: ${app.path}.` : "Setarea este optimă."}`
      : `Instalația dvs. nu are baterie. Pentru a muta energia de la prânz (${fmt(PZU_MIDDAY)} RON/MWh) în vârful de seară (${fmt(PZU_EVENING)} RON/MWh), o baterie de 10 kWh ar fi recomandată.`;

  const callCenter = `Bună ziua, ${s.name.split(" ")[0]}! Am analizat instalația dvs. din ${s.city}. ${triageLine(s, lockedKwh)} Vă trimitem un rezumat pe e-mail în câteva minute.`;

  const analysis: HouseholdAnalysis = {
    household_id: s.id,
    customer_name: s.name,
    city: s.city,
    street_address: s.street,
    pod_code: `RO005E${s.id.replace(/\D/g, "").padStart(3, "0")}${String(s.lat).replace(".", "").slice(0, 6)}`,
    distribution_operator: s.operator,
    transformer_id: s.transformer_id,
    inverter_brand: s.inverter_brand,
    inverter_model: s.inverter_model,
    installed_pv_kw: s.pv_kw,
    phase: s.phase,
    overall_severity: s.severity,
    primary_responsible_party: s.responsible,
    one_line_triage_ro: triageLine(s, lockedKwh),
    total_supplier_monthly_benefit_ron: supplierBenefit,
    total_customer_monthly_benefit_ron: customerBenefit,
    grid_verdict: {
      status: gridStatus,
      max_inverter_voltage_v: Math.round(Math.max(maxInv, s.meter_peak_v + s.cable_rise_v * 0.98) * 10) / 10,
      max_meter_voltage_v: Math.round(s.meter_peak_v * 10) / 10,
      voltage_rise_internal_cable_v: Math.round(s.cable_rise_v * 10) / 10,
      inverter_threshold_v: s.inverter_threshold_v,
      legal_limit_v: LEGAL_LIMIT_V,
      neighbors_affected_simultaneously: s.neighbors_tripped,
      neighbors_total: 4,
      trip_minutes: tripMinutes,
      lost_ron_month: tripLost,
      cable_mm2: s.cable_mm2,
      cable_length_m: s.cable_m,
      verdict_text_ro:
        s.code === "GRID_OVERVOLTAGE"
          ? "Vina rețelei OD — contorul depășește 253 V împreună cu vecinii."
          : s.code === "LOCAL_OVERVOLTAGE_SENSITIVITY"
            ? "Vina instalației locale — rețeaua e în parametri, vecinii nu declanșează."
            : "Tensiune în parametri normali.",
    },
    battery_verdict: {
      status: battStatus,
      battery_brand: s.battery_brand || "—",
      battery_kwh: s.battery_kwh,
      desired_min_soc_pct: s.desired_soc,
      configured_min_soc_pct: s.configured_soc,
      mode_ro: s.battery_kwh ? s.mode_ro : "Fără baterie",
      locked_kwh: Math.round(lockedKwh * 100) / 100,
      pzu_evening_ron_mwh: PZU_EVENING,
      pzu_midday_ron_mwh: PZU_MIDDAY,
      monthly_pzu_loss_ron: pzuLoss,
      customer_grid_tax_loss_ron: taxLoss,
      verdict_text_ro: s.battery_kwh === 0 ? "Fără baterie instalată." : lockedKwh > 0 ? "Rezervă prea mare — energie blocată seara." : "Setare optimă pentru vârful de seară.",
    },
    billing_verdict: {
      status: billStatus,
      produced_kwh: s.produced_kwh,
      self_consumed_kwh: s.self_consumed_kwh,
      battery_cycled_kwh: Math.round(s.battery_kwh * 0.6 * 30 * (lockedKwh > 0 ? 0.2 : 0.8)),
      meter_export_kwh: s.meter_export_kwh,
      billed_export_kwh: s.billed_export_kwh,
      billed_ron: s.billed_ron,
      verified_ron: s.verified_ron,
      delta_ron: delta,
      self_consumption_savings_ron: selfSavings,
      verdict_text_ro: delta > 0 ? `Supra-facturare ${fmt(delta, 2)} RON — stornare necesară.` : "Factură verificată matematic.",
    },
    distributor_complaint_text: complaintText,
    invoice_explanation_text: invoiceText,
    battery_guide_text: batteryText,
    call_center_script_text: callCenter,
  };

  const answer: Record<ScenarioCode, string> = {
    GRID_OVERVOLTAGE: `Nu e vina dumneavoastră și nici a panourilor. La prânz, tensiunea pe strada dvs. urcă la ${fmt(s.meter_peak_v, 1)} V, peste limita legală de ${LEGAL_LIMIT_V} V, iar invertorul se oprește automat pentru siguranță — la fel și la ${s.neighbors_tripped} dintre vecini. Am trimis deja sesizarea la ${s.operator}.`,
    LOCAL_OVERVOLTAGE_SENSITIVITY: `Rețeaua de pe stradă e în regulă (${fmt(s.meter_peak_v, 1)} V). Problema e cablul subțire dintre invertor și tablou, care adaugă ${fmt(s.cable_rise_v, 1)} V, plus o setare prea strictă a invertorului. Un tehnician va înlocui cablul și va corecta setarea — fără costuri pentru dvs. dacă instalația e în garanție.`,
    MISCONFIGURED_MODE: `Bateria dvs. păstrează ${s.configured_soc}% din energie ca rezervă pentru pene de curent, așa că seara aproape nu se descarcă. Dacă o setați la ${s.desired_soc}%, folosiți energia proprie exact când curentul e cel mai scump.`,
    MISSING_EXPORT_INDEX: `Ați avut dreptate! Factura nu a inclus cei ${fmt(s.meter_export_kwh)} kWh pe care i-ați trimis în rețea. Suma corectă este ${fmt(s.verified_ron, 2)} RON, iar diferența de ${fmt(delta, 2)} RON vă va fi returnată automat.`,
    INVOICE_VALID_EXPLAINED: `Energia „lipsă” nu s-a pierdut: ${fmt(s.self_consumed_kwh)} kWh au fost folosiți direct în casă înainte să ajungă la contor, economisindu-vă ${fmt(selfSavings)} RON. Cei ${fmt(s.verified_ron, 2)} RON de plată sunt doar tarife de rețea pentru curentul folosit seara.`,
    HEALTHY: "Da! Instalația funcționează optim, iar factura dvs. a fost verificată și este corectă.",
  };

  const scenario: Scenario = {
    code: s.code,
    scenario_badge_ro: scenarioLabel[s.code],
    customer_question_ro: s.question,
    customer_answer_ro: answer[s.code],
    app_name: app.name,
    app_setting_path_ro: app.path,
    app_steps_ro: app.steps,
    coordinates: { lat: s.lat, lon: s.lon },
  };

  return { scenario, analysis, timeseries };
}

const cache = new Map<string, HouseholdDetail>();
export function mockHouseholdDetail(id: string): HouseholdDetail {
  const spec = householdSpecs.find((h) => h.id === id) ?? householdSpecs[0]!;
  if (!cache.has(spec.id)) cache.set(spec.id, buildDetail(spec));
  return cache.get(spec.id)!;
}

export function mockPortfolio(): { metrics: PortfolioSummaryMetrics; households: HouseholdSummary[] } {
  return {
    metrics: portfolioMetrics,
    households: householdSpecs.map((s) => {
      const d = mockHouseholdDetail(s.id);
      return {
        household_id: s.id,
        customer_name: s.name,
        city: s.city,
        overall_severity: s.severity,
        scenario_code: s.code,
        scenario_badge_ro: scenarioLabel[s.code],
        monthly_impact_ron: Math.round((d.analysis.total_supplier_monthly_benefit_ron + d.analysis.total_customer_monthly_benefit_ron) * 10) / 10,
        is_flagship: s.flagship,
        neighborhood_id: s.neighborhood_id,
        installed_pv_kw: s.pv_kw,
      };
    }),
  };
}
