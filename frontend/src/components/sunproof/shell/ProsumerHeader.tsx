import { Link, useHydrated, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { portfolioQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useCurrentHousehold } from "./SupplierTopBar";

export type ProsumerTab = "zile";

const TABS: { tab?: ProsumerTab; label: string; icon: typeof Sun }[] = [
  { label: "Azi", icon: Sun },
  { tab: "zile", label: "Pe zile", icon: CalendarDays },
];

/** Homeowner header: wordmark and account switcher (demo flagships). No route into the supplier portal. */
export function ProsumerHeader() {
  const household = useCurrentHousehold();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const current = useRouterState({
    select: (s) => ((s.location.search as { tab?: unknown }).tab === "zile" ? "zile" : undefined),
  });
  const portfolio = useQuery(portfolioQuery());
  const accounts = hydrated ? (portfolio.data?.households.filter((h) => h.is_flagship) ?? []) : [];
  return (
    <header className="relative flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-canvas px-4 py-3 sm:px-6 md:h-16 md:flex-nowrap md:py-0">
      <Link
        to="/"
        className="font-display text-[18px] text-bone"
        aria-label="SunProof — prezentare"
      >
        SunProof
      </Link>
      <nav
        aria-label="Aplicația prosumatorului"
        className="order-last flex w-full rounded-[6px] border border-iron bg-obsidian p-1 md:absolute md:left-1/2 md:order-none md:w-auto md:-translate-x-1/2"
      >
        {TABS.map(({ tab, label, icon: Icon }) => (
          <Link
            key={label}
            to="/prosumator"
            search={{ household, tab }}
            aria-current={current === tab ? "page" : undefined}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-2 rounded-[4px] px-5 text-[14px] font-medium transition-colors md:flex-none",
              current === tab
                ? "bg-slate text-bone shadow-[inset_0_0_0_1px_var(--iron)]"
                : "text-fog hover:bg-graphite hover:text-bone",
            )}
          >
            <Icon className={cn("size-4", current === tab ? "text-sun" : "")} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <span className="hidden text-[13px] text-fog lg:inline">Contul tău:</span>
        <Select
          value={household}
          onValueChange={(v) =>
            void navigate({ to: "/prosumator", search: { household: v, tab: current } })
          }
        >
          <SelectTrigger
            aria-label="Alege contul de prosumator"
            className="h-8 w-52 border-iron bg-graphite text-[13px] lg:w-64"
          >
            <SelectValue placeholder="Alege gospodăria" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((h) => (
              <SelectItem key={h.household_id} value={h.household_id}>
                {h.customer_name} · {h.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
