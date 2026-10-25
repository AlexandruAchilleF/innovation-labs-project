import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeftRight, ClipboardList, Map as MapIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { API_BASE, useApiMode } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TicketsPopover } from "./TicketsPopover";

export const DEFAULT_HOUSEHOLD = "RO-TM-001";

export const SUPPLIER_VIEWS = [
  { to: "/harta" as const, label: "Hartă rețea JT", shortLabel: "Hartă", icon: MapIcon },
  { to: "/triaj" as const, label: "Analiză detaliată", shortLabel: "Analiză", icon: ClipboardList },
];

/** Household currently in the URL (`?household=`), so switching views keeps the same client. */
export function useCurrentHousehold(): string {
  return useRouterState({
    select: (s) => {
      const h = (s.location.search as { household?: unknown }).household;
      return typeof h === "string" ? h : DEFAULT_HOUSEHOLD;
    },
  });
}

export function SupplierTopBar() {
  const household = useCurrentHousehold();
  return (
    <header className="flex h-14 shrink-0 items-center gap-6 border-b border-border bg-canvas px-4 sm:px-6">
      <Link
        to="/"
        className="font-display text-[18px] text-bone"
        aria-label="SunProof — prezentare"
      >
        SunProof
      </Link>
      <nav aria-label="Portal furnizor" className="hidden h-full items-stretch gap-5 md:flex">
        {SUPPLIER_VIEWS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            search={{ household }}
            className="flex items-center border-b border-transparent text-[14px] text-fog transition-colors hover:text-bone"
            activeProps={{ className: "!border-bone !text-bone" }}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <TicketsPopover />
        <ApiModeBadge />
        <Link
          to="/prosumator"
          search={{ household }}
          className="hidden h-8 items-center gap-2 rounded-[4px] border border-iron px-3 text-[13px] text-bone transition-colors hover:bg-slate lg:flex"
        >
          <ArrowLeftRight className="size-3.5 text-fog" strokeWidth={1.5} />
          Schimbă rolul: Vezi ca Prosumator
        </Link>
      </div>
    </header>
  );
}

export function ApiModeBadge() {
  const mode = useApiMode();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={mode === "live" ? `${API_BASE}/docs` : undefined}
          target="_blank"
          rel="noreferrer"
          className="eyebrow flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-iron px-2 text-fog"
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              mode === "live" ? "bg-voltage" : "bg-smoke",
              mode === "unknown" && "animate-pulse",
            )}
          />
          {mode === "live" ? "Live" : mode === "demo" ? "Demo" : "…"}
        </a>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">
        {mode === "live"
          ? `Conectat la FastAPI (${API_BASE}) · deschide /docs`
          : mode === "demo"
            ? "Mod demonstrativ: backend indisponibil, date deterministe locale"
            : "Se conectează…"}
      </TooltipContent>
    </Tooltip>
  );
}
