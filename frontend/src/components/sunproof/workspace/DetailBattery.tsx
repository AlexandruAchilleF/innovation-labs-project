import type { QuestionAnswer } from "@/lib/case-questions";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { CompareBars, ScaleBar } from "../viz";
import { SocDay } from "../viz-marks";
import type { Action } from "./CaseActions";
import { EngineText, Evidence, Facts, Key, QuestionHead, SectionActions } from "./DetailParts";

/** Question 2: is the battery locked out of the expensive evening peak. */
export function DetailBattery({
  d,
  q,
  guide,
}: {
  d: HouseholdDetail;
  q: QuestionAnswer;
  guide: Action;
}) {
  const b = d.analysis.battery_verdict;
  if (!b.battery_kwh) {
    return (
      <div className="space-y-6">
        <QuestionHead n={2} q={q} />
        <p className="text-[12.5px] leading-relaxed text-fog">
          Fără baterie nu există energie care să poată fi mutată din prânz în vârful de seară.
          Verificarea se aplică doar clienților cu stocare.
        </p>
      </div>
    );
  }
  const conf = b.configured_min_soc_pct;
  const want = b.desired_min_soc_pct;
  const locked = conf !== want;
  const spread = b.pzu_evening_ron_mwh - b.pzu_midday_ron_mwh;

  return (
    <div className="space-y-6">
      <QuestionHead n={2} q={q} lossRon={locked ? b.monthly_pzu_loss_ron : null} />

      <Evidence
        title="Nivelul bateriei pe parcursul zilei"
        value={`rezervă ${conf}%`}
        tone={locked ? "text-warning" : "text-fog"}
        how={
          <>
            Linia albă = cât de încărcată e bateria.{" "}
            <Key className="bg-warning">linia punctată</Key> = rezerva sub care invertorul nu o mai
            descarcă. Zona colorată = vârful de seară (18–22), când energia e scumpă. Dacă bateria
            stă lipită de rezervă seara, energia ei e blocată.
          </>
        }
      >
        <SocDay minutes={d.timeseries.minutes} reservePct={conf} wantedPct={want} />
      </Evidence>

      <Evidence
        title="Rezerva minimă: setată vs. dorită"
        value={locked ? `${fmt(b.locked_kwh, 1)} kWh/zi blocați` : "corectă"}
        tone={locked ? "text-warning" : "text-success"}
        how={
          <>
            Bara = capacitatea bateriei, 0–100%. «setat» = rezerva din invertor, «dorit» = ce a
            cerut clientul. <Key className="hatch border border-warning">zona hașurată</Key> =
            energia care nu ajunge niciodată în casă seara.
          </>
        }
      >
        <ScaleBar
          label={`Rezervă setată ${conf}%, dorită ${want}%`}
          min={0}
          max={100}
          hatch={locked ? { from: Math.min(conf, want), to: Math.max(conf, want) } : undefined}
          markers={[
            { value: conf, label: `setat ${conf}%`, tone: locked ? "warning" : "bone" },
            { value: want, label: `dorit ${want}%`, tone: "bone", side: "bottom" },
          ]}
        />
      </Evidence>

      <Evidence
        title="Prețul energiei pe bursă (PZU)"
        value={`diferență ${fmt(spread)} RON/MWh`}
        how="Bateria se încarcă la prânz, când energia e ieftină, și ar trebui să livreze seara, când e scumpă. Diferența dintre cele două bare e câștigul pierdut pentru fiecare MWh blocat."
      >
        <CompareBars
          rows={[
            { label: "Prânz (încarcă)", value: b.pzu_midday_ron_mwh, unit: "RON/MWh", tone: "fog" },
            { label: "Seară (ar livra)", value: b.pzu_evening_ron_mwh, unit: "RON/MWh" },
          ]}
        />
      </Evidence>

      <Facts
        rows={[
          ["Baterie", `${b.battery_brand} · ${fmt(b.battery_kwh, 1)} kWh`],
          ["Mod de funcționare", b.mode_ro],
          ["Pierdere furnizor (PZU)", `${fmt(b.monthly_pzu_loss_ron)} RON/lună`],
          ["Pierdere client (tarif rețea)", `${fmt(b.customer_grid_tax_loss_ron)} RON/lună`],
        ]}
      />

      <EngineText o={b} fallback={b.verdict_text_ro} />
      <SectionActions d={d} actions={locked ? [guide] : []} />
    </div>
  );
}
