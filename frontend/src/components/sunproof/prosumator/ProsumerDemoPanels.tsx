import { useState, type ReactNode } from "react";
import { BatteryCharging, ClipboardList, ShieldCheck } from "lucide-react";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const EVENING_KWH_DAY = 3.5;
const DAYS = 31;
const EVENING_PRICE_RON_KWH = 1.3; // preț de seară (energie + tarife rețea), ipoteză demo
const PILOT_BONUS_RON_KWH = 0.4; // bonus pilot tip Electrica, august 2026, vârf 19:00–21:00

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
        <span className="flex size-7 items-center justify-center rounded-[4px] border border-iron text-fog">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Switch({ on, onClick, disabled }: { on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-success" : "bg-muted", disabled ? "cursor-default" : "cursor-pointer")}
    >
      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", on ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

function IntentCard() {
  const [intent, setIntent] = useState<20 | 80>(20);
  const kwhMonth = EVENING_KWH_DAY * DAYS;
  const costRon = kwhMonth * EVENING_PRICE_RON_KWH;
  const bonusRon = kwhMonth * PILOT_BONUS_RON_KWH;
  const opts: [20 | 80, string][] = [
    [20, "Rezervă dorită: 20% (Folosire seara)"],
    [80, "Rezervă dorită: 80% (Rezervă pană de curent)"],
  ];
  return (
    <Panel title="Intenție vs. Setare Baterie & Bonus Pilot Electrica" icon={<BatteryCharging className="size-4" />}>
      <p className="text-[13px] leading-snug">
        Modificare detectată pe <b>3 iulie 2026</b>: rezerva minimă SoC a trecut de la 20% la 80% (+3,5 kWh/zi importați seara din rețea).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {opts.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setIntent(v)}
            className={cn("rounded-[4px] border px-3 py-1.5 text-[12px]", intent === v ? "border-voltage text-bone" : "border-border text-muted-foreground")}
          >
            {l}
          </button>
        ))}
      </div>
      {intent === 20 ? (
        <div className="mt-3 rounded-lg border border-critical/40 bg-critical/10 p-3 text-[12.5px] leading-snug">
          <div className="font-semibold text-critical">Alertă: setarea invertorului (80%) nu corespunde intenției tale (20%)</div>
          <div className="mt-1">
            Cost import de seară: <span className="num font-semibold">{fmt(costRon, 2)} RON/lună</span>{" "}
            <span className="num text-muted-foreground">
              ({fmt(EVENING_KWH_DAY, 1)} kWh/zi × {DAYS} zile × {fmt(EVENING_PRICE_RON_KWH, 2)} RON/kWh)
            </span>
          </div>
          <div className="mt-1">
            Bonus pilot tip Electrica (august 2026, {fmt(PILOT_BONUS_RON_KWH, 2)} RON/kWh livrat la vârful 19:00–21:00) ratat:{" "}
            <span className="num font-semibold">{fmt(bonusRon, 2)} RON/lună</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 inline-flex rounded-[4px] bg-success-soft px-3 py-1.5 text-[12.5px] font-semibold text-success">
          Fără alertă: setarea invertorului (80%) corespunde intenției tale declarate (80%)
        </div>
      )}
    </Panel>
  );
}

function TicketCard({ d }: { d: HouseholdDetail }) {
  const [sent, setSent] = useState(false);
  const g = d.analysis.grid_verdict;
  return (
    <Panel title="Trimite tichet către echipa O&M" icon={<ClipboardList className="size-4" />}>
      <button
        type="button"
        onClick={() => setSent(true)}
        className="rounded-lg bg-ink px-3 py-2 text-[12.5px] font-semibold text-ink-foreground hover:opacity-90"
      >
        Trimite problemă către O&amp;M cu verdictul SunProof atașat
      </button>
      {sent && (
        <div className="mt-3 rounded-lg border border-success/40 bg-success-soft p-3 text-[12.5px] leading-snug">
          <div className="font-semibold text-success">Tichet creat și trimis către echipa O&amp;M</div>
          <div className="mt-1 text-[11.5px] uppercase tracking-wide text-muted-foreground">Pachet atașat</div>
          <ul className="mt-1 space-y-0.5">
            <li>ID gospodărie: <span className="num font-semibold">{d.analysis.household_id}</span></li>
            <li>Verdict SunProof: {d.analysis.one_line_triage_ro}</li>
            <li>
              Tensiune maximă contor vs. invertor:{" "}
              <span className="num font-semibold">{fmt(g.max_meter_voltage_v, 1)} V</span> vs.{" "}
              <span className="num font-semibold">{fmt(g.max_inverter_voltage_v, 1)} V</span>
            </li>
            <li>Responsabil: <span className="font-semibold">{d.analysis.primary_responsible_party}</span></li>
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
    <Panel title="Control Acces Date & Jurnal de Audit (Fără parola invertorului)" icon={<ShieldCheck className="size-4" />}>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[12.5px]">
          <span>Furnizor (Activ)</span>
          <Switch on disabled />
        </div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span>Echipa O&amp;M (Activ)</span>
          <Switch on disabled />
        </div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span>{distOn ? "Distribuitor (Activ -> click pentru Revocare)" : "Distribuitor (Revocat)"}</span>
          <Switch on={distOn} onClick={revoke} />
        </div>
      </div>
      <div className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">Jurnal de audit · acces Read-Only</div>
      <div className="mt-1 min-h-10 space-y-1 rounded-lg bg-muted/60 p-2 text-[11.5px]">
        {log.length === 0 && <div className="text-muted-foreground">Nicio intrare.</div>}
        {log.map((e, i) => (
          <div key={i} className="num rounded bg-critical/10 px-2 py-1 font-medium text-critical">{e}</div>
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
