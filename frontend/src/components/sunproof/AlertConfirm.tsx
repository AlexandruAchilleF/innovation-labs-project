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
import { plainText } from "@/lib/format";
import { technicianAlertText } from "@/lib/technician-alert";
import type { HouseholdDetail } from "@/lib/types";

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
  const hydrated = useHydrated();
  const mode = useApiMode();
  const isDemo = hydrated && mode !== "live";
  const [sending, setSending] = useState(false);
  const [sentByHouse, setSentByHouse] = useState<Record<string, string>>({});

  const defaultPreview = technicianAlertText(d);

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
        <div className="max-h-[55vh] space-y-5 overflow-y-auto break-words rounded-[4px] border border-border bg-obsidian p-5 text-[13px] leading-6 text-bone">
          {preview.split(/\n\s*\n/).map((block, index) => {
            const [title, ...lines] = block.split("\n");
            return (
              <section key={index}>
                <h3 className="mb-1 font-medium">{title}</h3>
                <p className="whitespace-pre-wrap text-fog">{lines.join("\n")}</p>
              </section>
            );
          })}
        </div>
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
