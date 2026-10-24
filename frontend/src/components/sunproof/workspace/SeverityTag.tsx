import { severityLabel } from "@/lib/i18n";
import type { Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

export const sevText: Record<Severity, string> = {
  CRITICAL: "text-critical",
  WARNING: "text-warning",
  OK: "text-fog",
  INFO: "text-bone",
};

export function SeverityTag({ s }: { s: Severity }) {
  return (
    <span className={cn("eyebrow rounded-[4px] border border-iron px-1.5 py-0.5", sevText[s])}>
      {severityLabel[s]}
    </span>
  );
}
