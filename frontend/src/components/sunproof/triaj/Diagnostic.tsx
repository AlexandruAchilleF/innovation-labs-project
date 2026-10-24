import { useState } from "react";
import { FileDown, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import { responsibleLabel } from "@/lib/i18n";
import type { HouseholdDetail, MinutePoint, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertConfirm } from "../AlertConfirm";
import { DisclosureChevron, Row, StatusBadge, axisProps, chartTooltipStyle } from "../primitives";

export function TriageHeader({ d }: { d: HouseholdDetail }) {
  const a = d.analysis;
  const [alertOpen, setAlertOpen] = useState(false);
  const meta: [string, string][] = [
    ["POD", a.pod_code],
    ["PT", a.transformer_id],
    ["Invertor", `${a.inverter_brand} ${a.inverter_model}`],
    ["kWp", fmt(a.installed_pv_kw, 1)],
    ["Fază", a.phase],
    ["Responsabil", responsibleLabel[a.primary_responsible_party] ?? a.primary_responsible_party],
  ];
  return (
    <header className="border-b border-border pb-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-[24px] leading-tight text-bone">{a.customer_name}</h1>
            <span className="num text-[12px] text-fog">
              {a.household_id} · {a.city}
            </span>
            <StatusBadge severity={a.overall_severity} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="max-w-[70ch] text-[14px] leading-relaxed text-bone">
              {a.one_line_triage_ro}
            </p>
            {a.grid_verdict.trip_minutes > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-bone bg-transparent text-bone hover:bg-slate"
                  onClick={() => {
                    api.openPdfDossier(a.household_id);
                    toast(`Dosar generat · ${a.transformer_id}`);
                  }}
                >
                  <FileDown /> Dosar PDF pentru distribuitor
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-iron bg-transparent text-bone hover:bg-slate"
                  onClick={() => setAlertOpen(true)}
                >
                  <Send /> Alertă tehnician O&M
                </Button>
              </div>
            )}
          </div>
          <details className="group mt-2 text-[12px] text-fog">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1 hover:text-bone">
              Detalii instalație
              <DisclosureChevron />
            </summary>
            <p className="mt-2 max-w-[75ch] font-display text-[13px] italic">
              „{d.scenario.customer_question_ro}”
            </p>
            <p className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              {meta.map(([k, v]) => (
                <span key={k}>
                  {k} <span className="text-bone">{v}</span>
                </span>
              ))}
            </p>
          </details>
        </div>
        <dl className="flex shrink-0 gap-6 sm:text-right">
          {(
            [
              ["Câștig furnizor", a.total_supplier_monthly_benefit_ron],
              ["Câștig client", a.total_customer_monthly_benefit_ron],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11.5px] text-fog">{k}</dt>
              <dd className="num mt-0.5 text-[22px] leading-none text-bone">
                {v > 0 ? "+" : ""}
                {fmt(v)}
                <span className="text-[11px] text-fog"> RON/lună</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <AlertConfirm d={d} open={alertOpen} onOpenChange={setAlertOpen} />
    </header>
  );
}
