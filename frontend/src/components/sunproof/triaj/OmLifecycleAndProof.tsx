import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import { fmt } from "@/lib/format";
import { responsibleLabel, scenarioLabel } from "@/lib/i18n";
import { portfolioQuery } from "@/lib/queries";
import type { HouseholdDetail, ScenarioCode } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATES = [
  {
    label: "Zile însorite fără defect",
    badge: "Tichet VERIFICAT (închis automat după confirmarea producției PVGIS)",
    why: "Producția măsurată se compară cu estimarea PVGIS; fără opriri în fereastra de verificare, defectul este considerat remediat.",
  },
  {
    label: "Defectul revine după intervenție",
    badge: "Tichet REDESCHIS automat (producție sub prag / oprire detectată)",
    why: "Orice scădere sub prag sau o nouă oprire în fereastra de verificare redeschide tichetul fără intervenție manuală.",
  },
  {
    label: "Zile înnorate după reparație",
    badge:
      "DOVEZI INSUFICIENTE (iradiere scăzută — tichetul rămâne în monitorizare, nu se închide fals)",
    why: "Cu iradiere scăzută, producția nu poate confirma reparația; motorul așteaptă zile cu soare în loc să închidă pe date neconcludente.",
  },
  {
    label: "Fără telemetrie (Wi-Fi oprit)",
    badge: "LIPSĂ DATE (nu se clasifică drept oprire sau defect)",
    why: "Absența datelor este tratată separat de producția zero: fără mostre nu se emite nicio concluzie de defect.",
  },
];

export function OmTicketLifecycleCard({ d }: { d: HouseholdDetail }) {
  const [i, setI] = useState(0);
  const s = STATES[i] ?? STATES[0]!;
  const tone = ["text-bone", "text-critical", "text-warning", "text-fog"][i];
  const party =
    responsibleLabel[d.analysis.primary_responsible_party] ?? d.analysis.primary_responsible_party;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-medium text-bone">Ciclul de viață al tichetului O&amp;M</h3>
        <span className="text-[12px] text-fog">
          Responsabil curent: <span className="text-bone">{party}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {STATES.map((st, k) => (
          <button
            key={st.label}
            type="button"
            onClick={() => setI(k)}
            aria-pressed={i === k}
            className={cn(
              "rounded-[4px] border px-3 py-1 text-[12px] transition-colors",
              i === k ? "border-voltage text-bone" : "border-iron text-fog hover:text-bone",
            )}
          >
            {st.label}
          </button>
        ))}
      </div>
      <p className={cn("mt-3 text-[13px]", tone)}>{s.badge}</p>
      <p className="mt-1 max-w-[75ch] text-[12px] text-fog">{s.why}</p>
    </section>
  );
}

const SCENARIO_ORDER: ScenarioCode[] = [
  "HEALTHY",
  "GRID_OVERVOLTAGE",
  "LOCAL_OVERVOLTAGE_SENSITIVITY",
  "MISCONFIGURED_MODE",
  "MISSING_EXPORT_INDEX",
  "INVOICE_VALID_EXPLAINED",
];

export function ProofBenchmarkPanel() {
  const hydrated = useHydrated();
  const portfolio = useQuery(portfolioQuery());
  const data = hydrated ? portfolio.data : undefined;

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-[13px] text-fog">
        Se încarcă sumarul portofoliului…
      </div>
    );
  }

  const m = data.metrics;
  const cards = [
    {
      v: fmt(m.monitored_households_count),
      t: "Gospodării monitorizate în portofoliu",
    },
    {
      v: `${fmt(m.fleet_avoided_truck_rolls_ron)} RON`,
      t: `Deplasări evitate (${fmt(m.grid_fault_households_count)} cazuri rețea OD)`,
    },
    {
      v: `${fmt(m.fleet_monthly_pzu_savings_ron, 1)} RON`,
      t: `Economie lunară PZU (${fmt(m.misconfigured_Batteries_count)} baterii)`,
    },
    {
      v: fmt(m.fleet_anre_complaints_prevented),
      t: "Sesizări ANRE prevenite",
    },
  ];

  const rows = SCENARIO_ORDER.map((code) => {
    const matching = data.households.filter((h) => h.scenario_code === code);
    const impactRon = matching.reduce((sum, h) => sum + h.monthly_impact_ron, 0);
    return {
      code,
      label: scenarioLabel[code],
      count: matching.length,
      impactRon,
    };
  }).filter((r) => r.count > 0);

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.t}>
            <dd className="num text-[22px] text-bone">{c.v}</dd>
            <dt className="mt-1 text-[12px] text-fog">{c.t}</dt>
          </div>
        ))}
      </dl>
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 text-[13px] font-medium text-bone">
          Distribuție portofoliu ({fmt(m.monitored_households_count)} gospodării)
        </h3>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Categorie</th>
              <th className="py-1 text-right font-medium">Gospodării</th>
              <th className="py-1 pl-3 text-right font-medium">Impact lunar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="border-t border-border">
                <td className="py-2">{r.label}</td>
                <td className="num py-2 text-right font-medium">{fmt(r.count)}</td>
                <td className="num py-2 pl-3 text-right text-fog">
                  {r.impactRon > 0 ? `${fmt(r.impactRon, 1)} RON/lună` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
