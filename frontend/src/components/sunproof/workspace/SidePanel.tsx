import type { ReactNode } from "react";
import { PanelLeftClose, PanelRightClose } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Collapsible workspace side panel (lg+). Closed, it shrinks to a labelled rail on the map edge;
 * the page keeps at most one panel open, so opening one closes the other.
 */
export function SidePanel({
  side,
  open,
  onOpen,
  onClose,
  width,
  title,
  meta,
  railIcon,
  railLabel,
  railExtra,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  width: string;
  title: ReactNode;
  meta?: ReactNode;
  railIcon: ReactNode;
  railLabel: string;
  railExtra?: ReactNode;
  children: ReactNode;
}) {
  const border = side === "left" ? "border-r" : "border-l";
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={false}
        aria-label={`Deschide ${railLabel}`}
        className={cn(
          "hidden w-11 shrink-0 flex-col items-center gap-3 border-border bg-canvas py-3 text-fog transition-colors hover:bg-graphite hover:text-bone lg:flex [&_svg]:size-4",
          border,
        )}
      >
        {railIcon}
        <span className="text-[12px] tracking-wide [writing-mode:vertical-rl] rotate-180">
          {railLabel}
        </span>
        {railExtra}
      </button>
    );
  }
  const Close = side === "left" ? PanelLeftClose : PanelRightClose;
  return (
    <aside
      className={cn("hidden shrink-0 flex-col border-border bg-canvas lg:flex", border, width)}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-4">
        <span className="min-w-0 flex-1 truncate text-[13px] text-bone">{title}</span>
        {meta}
        <button
          type="button"
          onClick={onClose}
          aria-expanded
          aria-label={`Închide ${railLabel}`}
          title="Închide panoul"
          className="-mr-1.5 rounded-[4px] p-1 text-fog transition-colors hover:bg-slate hover:text-bone"
        >
          <Close className="size-4" strokeWidth={1.5} />
        </button>
      </div>
      {children}
    </aside>
  );
}
