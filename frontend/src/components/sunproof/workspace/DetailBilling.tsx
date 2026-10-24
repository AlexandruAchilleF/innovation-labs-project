import type { QuestionAnswer } from "@/lib/case-questions";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { CompareBars } from "../viz";
import type { Action } from "./CaseActions";
import { EngineText, Evidence, Facts, QuestionHead, SectionActions } from "./DetailParts";

/** Question 3: is the prosumer invoice correct (Law 160/2026, 1:1 quantity compensation). */
export function DetailBilling({
  d,
  q,
  bill,
}: {
  d: HouseholdDetail;
  q: QuestionAnswer;
  bill: Action;
}) {
  const f = d.analysis.billing_verdict;
  const short = f.meter_export_kwh - f.billed_export_kwh;
  const wrong = Math.abs(f.delta_ron) >= 0.01;

  return (
    <div className="space-y-6">
      <QuestionHead n={3} q={q} lossRon={wrong ? Math.abs(f.delta_ron) : null} />

      <Evidence
        title="Energie dată în rețea: contor vs. factură"
        value={short > 0 ? `lipsesc ${fmt(short)} kWh` : "compensat 1:1"}
        tone={short > 0 ? "text-critical" : "text-success"}
        how="Contorul inteligent măsoară câtă energie a trimis casa în rețea (index 2.8.0). Legea 160/2026 cere ca factura să compenseze exact aceeași cantitate. Dacă bara facturii e mai scurtă, o parte din energie nu a fost plătită."
      >
        <CompareBars
          rows={[
            { label: "Măsurat de contor", value: f.meter_export_kwh, unit: "kWh" },
            {
              label: "Trecut pe factură",
              value: f.billed_export_kwh,
              unit: "kWh",
              tone: short > 0 ? "critical" : "success",
            },
          ]}
        />
      </Evidence>

      <Evidence
        title="Unde a mers energia produsă luna aceasta"
        how="Explică de ce exportul e mai mic decât producția: o parte e consumată direct în casă, o parte trece prin baterie, iar doar restul ajunge în rețea și apare pe factură."
      >
        <CompareBars
          rows={[
            { label: "Produsă de panouri", value: f.produced_kwh, unit: "kWh" },
            { label: "Consumată direct", value: f.self_consumed_kwh, unit: "kWh", tone: "fog" },
            { label: "Prin baterie", value: f.battery_cycled_kwh, unit: "kWh", tone: "fog" },
            { label: "Trimisă în rețea", value: f.meter_export_kwh, unit: "kWh" },
          ]}
        />
      </Evidence>

      <Evidence
        title="Suma de pe factură vs. suma corectă"
        value={wrong ? `diferență ${fmt(Math.abs(f.delta_ron), 2)} RON` : "identice"}
        tone={wrong ? "text-critical" : "text-success"}
        how="«Corect» = suma recalculată de SunProof din măsurătorile contorului. Barele trebuie să fie egale; orice diferență trebuie corectată înainte să devină reclamație ANRE."
      >
        <CompareBars
          rows={[
            {
              label: "Facturat",
              value: f.billed_ron,
              unit: "RON",
              tone: wrong ? "critical" : "bone",
            },
            { label: "Corect", value: f.verified_ron, unit: "RON", tone: "success" },
          ]}
        />
      </Evidence>

      <Facts
        rows={[["Economie din autoconsum", `${fmt(f.self_consumption_savings_ron)} RON/lună`]]}
      />

      <EngineText o={f} fallback={f.verdict_text_ro} />
      <SectionActions d={d} actions={wrong ? [bill] : []} />
    </div>
  );
}
