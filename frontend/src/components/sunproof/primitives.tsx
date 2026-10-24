import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { severityLabel } from "@/lib/i18n";
import type { Severity } from "@/lib/types";

const sevClass: Record<Severity, string> = {
  CRITICAL: "bg-critical-soft text-critical border-critical-border",
  WARNING: "bg-warning-soft text-warning border-warning-border",
  OK: "bg-success-soft text-success border-success-border",
  INFO: "bg-info-soft text-info border-info-border",
};
const dotClass: Record<Severity, string> = {
  CRITICAL: "bg-critical",
  WARNING: "bg-warning",
  OK: "bg-success",
  INFO: "bg-info",
};

export function StatusBadge({ severity, label, className }: { severity: Severity; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", sevClass[severity], className)}>
      <span className={cn("size-1.5 rounded-full", dotClass[severity])} />
      {label ?? severityLabel[severity]}
    </span>
  );
}

export function severitySurface(s: Severity) {
  return sevClass[s];
}

export function Panel({ title, icon, actions, children, className, bodyClassName }: {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            {title}
          </h3>
          {actions}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("num", className)}>{children}</span>;
}

export function Row({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: Severity | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-1.5 text-[13px] last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("num font-medium", tone === "CRITICAL" && "text-critical", tone === "WARNING" && "text-warning", tone === "OK" && "text-success", tone === "INFO" && "text-info")}>
        {value}
      </span>
    </div>
  );
}

export function SectionLabel({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="num flex size-5 items-center justify-center rounded border border-border bg-card text-[10px]">{n}</span>
      {children}
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
  tick: { fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" },
  stroke: "var(--border)",
  tickLine: false,
};
