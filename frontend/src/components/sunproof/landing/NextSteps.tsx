import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fmt } from "@/lib/format";
import { portfolioQuery } from "@/lib/queries";

const ROADMAP: [title: string, detail: string, scope: string][] = [
  [
    "Conectori de invertor (doar citire)",
    "Preluarea tensiunii și a alarmelor direct din Huawei FusionSolar și Fronius Solar API, fără hardware nou și fără parola clientului.",
    "Huawei · Fronius",
  ],
  [
    "Import automat contor și factură",
    "Citirea curbei de sarcină la 15 minute din portalul operatorului de distribuție și reconcilierea automată cu factura PDF sau e-Factura.",
    "15 min · e-Factura",
  ],
  [
    "Pilot pe un cartier real",
    "Validare pe 50–100 de gospodării racordate la aceleași posturi de transformare, împreună cu un furnizor de energie sau o echipă O&M.",
    "50–100 gospodării",
  ],
];

/**
 * Planned post-demo work and linear scale estimate from the portfolio metrics.
 * Kept deliberately quiet (no screenshots, no interactive controls, no status colors)
 * so visitors can distinguish the roadmap from the live demo capabilities above.
 */
export function NextSteps() {
  const hydrated = useHydrated();
  const p = useQuery(portfolioQuery()).data;
  const m = hydrated ? p?.metrics : undefined;

  const scaleFacts: [label: string, value: string][] = [
    ["Portofoliu estimat", m ? `${fmt(m.extrapolated_prosumers_count)} prosumatori` : "—"],
    [
      "Economie furnizor",
      m ? `${fmt(Math.round(m.extrapolated_annual_supplier_savings_eur))} EUR / an` : "—",
    ],
    [
      "Vârf de seară acoperit",
      m ? `${fmt(Math.round(m.extrapolated_evening_peak_shifted_mwh_year))} MWh / an` : "—",
    ],
  ];

  return (
    <section aria-labelledby="urmatorii-pasi">
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <div className="max-w-[680px]">
          <h2
            id="urmatorii-pasi"
            className="font-display text-balance text-[32px] leading-tight sm:text-[40px]"
          >
            Următorii pași
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-fog">
            Funcționalitățile de mai sus rulează acum în portofoliul demonstrativ. Mai jos este
            planul pentru primele trei luni de producție și impactul estimat la scara unui furnizor.
          </p>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <h3 className="text-[16px] font-medium text-fog">În lucru după demo</h3>
            <ul className="mt-4 divide-y divide-iron border-y border-iron">
              {ROADMAP.map(([title, detail, scope]) => (
                <li
                  key={title}
                  className="flex flex-col justify-between gap-2 py-5 sm:flex-row sm:items-baseline sm:gap-8"
                >
                  <div className="max-w-[54ch]">
                    <span className="block text-[16px] font-medium text-bone">{title}</span>
                    <p className="mt-1 text-[14px] leading-relaxed text-fog">{detail}</p>
                  </div>
                  <span className="num shrink-0 text-[12px] text-fog">{scope}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <h3 className="text-[16px] font-medium text-fog">Estimare la scară</h3>
            <dl className="mt-4 divide-y divide-iron border-y border-iron">
              {scaleFacts.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-4">
                  <dt className="text-[13px] text-fog">{label}</dt>
                  <dd className="num shrink-0 text-[16px] text-bone">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[12px] leading-relaxed text-fog">
              Metodă de calcul: extrapolare liniară din cele{" "}
              <span className="num text-bone">{m ? fmt(m.monitored_households_count) : "81"}</span>{" "}
              de gospodării simulate (
              {m ? fmt(m.fleet_total_supplier_monthly_value_ron, 2) : "7.804,20"} RON/lună economie
              furnizor × 12 luni × {m ? fmt(m.extrapolated_prosumers_count) : "25.000"} /{" "}
              {m ? fmt(m.monitored_households_count) : "81"} gospodării, la cursul 4,9775 RON/EUR).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
