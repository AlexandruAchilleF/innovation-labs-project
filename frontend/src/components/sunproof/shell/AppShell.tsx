import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProsumerHeader } from "./ProsumerHeader";
import { SUPPLIER_VIEWS, SupplierTopBar, useCurrentHousehold } from "./SupplierTopBar";

const PUBLIC_PATHS = new Set(["/", "/termeni", "/confidentialitate", "/cookies"]);

/**
 * Three surfaces, three shells: the landing & legal pages are full-bleed, the prosumer app gets a plain
 * homeowner header, and the supplier portal gets the top bar with tickets and navigation.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (PUBLIC_PATHS.has(path)) {
    return <TooltipProvider delayDuration={150}>{children}</TooltipProvider>;
  }
  const prosumer = path.startsWith("/prosumator");
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        {prosumer ? <ProsumerHeader /> : <SupplierTopBar />}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {!prosumer && <BottomNav />}
      </div>
    </TooltipProvider>
  );
}

function BottomNav() {
  const household = useCurrentHousehold();
  return (
    <nav
      aria-label="Navigare mobilă"
      className="grid h-14 shrink-0 grid-cols-2 gap-1 border-t border-border bg-obsidian px-2 py-1 md:hidden"
    >
      {SUPPLIER_VIEWS.map(({ to, shortLabel, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          search={{ household }}
          className="flex flex-col items-center justify-center gap-1 rounded-[4px] border border-transparent py-1 text-[11px] text-fog transition-colors hover:bg-slate hover:text-bone"
          activeProps={{ className: "!border-iron bg-slate !text-bone" }}
        >
          <Icon className="size-4" strokeWidth={1.5} />
          <span>{shortLabel}</span>
        </Link>
      ))}
    </nav>
  );
}
