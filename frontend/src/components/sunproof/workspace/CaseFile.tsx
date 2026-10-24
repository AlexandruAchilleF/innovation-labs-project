import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, FileDown, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmt, plainText } from "@/lib/format";
import { responsibleLabel, severityLabel } from "@/lib/i18n";
import type { GridState, HouseholdDetail, Neighborhood, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NeighborStrip } from "./NeighborStrip";
import { SeverityTag, sevText } from "./SeverityTag";

const headline = (o: object, fallback: string) =>
  (o as { headline_ro?: string }).headline_ro || fallback;

/** Selected client: identity, the three verdicts as one-line answers (details on demand), and actions. */
export function CaseFile({
  d,
  nb,
  grid,
  slot,
}: {
  d: HouseholdDetail;
  nb: Neighborhood | undefined;
  grid: Neighborhood | GridState | undefined;
  slot: number;
}) {
  const a = d.analysis;
  const g = a.grid_verdict;
  const b = a.battery_verdict;
  const f = a.billing_verdict;
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sendAlert = async () => {
    setSending(true);
    try {
      const r = await api.telegram(a.household_id);
      setSent(plainText(r.message_text));
      toast(r.simulated ? "Alertă Telegram simulată" : "Alertă Telegram trimisă");
    } finally {
      setSending(false);
    }
  };

  const verdicts: Verdict[] = [
    {
      label: "Rețea",
      s: g.status,
      value:
        g.trip_minutes > 0
          ? `${g.neighbors_affected_simultaneously}/${g.neighbors_total} vecini`
          : "fără opriri",
      text: headline(g, g.verdict_text_ro),
      facts: [
        ["Contor (PCC)", `${fmt(g.max_meter_voltage_v, 1)} V`],
        ["Cablu intern", `+${fmt(g.voltage_rise_internal_cable_v, 1)} V`],
        ["Opriri azi", `${g.trip_minutes} min`],
      ],
    },
    {
      label: "Baterie",
      s: b.status,
      value: !b.battery_kwh
        ? "fără baterie"
        : b.configured_min_soc_pct !== b.desired_min_soc_pct
          ? `${b.configured_min_soc_pct}% → ${b.desired_min_soc_pct}%`
          : "setată corect",
      text: b.battery_kwh ? headline(b, b.verdict_text_ro) : "",
      facts: b.battery_kwh
        ? [
            ["Blocat", `${fmt(b.locked_kwh, 1)} kWh`],
            ["Pierdere furnizor", `${fmt(b.monthly_pzu_loss_ron)} RON/lună`],
          ]
        : [],
    },
    {
      label: "Factură",
      s: f.status,
      value: f.delta_ron !== 0 ? `${fmt(f.delta_ron, 2)} RON` : "corectă",
      text: headline(f, f.verdict_text_ro),
      facts: [
        ["Facturat / corect", `${fmt(f.billed_ron)} / ${fmt(f.verified_ron)} RON`],
        [
          "Export contor / facturat",
          `${fmt(f.meter_export_kwh)} / ${fmt(f.billed_export_kwh)} kWh`,
        ],
      ],
    },
  ];

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-6 pt-4">
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-[22px] leading-tight text-bone">{a.customer_name}</h1>
          <SeverityTag s={a.overall_severity} />
        </div>
        <p className="mt-1 text-[12px] text-fog" title={a.one_line_triage_ro}>
          {a.city} · {fmt(a.installed_pv_kw, 1)} kWp · răspunde{" "}
          <span className="text-bone">
            {responsibleLabel[a.primary_responsible_party] ?? a.primary_responsible_party}
          </span>
        </p>
      </header>

      {grid && <NeighborStrip houses={grid.houses} clientId={a.household_id} slot={slot} />}

      <div className="divide-y divide-border border-y border-border">
        {verdicts.map((v) => (
          <VerdictRow key={v.label} v={v} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <ActionButton icon={<FileDown />} onClick={() => api.openPdfDossier(a.household_id)}>
          Dosar PDF{nb ? ` ${nb.transformer_id}` : ""}
        </ActionButton>
        <ActionButton icon={<Send />} onClick={sendAlert} disabled={sending}>
          {sending ? "Se trimite…" : "Alertă O&M"}
        </ActionButton>
        <ActionButton icon={<ClipboardList />} to="/triaj" household={a.household_id}>
          Diagnostic
        </ActionButton>
        <ActionButton icon={<Smartphone />} to="/prosumator" household={a.household_id}>
          Vederea clientului
        </ActionButton>
      </div>
      {sent && (
        <details className="text-[12px] text-fog">
          <summary className="cursor-pointer hover:text-bone">Mesajul trimis tehnicianului</summary>
          <pre className="num mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed">
            {sent}
          </pre>
        </details>
      )}
    </div>
  );
}

interface Verdict {
  label: string;
  s: Severity;
  value: string;
  text: string;
  facts: string[][];
}

function VerdictRow({ v }: { v: Verdict }) {
  const expandable = !!v.text || v.facts.length > 0;
  return (
    <details className="group">
      <summary
        className={cn(
          "flex list-none items-baseline gap-3 py-2.5 text-[13px]",
          expandable && "cursor-pointer hover:bg-slate/40",
        )}
        title={severityLabel[v.s]}
      >
        <span className="w-16 shrink-0 text-fog">{v.label}</span>
        <span className={cn("num flex-1 truncate", sevText[v.s])}>{v.value}</span>
        {expandable && (
          <ChevronRight className="size-3.5 shrink-0 self-center text-smoke transition-transform group-open:rotate-90" />
        )}
      </summary>
      {expandable && (
        <div className="space-y-2 pb-3 pl-[76px] text-[12px] leading-relaxed">
          {v.text && <p className="text-fog">{v.text}</p>}
          {v.facts.length > 0 && (
            <dl className="space-y-0.5">
              {v.facts.map(([k, val]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-fog">{k}</dt>
                  <dd className="num text-bone">{val}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </details>
  );
}

function ActionButton({
  icon,
  children,
  onClick,
  disabled,
  to,
  household,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  to?: "/triaj" | "/prosumator";
  household?: string;
}) {
  const cls =
    "flex items-center gap-2 rounded-[4px] border border-iron px-2.5 py-2 text-[12.5px] text-bone transition-colors hover:bg-slate disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-fog";
  return to ? (
    <Link to={to} search={{ household: household! }} className={cls}>
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  ) : (
    <button onClick={onClick} disabled={disabled} className={cls}>
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}
