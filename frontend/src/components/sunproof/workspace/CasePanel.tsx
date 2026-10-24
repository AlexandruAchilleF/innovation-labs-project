import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, CornerDownLeft } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import { responsibleLabel } from "@/lib/i18n";
import type {
  GridState,
  HouseholdDetail,
  HouseholdSummary,
  Neighborhood,
  Severity,
  TelegramResult,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { NeighborStrip } from "./NeighborStrip";
import { PortfolioList } from "./PortfolioList";
import { SeverityTag } from "./SeverityTag";

// Telegram messages use HTML parse mode; show them as plain text in the preview
const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
const headline = (o: object, fallback: string) =>
  (o as { headline_ro?: string }).headline_ro || fallback;

export function CasePanel({
  households,
  selected,
  detail,
  nb,
  grid,
  slot,
  onSelect,
}: {
  households: HouseholdSummary[] | undefined;
  selected: string;
  detail: HouseholdDetail | undefined;
  nb: Neighborhood | undefined;
  grid: Neighborhood | GridState | undefined;
  slot: number;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<"case" | "list">("case");
  const name = households?.find((h) => h.household_id === selected)?.customer_name ?? selected;
  return (
    <aside className="hidden w-[380px] shrink-0 flex-col border-r border-border bg-canvas lg:flex">
      <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-border px-4 text-[13px]">
        <button
          onClick={() => setMode("list")}
          className={cn("hover:text-bone", mode === "list" ? "text-bone" : "text-fog")}
        >
          Portofoliu
        </button>
        {mode === "case" && (
          <>
            <ChevronRight className="size-3.5 text-smoke" />
            <span className="truncate text-bone">{name}</span>
          </>
        )}
      </div>
      {mode === "list" ? (
        <PortfolioList
          households={households}
          selected={selected}
          onSelect={(id) => (onSelect(id), setMode("case"))}
        />
      ) : detail ? (
        <CaseFile key={selected} d={detail} nb={nb} grid={grid} slot={slot} />
      ) : (
        <div className="space-y-3 p-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      )}
    </aside>
  );
}

function CaseFile({
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
  const [msg, setMsg] = useState<TelegramResult | null>(null);
  const [sending, setSending] = useState(false);

  const sendAlert = async () => {
    setSending(true);
    try {
      const r = await api.telegram(a.household_id);
      setMsg(r);
      toast(r.simulated ? "Alertă Telegram simulată" : "Alertă Telegram trimisă", {
        description: `Chat ${r.chat_id}`,
      });
    } finally {
      setSending(false);
    }
  };

  const answers = [
    {
      q: "Rețeaua sau instalația?",
      s: g.status,
      h: headline(g, g.verdict_text_ro),
      facts: [
        ["Contor (PCC)", `${fmt(g.max_meter_voltage_v, 1)} V`],
        ["Cablu intern", `+${fmt(g.voltage_rise_internal_cable_v, 1)} V`],
        ["Vecini afectați", `${g.neighbors_affected_simultaneously}/${g.neighbors_total}`],
        ["Opriri azi", `${g.trip_minutes} min`],
      ],
    },
    {
      q: "Bateria ajunge la vârful de seară?",
      s: b.status,
      h: b.battery_kwh ? headline(b, b.verdict_text_ro) : "Gospodăria nu are baterie.",
      facts: b.battery_kwh
        ? [
            ["Rezervă SoC", `${b.configured_min_soc_pct}% → ${b.desired_min_soc_pct}%`],
            ["Blocat", `${fmt(b.locked_kwh, 1)} kWh`],
            ["PZU seară", `${fmt(b.pzu_evening_ron_mwh)} RON/MWh`],
            ["Pierdere furnizor", `${fmt(b.monthly_pzu_loss_ron, 2)} RON/lună`],
          ]
        : [],
    },
    {
      q: "Factura e corectă?",
      s: f.status,
      h: headline(f, f.verdict_text_ro),
      facts: [
        [
          "Export contor / facturat",
          `${fmt(f.meter_export_kwh)} / ${fmt(f.billed_export_kwh)} kWh`,
        ],
        ["Facturat", `${fmt(f.billed_ron, 2)} RON`],
        ["Corect", `${fmt(f.verified_ron, 2)} RON`],
        ["Diferență", `${fmt(f.delta_ron, 2)} RON`],
      ],
    },
  ];

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="num text-[11px] text-fog">{a.household_id}</span>
          <span className="text-[11px] text-smoke">·</span>
          <span className="text-[11px] text-fog">{a.city}</span>
          <SeverityTag s={a.overall_severity} />
        </div>
        <h1 className="font-display text-[22px] leading-[1.25] text-bone">
          {a.one_line_triage_ro}
        </h1>
        <p className="mt-2 text-[12px] text-fog">
          {a.street_address} · {fmt(a.installed_pv_kw, 1)} kWp {a.inverter_brand} · răspunde:{" "}
          <span className="text-bone">
            {responsibleLabel[a.primary_responsible_party] ?? a.primary_responsible_party}
          </span>
        </p>
      </div>

      {d.scenario.customer_question_ro && (
        <blockquote className="border-l border-iron pl-3 font-display text-[14px] italic leading-relaxed text-fog">
          „{d.scenario.customer_question_ro}”
        </blockquote>
      )}

      {grid && <NeighborStrip houses={grid.houses} clientId={a.household_id} slot={slot} />}

      <ol className="space-y-4">
        {answers.map((x, i) => (
          <li key={x.q} className="border-t border-border pt-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="eyebrow">
                <span className="num mr-1.5 text-bone">{i + 1}</span>
                {x.q}
              </span>
              <SeverityTag s={x.s} />
            </div>
            <p className="text-[13.5px] leading-relaxed text-bone">{x.h}</p>
            {x.facts.length > 0 && (
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {x.facts.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline justify-between gap-2 border-b border-border/70 py-0.5"
                  >
                    <dt className="text-[11.5px] text-fog">{k}</dt>
                    <dd className="num text-[11.5px] text-bone">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ol>

      <div className="border-t border-border pt-3">
        <div className="eyebrow mb-1.5">Acțiuni</div>
        <Action onClick={() => api.openPdfDossier(a.household_id)}>
          Generează dosarul PDF pentru {nb ? nb.transformer_id : "distribuitor"}
        </Action>
        <Action onClick={sendAlert} disabled={sending}>
          {sending ? "Se trimite alerta…" : "Trimite alerta Telegram tehnicianului O&M"}
        </Action>
        <Action to="/triaj" household={a.household_id}>
          Deschide diagnosticul complet (grafice, simulator baterie, scut AI)
        </Action>
        <Action to="/prosumator" household={a.household_id}>
          Ce vede clientul în aplicație
        </Action>
        {msg && (
          <pre className="num mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[4px] border border-iron bg-obsidian p-2.5 text-[11px] leading-relaxed text-fog">
            {plainText(msg.message_text)}
          </pre>
        )}
      </div>
    </div>
  );
}

function Action({
  children,
  onClick,
  disabled,
  to,
  household,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  to?: "/triaj" | "/prosumator";
  household?: string;
}) {
  const cls =
    "group flex w-full items-start gap-2 rounded-[4px] px-1.5 py-1.5 text-left text-[13px] text-bone transition-colors hover:bg-slate disabled:opacity-50";
  const inner = (
    <>
      <CornerDownLeft className="mt-0.5 size-3.5 shrink-0 text-smoke group-hover:text-voltage" />
      <span>{children}</span>
    </>
  );
  return to ? (
    <Link to={to} search={{ household: household! }} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}
