import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  BatteryWarning,
  Building2,
  Cable,
  CircleCheck,
  ChevronRight,
  FileDown,
  ReceiptText,
  Send,
  Smartphone,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { supplierCase, type CaseKind } from "@/lib/case-summary";
import { fmt } from "@/lib/format";
import { responsibleLabel } from "@/lib/i18n";
import { resolveOpenTicketsFor } from "@/lib/tickets";
import type { GridState, HouseholdDetail, Neighborhood, ResponsibleParty } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertConfirm } from "../AlertConfirm";
import { ActionButton, type Action } from "./CaseActions";
import { CaseProof } from "./CaseProof";
import { CaseVerdicts } from "./CaseVerdicts";
import { ClientTicketBox } from "./ClientTicketBox";
import { NeighborStrip } from "./NeighborStrip";
import { SeverityTag, sevText } from "./SeverityTag";

const KIND_ICON: Record<CaseKind, ReactNode> = {
  grid: <Zap />,
  local: <Cable />,
  battery: <BatteryWarning />,
  billing: <ReceiptText />,
  billing_ok: <CircleCheck />,
  healthy: <CircleCheck />,
};
const PARTY_ICON: Record<ResponsibleParty, ReactNode> = {
  DISTRIBUTION_OPERATOR: <Building2 />,
  INSTALLER: <Wrench />,
  CUSTOMER_SETTING: <Smartphone />,
  SUPPLIER_BILLING: <ReceiptText />,
  NONE: <CircleCheck />,
};

/**
 * Selected client, conclusion first: the main problem and who acts, its proof drawn from the engine
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
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-iron [&_svg]:size-4",
              sevText[a.overall_severity],
            )}
          >
            {KIND_ICON[sc.kind]}
          </span>
          <div className="min-w-0">
            <h2 id="main-problem" className="text-[15px] font-medium leading-snug text-bone">
              {sc.title}
            </h2>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-fog [&_svg]:size-3.5">
              {PARTY_ICON[party]}
              <span className={party === "NONE" ? "text-fog" : "text-bone"}>
                {party === "NONE" ? "Nicio acțiune necesară" : responsibleLabel[party]}
              </span>
            </p>
          </div>
        </div>

        {sc.lossRon !== null && (
          <p className="flex items-baseline justify-between gap-3 border-y border-border py-2.5">
            <span className="text-[12px] text-fog">Pierdere</span>
            <span className={cn("num text-[22px] leading-none", sevText[a.overall_severity])}>
              {fmt(sc.lossRon)}
              <span className="text-[12px] text-fog"> RON/lună</span>
            </span>
          </p>
        )}

        <CaseProof d={d} kind={sc.kind} />

        {primary && <ActionButton a={primary} household={a.household_id} primary />}
      </section>

      {secondary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {secondary.map((x) => (
            <ActionButton key={x.id} a={x} household={a.household_id} />
          ))}
        </div>
      )}

      <CaseVerdicts d={d} />

      {showStreet && grid && (
        <NeighborStrip houses={grid.houses} clientId={a.household_id} slot={slot} />
      )}

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
