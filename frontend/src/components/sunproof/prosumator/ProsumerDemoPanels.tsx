import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Switch as UiSwitch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import { responsibleLabel } from "@/lib/i18n";
import { Panel } from "../primitives";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

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

function IntentCard({ d }: { d: HouseholdDetail }) {
  const b = d.analysis.battery_verdict;
  const configured = b.configured_min_soc_pct;
  const [intent, setIntent] = useState<20 | 80>(b.desired_min_soc_pct >= 80 ? 80 : 20);
  if (b.battery_kwh <= 0) return null;
  const opts: [20 | 80, string][] = [
    [20, "Vreau 20% (seara)"],
    [80, "Vreau 80% (backup)"],
  ];
  const matches = configured === intent;
  return (
    <Panel title="Intenție vs. setare baterie">
      <p className="text-[13px] text-bone">
        Invertorul păstrează acum o rezervă minimă de <span className="num">{configured}%</span> (
        {b.mode_ro}).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {opts.map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={intent === v}
            onClick={() => setIntent(v)}
            className={cn(
              "rounded-[4px] border px-3 py-1 text-[12px] transition-colors",
              intent === v
                ? "border-voltage text-bone"
                : "border-border text-muted-foreground hover:text-bone",
            )}
          >
            {l}
          </button>
        ))}
      </div>
      {matches ? (
        <p className="mt-4 text-[12px] text-fog">
          Setarea invertorului ({configured}%) corespunde intenției tale ({intent}%).
        </p>
      ) : (
        <div className="mt-4 space-y-1 text-[12px] text-bone">
          <div className="text-warning">
            Setarea ({configured}%) nu corespunde intenției ({intent}%)
          </div>
          {intent < configured && (
            <>
              <div>
                Energie blocată în rezervă: <span className="num">{fmt(b.locked_kwh, 1)} kWh/zi</span>
              </div>
              <div>
                Tarife rețea neeconomisite:{" "}
                <span className="num">{fmt(b.customer_grid_tax_loss_ron, 1)} RON/lună</span>
              </div>
              <div className="text-fog">
                Impact PZU furnizor:{" "}
                <span className="num text-bone">{fmt(b.monthly_pzu_loss_ron, 1)} RON/lună</span> (vârf{" "}
                <span className="num">{fmt(b.pzu_evening_ron_mwh)}</span> vs. prânz{" "}
                <span className="num">{fmt(b.pzu_midday_ron_mwh)} RON/MWh</span>)
              </div>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

function TicketCard({ d }: { d: HouseholdDetail }) {
  const g = d.analysis.grid_verdict;
  const tg = useMutation({
    mutationFn: () => api.telegram(d.analysis.household_id),
  });
  return (
    <Panel title="Tichet către echipa O&M (alertă Telegram)">
      <button
        type="button"
        onClick={() => tg.mutate()}
        disabled={tg.isPending}
        className="rounded-[4px] border border-bone px-3 py-1 text-[13px] text-bone transition-colors hover:bg-slate disabled:opacity-50"
      >
        {tg.isPending
          ? "Se trimite…"
          : "Trimite problema cu verdictul SunProof atașat (demo / Telegram)"}
      </button>
      {tg.data && (
        <div className="mt-4 text-[12px] leading-snug">
          <div className="text-bone">
            {tg.data.simulated
              ? `Simulare demo (chat ${tg.data.chat_id}) — pachet pregătit pentru O&M:`
              : `Alertă trimisă prin Telegram (chat ${tg.data.chat_id}) — pachet atașat:`}
          </div>
          <ul className="mt-2 space-y-1 text-fog">
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
      `Încercare interogare telemetrie de către Distribuitor (${d.analysis.distribution_operator}) — ACCES REFUZAT (consimțământ revocat de prosumator)`,
      ...l,
    ]);
  };
  return (
    <Panel title="Acces la date și jurnal de audit (simulare)">
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
      <div className="mt-2 space-y-1 text-[11px]">
        {log.length === 0 && <div className="text-fog">Nicio intrare.</div>}
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
  // IntentCard only renders when the household has an installed battery
  if (d.analysis.battery_verdict.battery_kwh <= 0) {
    return (
      <div className="mt-4 grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-5">
          <TicketCard d={d} />
        </div>
        <div className="col-span-12 md:col-span-7">
          <AccessCard d={d} />
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-5">
        <IntentCard d={d} />
      </div>
      <div className="col-span-12 space-y-4 md:col-span-7">
        <TicketCard d={d} />
        <AccessCard d={d} />
      </div>
    </div>
  );
}
