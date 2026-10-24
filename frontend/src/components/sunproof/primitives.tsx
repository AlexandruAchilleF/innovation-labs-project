import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { severityLabel } from "@/lib/i18n";
import type { Severity } from "@/lib/types";

// Altitude badges: no fill, status carried by text tone + a hairline border
const sevClass: Record<Severity, string> = {
  CRITICAL: "text-critical border-critical-border",
  WARNING: "text-warning border-warning-border",
  OK: "text-fog border-iron",
  INFO: "text-bone border-iron",
};
const dotClass: Record<Severity, string> = {
  CRITICAL: "bg-critical",
  WARNING: "bg-warning",
  OK: "bg-success",
  INFO: "bg-info",
};

export function StatusBadge({
  severity,
  label,
  className,
}: {
  severity: Severity;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em]",
        sevClass[severity],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotClass[severity])} />
      {label ?? severityLabel[severity]}
    </span>
  );
}

/** Disclosure affordance for `<details className="group">` summaries; rotates when open. */
export function DisclosureChevron() {
  return (
    <ChevronRight className="size-3.5 shrink-0 text-smoke transition-transform group-open:rotate-90" />
  );
}

/** Card section: hairline border, plain title, optional right-side actions. */
export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-4", className)}>
      {title && (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-medium text-bone">{title}</h3>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Row({
  label,
  value,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: Severity | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-1.5 text-[13px] last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "num",
          tone === "CRITICAL" && "text-critical",
          tone === "WARNING" && "text-warning",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export const chartTooltipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    boxShadow: "0 4px 12px -4px color-mix(in oklab, var(--foreground) 15%, transparent)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: 11 },
};
export const axisProps = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" },
  stroke: "var(--border)",
  tickLine: false,
};
