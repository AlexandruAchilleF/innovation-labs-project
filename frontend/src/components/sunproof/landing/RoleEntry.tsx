import { useState, type ReactNode } from "react";
import { Link, useHydrated, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { portfolioQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Demo prosumer accounts: the five flagship stories, each one problem. */
export const PROSUMER_ACCOUNTS: [id: string, story: string][] = [
  ["RO-TM-001", "Supratensiune în rețea"],
  ["RO-IF-002", "Cablu local subdimensionat"],
  ["RO-CJ-003", "Baterie blocată seara"],
  ["RO-BV-004", "Index export lipsă pe factură"],
  ["RO-B-005", "Factură corectă, explicată"],
];

export const SUPPLIER_ENTRY = { to: "/harta" as const, search: { household: "RO-TM-001" } };

const solid =
  "inline-flex items-center justify-center gap-2 rounded-[4px] border border-bone bg-bone font-medium text-obsidian transition-colors hover:bg-bone/85";
const ghost =
  "inline-flex items-center justify-center gap-2 rounded-[4px] border border-bone font-medium text-bone transition-colors hover:bg-slate";
const sizes = { sm: "h-9 px-4 text-[13px]", lg: "h-11 px-6 text-[14px]" };

export function SupplierEntry({ size, children }: { size: "sm" | "lg"; children: ReactNode }) {
  return (
    <Link {...SUPPLIER_ENTRY} className={cn(size === "lg" ? solid : ghost, sizes[size])}>
      {children}
    </Link>
  );
}

/** Prosumer entry: a quick account picker, since every demo account tells a different story. */
export function ProsumerEntry({ size, children }: { size: "sm" | "lg"; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const households = useQuery(portfolioQuery()).data?.households;
  const who = (id: string) => {
    const h = hydrated ? households?.find((x) => x.household_id === id) : undefined;
    return h ? `${h.customer_name} · ${h.city}` : id;
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(ghost, sizes[size])}>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] border-iron bg-slate p-0">
        <div className="border-b border-iron px-4 py-3">
          <div className="text-[13px] font-medium text-bone">Alege un cont de prosumator</div>
          <p className="mt-0.5 text-[12px] text-fog">
            Conturi demonstrative, câte o problemă fiecare.
          </p>
        </div>
        <ul className="divide-y divide-iron">
          {PROSUMER_ACCOUNTS.map(([id, story]) => (
            <li key={id}>
              <button
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/prosumator", search: { household: id } });
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-iron"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-bone">{who(id)}</span>
                  <span className="block text-[12px] text-fog">{story}</span>
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-fog" />
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
