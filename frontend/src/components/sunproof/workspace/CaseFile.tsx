import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileDown, ReceiptText, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmt, plainText } from "@/lib/format";
import { responsibleLabel, severityLabel } from "@/lib/i18n";
import type { GridState, HouseholdDetail, Neighborhood, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionButton, type Action } from "./CaseActions";
import { NeighborStrip } from "./NeighborStrip";
import { SeverityTag, sevText } from "./SeverityTag";

const headline = (o: object, fallback: string) =>
  (o as { headline_ro?: string }).headline_ro || fallback;

/** Selected client: identity, the three verdicts (the responsible one expanded), street proof, and one primary action chosen by who must act. */
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
    } catch {
      toast.error("Alerta nu a putut fi trimisă", {
        action: { label: "Reîncearcă", onClick: () => void sendAlert() },
      });
    } finally {
      setSending(false);
    }
  };

  const party = a.primary_responsible_party;
  const dossier: Action = {
    id: "pdf",
    icon: <FileDown />,
    label: "Dosar PDF pentru distribuitor",
    short: "Dosar PDF",
    onClick: () => api.openPdfDossier(a.household_id),
    title: nb ? `Dosar pentru distribuitor · ${nb.transformer_id}` : undefined,
  };
  const alert: Action = {
    id: "alert",
    icon: <Send />,
    label: sending ? "Se trimite…" : "Alertă tehnician O&M",
    short: sending ? "Se trimite…" : "Alertă O&M",
    onClick: sendAlert,
    disabled: sending,
  };
  const primary: Action | null =
    party === "DISTRIBUTION_OPERATOR"
      ? dossier
      : party === "INSTALLER"
        ? alert
        : party === "CUSTOMER_SETTING"
          ? {
              id: "guide",
              icon: <Smartphone />,
              label: "Ghidul de setare pentru client",
              to: "/prosumator",
            }
          : party === "SUPPLIER_BILLING"
            ? { id: "bill", icon: <ReceiptText />, label: "Corecția facturii", to: "/triaj" }
            : null;
  // dossier and technician alert are evidence of a grid trip; offer them only when one happened
  const secondary = g.trip_minutes > 0 ? [dossier, alert].filter((x) => x.id !== primary?.id) : [];
  const links = (
    [
      ["/triaj", "Diagnostic complet"],
      ["/prosumator", "Vederea clientului"],
    ] as const
  ).filter(([to]) => to !== primary?.to);
  const owns: Record<string, string> = {
    DISTRIBUTION_OPERATOR: "Rețea",
    INSTALLER: "Rețea",
    CUSTOMER_SETTING: "Baterie",
    SUPPLIER_BILLING: "Factură",
  };

  const verdicts: Verdict[] = [
    {
      label: "Rețea",
      s: g.status,
      value:
        g.trip_minutes > 0
          ? `${g.neighbors_affected_simultaneously}/${g.neighbors_total} vecini simultan`
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4">
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-[22px] leading-tight text-bone">{a.customer_name}</h1>
          <SeverityTag s={a.overall_severity} />
        </div>
        <p className="mt-1 text-[12px] text-fog" title={a.one_line_triage_ro}>
          {a.city} · {fmt(a.installed_pv_kw, 1)} kWp · răspunde{" "}
          <span className="text-bone">{responsibleLabel[party] ?? party}</span>
        </p>
      </header>

      <div className="divide-y divide-border border-y border-border">
        {verdicts.map((v) => (
          <VerdictRow key={v.label} v={v} open={owns[party] === v.label} />
        ))}
      </div>

      {grid && <NeighborStrip houses={grid.houses} clientId={a.household_id} slot={slot} />}

      <section aria-label="Acțiuni" className="mt-2 flex flex-col gap-2">
        {primary && <ActionButton a={primary} household={a.household_id} primary />}
        {secondary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {secondary.map((x) => (
              <ActionButton
                key={x.id}
                a={{ ...x, label: x.short ?? x.label }}
                household={a.household_id}
              />
            ))}
          </div>
        )}
        <nav className="flex gap-4 pt-1 text-[12.5px]">
          {links.map(([to, l]) => (
            <Link
              key={to}
              to={to}
              search={{ household: a.household_id }}
              className="flex items-center gap-0.5 text-fog transition-colors hover:text-bone"
            >
              {l}
              <ChevronRight className="size-3.5" />
            </Link>
          ))}
        </nav>
      </section>
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

function VerdictRow({ v, open }: { v: Verdict; open: boolean }) {
  const expandable = !!v.text || v.facts.length > 0;
  return (
    <details className="group" open={open && expandable}>
      <summary
        className={cn(
          "flex list-none items-baseline gap-3 py-2.5 text-[13px]",
          expandable && "cursor-pointer hover:bg-slate/40",
        )}
        title={severityLabel[v.s]}
      >
        <span className="w-16 shrink-0 text-fog">{v.label}</span>
        <span className={cn("num flex-1 truncate", sevText[v.s])}>
          <span className="sr-only">{severityLabel[v.s]}: </span>
          {v.value}
        </span>
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
