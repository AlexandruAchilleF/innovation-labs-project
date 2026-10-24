import type { ResponsibleParty, ScenarioCode, Severity } from "./types";

export const severityLabel: Record<Severity, string> = {
  CRITICAL: "Critic",
  WARNING: "Avertizare",
  OK: "Optim",
  INFO: "Info",
};

export const responsibleLabel: Record<ResponsibleParty, string> = {
  DISTRIBUTION_OPERATOR: "Operator Distribuție",
  INSTALLER: "Tehnician Instalator",
  CUSTOMER_SETTING: "Setare Client",
  SUPPLIER_BILLING: "Facturare Furnizor",
  NONE: "Fără acțiune",
};

export const scenarioLabel: Record<ScenarioCode, string> = {
  GRID_OVERVOLTAGE: "Supratensiune rețea OD",
  LOCAL_OVERVOLTAGE_SENSITIVITY: "Instalație locală sensibilă",
  MISCONFIGURED_MODE: "Baterie blocată în rezervă",
  MISSING_EXPORT_INDEX: "Index export lipsă pe factură",
  INVOICE_VALID_EXPLAINED: "Factură corectă — explicată",
  HEALTHY: "Funcționare optimă",
};

/** Who acts, phrased for the homeowner (prosumer app). */
export const prosumerResponsibleLabel: Record<ResponsibleParty, string> = {
  DISTRIBUTION_OPERATOR: "Operatorul de Distribuție",
  INSTALLER: "Instalatorul tău",
  CUSTOMER_SETTING: "Tu (din aplicația invertorului)",
  SUPPLIER_BILLING: "Furnizorul (Facturare)",
  NONE: "Nicio acțiune necesară",
};
