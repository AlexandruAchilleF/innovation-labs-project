import { useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, useApiMode } from "@/lib/api";
import { fmt, plainText } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";

const headline = (o: object, fallback: string) =>
  (o as { headline_ro?: string }).headline_ro || fallback;

export function AlertConfirm({
  d,
  open,
  onOpenChange,
  onSent,
}: {
  d: HouseholdDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: (text: string) => void;
}) {
  const a = d.analysis;
  const g = a.grid_verdict;
  const hydrated = useHydrated();
  const mode = useApiMode();
  const isDemo = hydrated && mode !== "live";
  const [sending, setSending] = useState(false);
  const [sentByHouse, setSentByHouse] = useState<Record<string, string>>({});

  const verdictHeadline = headline(g, g.verdict_text_ro || a.one_line_triage_ro);
  const defaultPreview = [
    `⚡ SunProof · Alertă O&M — ${a.household_id}`,
    `Client: ${a.customer_name}, ${a.street_address}`,
    `Invertor: ${a.inverter_brand} ${a.inverter_model} · ${fmt(a.installed_pv_kw, 1)} kWp · ${a.phase}`,
    ``,
    `Diagnostic: ${a.one_line_triage_ro}`,
    `Verdict: ${verdictHeadline}`,
    ``,
    `Tensiune contor (PCC): ${fmt(g.max_meter_voltage_v, 1)} V`,
    `Tensiune invertor: ${fmt(g.max_inverter_voltage_v, 1)} V`,
    `Creștere pe cablu intern: +${fmt(g.voltage_rise_internal_cable_v, 1)} V (${fmt(g.cable_mm2, 1)} mm² × ${g.cable_length_m} m)`,
    `Prag invertor: ${g.inverter_threshold_v} V (legal: ${g.legal_limit_v} V)`,
    `Echipamente declanșate: ${g.neighbors_affected_simultaneously}/${g.neighbors_total}`,
  ].join("\n");

  const preview = sentByHouse[a.household_id] ?? defaultPreview;

  const sendAlert = async () => {
    setSending(true);
    try {
      const r = await api.telegram(a.household_id);
      const text = plainText(r.message_text);
      setSentByHouse((prev) => ({ ...prev, [a.household_id]: text }));
      onSent?.(text);
      onOpenChange(false);
      toast(r.simulated ? "Alertă Telegram simulată" : "Alertă Telegram trimisă");
    } catch {
      toast.error("Alerta nu a putut fi trimisă", {
        action: { label: "Reîncearcă", onClick: () => void sendAlert() },
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border bg-card text-bone">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle className="text-[15px] font-medium text-bone">
              Alertă tehnician O&M
            </DialogTitle>
            {isDemo && (
              <span className="rounded-[4px] border border-iron px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em] text-fog">
                simulat
              </span>
            )}
          </div>
          <DialogDescription className="text-[12px] text-fog">
            Destinatar: <span className="text-bone">tehnician O&M</span> ·{" "}
            <span className="num">{a.household_id}</span> ({a.customer_name})
          </DialogDescription>
        </DialogHeader>
        <pre className="num max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-[4px] border border-border bg-obsidian p-3 text-[12px] leading-relaxed text-bone">
          {preview}
        </pre>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-iron bg-transparent text-bone hover:bg-slate"
            onClick={() => onOpenChange(false)}
          >
            Anulează
          </Button>
          <Button
            type="button"
            size="sm"
            className="border-bone bg-bone font-medium text-obsidian hover:bg-bone/85"
            onClick={() => void sendAlert()}
            disabled={sending}
          >
            <Send className="size-3.5" />
            {sending ? "Se trimite…" : "Trimite tehnicianului"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
