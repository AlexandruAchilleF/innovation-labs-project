import { useState } from "react";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATES = [
  {
    label: "2 zile însorite fără defect",
    badge: "Tichet VERIFICAT (închis automat după 48h cu producție ≥95% PVGIS)",
    why: "Producția măsurată se compară cu estimarea PVGIS pe 48h; peste 95% fără opriri, defectul este considerat remediat.",
  },
  {
    label: "Defectul revine a 2-a zi",
    badge: "Tichet REDESCHIS automat (producție sub prag / oprire detectată)",
    why: "Orice scădere sub prag sau o nouă oprire în fereastra de verificare redeschide tichetul fără intervenție manuală.",
  },
  {
    label: "2 zile înnorate după reparație",
    badge:
      "DOVEZI INSUFICIENTE (iradiere scăzută — tichetul rămâne în monitorizare, nu se închide fals)",
    why: "Cu iradiere scăzută, producția nu poate confirma reparația; motorul așteaptă zile cu soare în loc să închidă pe date neconcludente.",
  },
  {
    label: "Fără telemetrie (Wi-Fi oprit)",
    badge: "LIPSĂ DATE (nu se clasifică drept oprire sau defect — 0 alarme false)",
    why: "Absența datelor este tratată separat de producția zero: fără mostre nu se emite nicio concluzie de defect.",
  },
];

export function OmTicketLifecycleCard(_: { d: HouseholdDetail }) {
  const [i, setI] = useState(0);
  const s = STATES[i] ?? STATES[0]!;
  const tone = ["text-bone", "text-critical", "text-warning", "text-fog"][i];
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-[13px] font-medium text-bone">
        Ciclul de viață al tichetului O&amp;M
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {STATES.map((st, k) => (
          <button
            key={st.label}
            onClick={() => setI(k)}
            aria-pressed={i === k}
            className={cn(
              "rounded-[4px] border px-2.5 py-1 text-[12px] transition-colors",
              i === k ? "border-voltage text-bone" : "border-iron text-fog hover:text-bone",
            )}
          >
            {st.label}
          </button>
        ))}
      </div>
      <p className={cn("mt-3 text-[13px]", tone)}>{s.badge}</p>
      <p className="mt-1 max-w-[75ch] text-[12.5px] text-fog">{s.why}</p>
    </section>
  );
}

const CARDS = [
  { v: "81/81", p: "100,0%", t: "Acuratețe Rețea vs. Echipament la 1 minut" },
  {
    v: "81/81",
    p: "100,0%",
    t: "Acuratețe la 5 minute (Cloud Polling standard, fără hardware nou)",
  },
  { v: "0/60", p: "0,0%", t: "Alarme false pe instalații sănătoase / regim Volt-Watt normal" },
  { v: "81/81", p: "100,0%", t: "Audit Baterie & Reconciliere Factură Legea 160/2026" },
];

const ROWS = [
  { c: "Sănătoase / Volt-Watt", n: "60", note: "0 alarme false" },
  { c: "Supratensiune Rețea", n: "15", note: "6.750 RON deplasări evitate" },
  { c: "Prag U> greșit", n: "1", note: "configurare invertor" },
  { c: "Cablu AC subdimensionat", n: "1", note: "defect local instalație" },
  { c: "Defect echipament / string", n: "4", note: "intervenție O&M" },
];

export function ProofBenchmarkPanel() {
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.t}>
            <dd className="num text-[22px] text-bone">
              {c.v} <span className="text-[12px] text-fog">{c.p}</span>
            </dd>
            <dt className="mt-0.5 text-[12px] text-fog">{c.t}</dt>
          </div>
        ))}
      </dl>
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 text-[13px] font-medium text-bone">
          Categorii ground truth (81 scenarii)
        </h3>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Categorie</th>
              <th className="py-1 text-right font-medium">Nr.</th>
              <th className="py-1 pl-3 font-medium">Rezultat</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.c} className="border-t border-border">
                <td className="py-1.5">{r.c}</td>
                <td className="num py-1.5 text-right font-semibold">{r.n}</td>
                <td className="py-1.5 pl-3">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
