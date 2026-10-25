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

export const sevDot: Record<Severity, string> = {
  CRITICAL: "bg-critical",
  WARNING: "bg-warning",
  OK: "bg-success",
  INFO: "bg-info",
};

/** Traffic-light status: red = critical, yellow = warning, green = everything else. */
const statusDot: Record<Severity, string> = {
  CRITICAL: "bg-critical",
  WARNING: "bg-warning",
  OK: "bg-success",
  INFO: "bg-success",
};

export function StatusDot({ s }: { s: Severity }) {
  return (
    <span
      role="img"
      aria-label={severityLabel[s]}
      title={severityLabel[s]}
      className={cn("size-2 shrink-0 rounded-full", statusDot[s])}
    />
  );
}
