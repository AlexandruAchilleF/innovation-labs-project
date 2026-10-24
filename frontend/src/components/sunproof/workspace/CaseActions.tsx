import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

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
