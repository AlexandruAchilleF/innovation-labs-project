import { Link, useHydrated, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

const TABS: { tab?: ProsumerTab; label: string }[] = [
  { label: "Azi" },
  { tab: "zile", label: "Pe zile" },
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
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-canvas px-4 sm:px-6">
      <Link
        to="/"
        className="font-display text-[18px] text-bone"
        aria-label="SunProof — prezentare"
      >
        SunProof
      </Link>
      <nav aria-label="Aplicația prosumatorului" className="flex h-full items-stretch gap-5">
        {TABS.map(({ tab, label }) => (
          <Link
            key={label}
            to="/prosumator"
            search={{ household, tab }}
            aria-current={current === tab ? "page" : undefined}
            className={cn(
              "flex items-center border-b text-[14px] transition-colors",
              current === tab
                ? "border-bone text-bone"
                : "border-transparent text-fog hover:text-bone",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <span className="hidden text-[13px] text-fog sm:inline">Contul tău:</span>
        <Select
          value={household}
          onValueChange={(v) =>
            void navigate({ to: "/prosumator", search: { household: v, tab: current } })
          }
        >
          <SelectTrigger
            aria-label="Alege contul de prosumator"
            className="h-8 w-56 border-iron bg-graphite text-[13px] sm:w-64"
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
