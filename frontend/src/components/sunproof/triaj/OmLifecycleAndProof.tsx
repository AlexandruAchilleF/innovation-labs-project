import { useState } from "react";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATES = [
  {
    label: "☀️ 2 zile însorite fără defect",
    tone: "bg-success-soft",
    badge: "Tichet VERIFICAT (închis automat după 48h cu producție ≥95% PVGIS)",
    why: "Producția măsurată se compară cu estimarea PVGIS pe 48h; peste 95% fără opriri, defectul este considerat remediat.",
  },
  {
    label: "⚠️ Defectul revine a 2-a zi",
    tone: "bg-critical-soft",
    badge: "Tichet REDESCHIS automat (producție sub prag / oprire detectată)",
    why: "Orice scădere sub prag sau o nouă oprire în fereastra de verificare redeschide tichetul fără intervenție manuală.",
  },
  {
    label: "☁️ 2 zile înnorate după reparație",
    tone: "bg-warning-soft",
    badge: "DOVEZI INSUFICIENTE (iradiere scăzută — tichetul rămâne în monitorizare, nu se închide fals)",
    why: "Cu iradiere scăzută, producția nu poate confirma reparația; motorul așteaptă zile cu soare în loc să închidă pe date neconcludente.",
  },
  {
    label: "📡 Fără telemetrie (Wi-Fi oprit)",
    tone: "bg-info-soft",
    badge: "LIPSĂ DATE (nu se clasifică drept oprire sau defect — 0 alarme false)",
    why: "Absența datelor este tratată separat de producția zero: fără mostre nu se emite nicio concluzie de defect.",
  },
];

export function OmTicketLifecycleCard({ d }: { d: HouseholdDetail }) {
  const [i, setI] = useState(0);
  const s = STATES[i] ?? STATES[0]!;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Ciclul de viață al tichetului O&amp;M</h3>
        <span className="num text-[11px] text-muted-foreground">{d.analysis.household_id}</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {STATES.map((st, k) => (
          <button
            key={st.label}
            onClick={() => setI(k)}
            aria-pressed={i === k}
            className={cn(
              "rounded-lg border border-border px-2 py-1.5 text-left text-[12px] font-medium transition-colors",
              i === k ? "bg-ink text-ink-foreground" : "hover:bg-muted",
            )}
          >
            {st.label}
          </button>
        ))}
      </div>
      <div className={cn("mt-3 rounded-lg p-3", s.tone)}>
        <div className="text-[13px] font-semibold">{s.badge}</div>
        <p className="mt-1 text-[12px] text-muted-foreground">{s.why}</p>
      </div>
    </div>
  );
}

const CARDS = [
  { v: "81/81", p: "100,0%", t: "Acuratețe Rețea vs. Echipament la 1 minut", tone: "bg-success-soft" },
  { v: "81/81", p: "100,0%", t: "Acuratețe la 5 minute (Cloud Polling standard, fără hardware nou)", tone: "bg-success-soft" },
  { v: "0/60", p: "0,0%", t: "Alarme false pe instalații sănătoase / regim Volt-Watt normal", tone: "bg-success-soft" },
  { v: "81/81", p: "100,0%", t: "Audit Baterie & Reconciliere Factură Legea 160/2026", tone: "bg-success-soft" },
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.t} className={cn("rounded-lg border border-border p-4", c.tone)}>
            <div className="num text-2xl font-medium">{c.v}</div>
            <div className="num text-[12px] font-semibold">({c.p})</div>
            <div className="mt-1 text-[12px] text-muted-foreground">{c.t}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Categorii Ground Truth (81 scenarii)</h3>
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
