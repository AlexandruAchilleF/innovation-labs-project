import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { FileDown, ReceiptText, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { resolveOpenTicketsFor } from "@/lib/tickets";
import type { HouseholdDetail, ResponsibleParty } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertConfirm } from "../AlertConfirm";

export interface Action {
  id: string;
  icon: ReactNode;
  label: string;
  short?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string | undefined;
  to?: "/triaj" | "/prosumator";
}

/** Case action: `primary` is the single filled action chosen by who must act; the rest stay ghost. */
export function ActionButton({
  a,
  household,
  primary,
}: {
  a: Action;
  household: string;
  primary?: boolean;
}) {
  const cls = cn(
    "flex items-center gap-2 rounded-[4px] border px-3 text-[12.5px] transition-colors disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
    primary
      ? "h-9 border-bone bg-bone font-medium text-obsidian hover:bg-bone/85 [&_svg]:text-obsidian"
      : "h-8 border-iron text-bone hover:bg-slate [&_svg]:text-fog",
  );
  const body = (
    <>
      {a.icon}
      <span className="truncate">{a.label}</span>
    </>
  );
  return a.to ? (
    <Link to={a.to} search={{ household }} className={cls}>
      {body}
    </Link>
  ) : (
    <button onClick={a.onClick} disabled={a.disabled} title={a.title} className={cls}>
      {body}
    </button>
  );
}

/**
 * The case actions in one place, so the summary and the detail sections offer the same buttons.
 * `primary` is chosen by who must act; `dialog` must be rendered once by the caller.
 */
export function useCaseActions(d: HouseholdDetail) {
  const a = d.analysis;
  const [alertOpen, setAlertOpen] = useState(false);
  const dossier: Action = {
    id: "pdf",
    icon: <FileDown />,
    label: "Descarcă dosarul tehnic pentru OD",
    onClick: () => {
      api.openPdfDossier(a.household_id);
      resolveOpenTicketsFor(a.household_id, "Dosar tehnic generat pentru OD");
      toast(`Dosar generat · ${a.transformer_id}`);
    },
    title: `Dosar tehnic OD · ${a.transformer_id}`,
  };
  const alert: Action = {
    id: "alert",
    icon: <Send />,
    label: "Alocă intervenție O&M (Telegram)",
    onClick: () => setAlertOpen(true),
  };
  const guide: Action = {
    id: "guide",
    icon: <Smartphone />,
    label: "Ghid de reconfigurare pentru client",
    to: "/prosumator",
  };
  const bill: Action = {
    id: "bill",
    icon: <ReceiptText />,
    label: "Emite factura de corecție",
    to: "/triaj",
  };
  const byParty: Partial<Record<ResponsibleParty, Action>> = {
    DISTRIBUTION_OPERATOR: dossier,
    INSTALLER: alert,
    CUSTOMER_SETTING: guide,
    SUPPLIER_BILLING: bill,
  };
  const dialog = (
    <AlertConfirm
      d={d}
      open={alertOpen}
      onOpenChange={setAlertOpen}
      onSent={() => resolveOpenTicketsFor(a.household_id, "Tehnician O&M alertat prin Telegram")}
    />
  );
  return {
    dossier,
    alert,
    guide,
    bill,
    primary: byParty[a.primary_responsible_party] ?? null,
    dialog,
  };
}
