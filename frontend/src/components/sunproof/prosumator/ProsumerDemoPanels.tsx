import { useState } from "react";
import { Switch as UiSwitch } from "@/components/ui/switch";
import { fmt } from "@/lib/format";
import { responsibleLabel } from "@/lib/i18n";
import { Panel } from "../primitives";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const EVENING_KWH_DAY = 3.5;
const DAYS = 31;
const EVENING_PRICE_RON_KWH = 1.3; // preț de seară (energie + tarife rețea), ipoteză demo
const PILOT_BONUS_RON_KWH = 0.4; // bonus pilot tip Electrica, august 2026, vârf 19:00–21:00

function Switch({
  on,
  onClick,
  disabled,
  label,
}: {
  on: boolean;
  onClick?: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <UiSwitch
      checked={on}
      onCheckedChange={() => onClick?.()}
      disabled={disabled}
      aria-label={label}
    />
  );
}

function IntentCard() {
  const [intent, setIntent] = useState<20 | 80>(20);
  const kwhMonth = EVENING_KWH_DAY * DAYS;
  const costRon = kwhMonth * EVENING_PRICE_RON_KWH;
  const bonusRon = kwhMonth * PILOT_BONUS_RON_KWH;
  const opts: [20 | 80, string][] = [
    [20, "Vreau 20% (seara)"],
    [80, "Vreau 80% (backup)"],
  ];
  return (
    <Panel title="Intenție vs. setare baterie">
      <p className="text-[13px] text-bone">Rezerva a trecut de la 20% la 80% pe 3 iulie 2026.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {opts.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setIntent(v)}
            className={cn(
              "rounded-[4px] border px-3 py-1.5 text-[12px]",
              intent === v ? "border-voltage text-bone" : "border-border text-muted-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>
      {intent === 20 ? (
        <div className="mt-4 space-y-1 text-[12.5px] text-bone">
          <div className="text-critical">Setarea (80%) nu corespunde intenției (20%)</div>
          <div
            title={`${fmt(EVENING_KWH_DAY, 1)} kWh/zi × ${DAYS} zile × ${fmt(EVENING_PRICE_RON_KWH, 2)} RON/kWh`}
          >
            Import seara: <span className="num">{fmt(costRon)} RON/lună</span>
          </div>
          <div
            title={`Bonus pilot tip Electrica, ${fmt(PILOT_BONUS_RON_KWH, 2)} RON/kWh livrat 19:00–21:00`}
          >
            Bonus ratat: <span className="num">{fmt(bonusRon)} RON/lună</span>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[12.5px] text-fog">
          Setarea invertorului (80%) corespunde intenției tale (80%).
        </p>
      )}
    </Panel>
  );
}

function TicketCard({ d }: { d: HouseholdDetail }) {
  const [sent, setSent] = useState(false);
  const g = d.analysis.grid_verdict;
  return (
    <Panel title="Tichet către echipa O&M">
      <button
        type="button"
        onClick={() => setSent(true)}
        className="rounded-[4px] border border-bone px-3 py-1.5 text-[13px] text-bone transition-colors hover:bg-slate"
      >
        Trimite problema cu verdictul SunProof atașat
      </button>
      {sent && (
        <div className="mt-4 text-[12.5px] leading-snug">
          <div className="text-bone">Tichet creat și trimis. Pachet atașat:</div>
          <ul className="mt-1.5 space-y-0.5 text-fog">
            <li>
              ID gospodărie: <span className="num text-bone">{d.analysis.household_id}</span>
            </li>
            <li>Verdict SunProof: {d.analysis.one_line_triage_ro}</li>
            <li>
              Tensiune maximă contor vs. invertor:{" "}
              <span className="num text-bone">{fmt(g.max_meter_voltage_v, 1)} V</span> vs.{" "}
              <span className="num text-bone">{fmt(g.max_inverter_voltage_v, 1)} V</span>
            </li>
            <li>
              Responsabil:{" "}
              <span className="text-bone">
                {responsibleLabel[d.analysis.primary_responsible_party] ??
                  d.analysis.primary_responsible_party}
              </span>
            </li>
          </ul>
        </div>
      )}
    </Panel>
  );
}

function AccessCard({ d }: { d: HouseholdDetail }) {
  const [distOn, setDistOn] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const revoke = () => {
    if (!distOn) return;
    setDistOn(false);
    setLog((l) => [
      `[Azi, 14:22:05] Încercare interogare telemetrie de către Distribuitor (${d.analysis.distribution_operator}) — ACCES REFUZAT (consimțământ revocat de prosumator)`,
      ...l,
    ]);
  };
  return (
    <Panel title="Acces la date și jurnal de audit">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[13px] text-bone">
          <span>Furnizor</span>
          <Switch on disabled label="Furnizor" />
        </div>
        <div className="flex items-center justify-between text-[13px] text-bone">
          <span>Echipa O&amp;M</span>
          <Switch on disabled label="Echipa O&M" />
        </div>
        <div className="flex items-center justify-between text-[13px] text-bone">
          <span>
            Distribuitor{" "}
            <span className="text-fog">{distOn ? "· comută pentru a revoca" : "· revocat"}</span>
          </span>
          <Switch on={distOn} onClick={revoke} label="Distribuitor" />
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-3 text-[12px] text-fog">
        Jurnal de audit · doar citire, fără parola invertorului
      </div>
      <div className="mt-1.5 space-y-1 text-[11.5px]">
        {log.length === 0 && <div className="text-smoke">Nicio intrare.</div>}
        {log.map((e, i) => (
          <div key={i} className="num text-critical">
            {e}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ProsumerDemoPanels({ d }: { d: HouseholdDetail }) {
  return (
    <div className="mt-5 grid grid-cols-12 gap-5">
      <div className="col-span-12 md:col-span-6">
        <IntentCard />
      </div>
      <div className="col-span-12 space-y-5 md:col-span-6">
        <TicketCard d={d} />
        <AccessCard d={d} />
      </div>
    </div>
  );
}
