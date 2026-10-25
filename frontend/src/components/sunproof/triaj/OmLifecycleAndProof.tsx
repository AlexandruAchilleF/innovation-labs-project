import { useState } from "react";
import { responsibleLabel } from "@/lib/i18n";
import type { HouseholdDetail } from "@/lib/types";
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
