import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileDown, ReceiptText, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { supplierCase } from "@/lib/case-summary";
import { fmt } from "@/lib/format";
import { responsibleLabel } from "@/lib/i18n";
import { resolveOpenTicketsFor } from "@/lib/tickets";
import type { GridState, HouseholdDetail, Neighborhood } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertConfirm } from "../AlertConfirm";
import { ActionButton, type Action } from "./CaseActions";
import { CaseVerdicts } from "./CaseVerdicts";
import { ClientTicketBox } from "./ClientTicketBox";
import { NeighborStrip } from "./NeighborStrip";
import { SeverityTag } from "./SeverityTag";

/**
 * Selected client, conclusion first: the main problem and who acts, its proof in three engine
 * numbers, then one primary action chosen by who must act. Everything else is folded away.
 */
export function CaseFile({
  d,
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
  const sc = supplierCase(d);
  const [sentByHouse, setSentByHouse] = useState<Record<string, string>>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const sent = sentByHouse[a.household_id] ?? null;

  const party = a.primary_responsible_party;
  const dossier: Action = {
    id: "pdf",
    icon: <FileDown />,
    label: "Descarcă Dosar PDF pt. Distribuitor",
    onClick: () => {
      api.openPdfDossier(a.household_id);
      resolveOpenTicketsFor(a.household_id, "Dosar PDF generat pentru distribuitor");
      toast(`Dosar generat · ${a.transformer_id}`);
    },
    title: `Dosar pentru distribuitor · ${a.transformer_id}`,
  };
  const alert: Action = {
    id: "alert",
    icon: <Send />,
    label: "Trimite Tehnician O&M (Telegram)",
    onClick: () => setAlertOpen(true),
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
              label: "Deschide ghidul de setare al clientului",
              to: "/prosumator",
            }
          : party === "SUPPLIER_BILLING"
            ? { id: "bill", icon: <ReceiptText />, label: "Corectează Factura", to: "/triaj" }
            : null;
  // dossier and technician alert are evidence of a grid trip; offer them only when one happened
  const secondary = g.trip_minutes > 0 ? [dossier, alert].filter((x) => x.id !== primary?.id) : [];
  const showStreet = sc.kind === "grid" || sc.kind === "local";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6 pt-4">
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-[22px] leading-tight text-bone">{a.customer_name}</h1>
          <SeverityTag s={a.overall_severity} />
        </div>
        <p className="mt-1 text-[12px] text-fog">
          <span className="num">{a.household_id}</span> · {a.city} · {fmt(a.installed_pv_kw, 1)} kWp
        </p>
      </header>

      <ClientTicketBox householdId={a.household_id} />

      <section
        aria-labelledby="main-problem"
        className="space-y-4 rounded-lg border border-iron bg-graphite p-4"
      >
        <div>
          <h2 id="main-problem" className="eyebrow text-fog">
            Problema principală & cine acționează
          </h2>
          <p className="mt-2 text-[16px] font-medium leading-snug text-bone">
            {sc.title}
            {sc.lossRon !== null && (
              <span className="text-fog">
                {" "}
                · Pierdere <span className="num text-bone">{fmt(sc.lossRon)} RON/lună</span>
              </span>
            )}
          </p>
          <p
            className={cn(
              "mt-2 inline-flex rounded-[4px] border px-2 py-0.5 text-[12px]",
              party === "NONE" ? "border-iron text-fog" : "border-bone text-bone",
            )}
          >
            Acționează: {responsibleLabel[party] ?? party}
          </p>
        </div>

        <div>
          <h3 className="eyebrow text-fog">Dovada în 3 cifre</h3>
          <dl className="mt-2 divide-y divide-border">
            {sc.proof.map((p) => (
              <div key={p.label} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="min-w-0">
                  <span className="block text-[13px] text-bone">{p.label}</span>
                  <span className="block text-[11.5px] text-fog">{p.note}</span>
                </dt>
                <dd className="num shrink-0 text-[16px] text-bone">{p.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {primary && (
          <div className="space-y-2">
            <h3 className="eyebrow text-fog">Acțiunea recomandată</h3>
            <ActionButton a={primary} household={a.household_id} primary />
          </div>
        )}
      </section>

      {secondary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {secondary.map((x) => (
            <ActionButton key={x.id} a={x} household={a.household_id} />
          ))}
        </div>
      )}

      {showStreet && grid && (
        <NeighborStrip houses={grid.houses} clientId={a.household_id} slot={slot} />
      )}

      <CaseVerdicts d={d} />

      <Link
        to="/triaj"
        search={{ household: a.household_id }}
        className="flex w-fit items-center gap-0.5 text-[12.5px] text-fog transition-colors hover:text-bone"
      >
        Analiză detaliată <ChevronRight className="size-3.5" />
      </Link>

      {sent && (
        <details className="text-[12px] text-fog">
          <summary className="cursor-pointer hover:text-bone">Mesajul trimis tehnicianului</summary>
          <pre className="num mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed">
            {sent}
          </pre>
        </details>
      )}
      <AlertConfirm
        d={d}
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onSent={(text) => {
          setSentByHouse((prev) => ({ ...prev, [a.household_id]: text }));
          resolveOpenTicketsFor(a.household_id, "Tehnician O&M alertat prin Telegram");
        }}
      />
    </div>
  );
}
