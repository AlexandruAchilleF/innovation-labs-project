import { Link, useHydrated, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { portfolioQuery } from "@/lib/queries";
import { useCurrentHousehold } from "./SupplierTopBar";

/** Homeowner header: wordmark, account switcher (demo flagships) and a discreet portal switch. */
export function ProsumerHeader() {
  const household = useCurrentHousehold();
  const navigate = useNavigate();
  const hydrated = useHydrated();
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
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden text-[13px] text-fog sm:inline">Contul tău:</span>
        <Select
          value={household}
          onValueChange={(v) => void navigate({ to: "/prosumator", search: { household: v } })}
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
      <Link
        to="/harta"
        search={{ household }}
        className="ml-auto hidden items-center gap-1 text-[12.5px] text-fog transition-colors hover:text-bone sm:flex"
      >
        Comută la Portalul Furnizorului <ArrowRight className="size-3.5" strokeWidth={1.5} />
      </Link>
    </header>
  );
}
