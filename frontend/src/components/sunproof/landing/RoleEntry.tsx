import { useState, type ReactNode } from "react";
import { Link, useHydrated, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { portfolioQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Demo prosumer accounts: the five flagship stories, each one problem. */
export const PROSUMER_ACCOUNTS: [id: string, story: string][] = [
  ["RO-TM-001", "Supratensiune în rețeaua OD"],
  ["RO-IF-002", "Cablu local subdimensionat"],
  ["RO-CJ-003", "SoC minim configurat eronat"],
  ["RO-BV-004", "Index de export nefacturat"],
  ["RO-B-005", "Factură conformă"],
];

export const SUPPLIER_ENTRY = { to: "/harta" as const, search: { household: "RO-TM-001" } };

const solid =
  "inline-flex items-center justify-center gap-2 rounded-[4px] border border-bone bg-bone font-medium text-obsidian transition-colors hover:bg-bone/85";
const ghost =
  "inline-flex items-center justify-center gap-2 rounded-[4px] border border-bone font-medium text-bone transition-colors hover:bg-slate";
const text =
  "inline-flex items-center justify-center gap-1.5 font-medium text-fog transition-colors hover:text-bone";
const looks = { solid, ghost, text };
const sizes = { sm: "h-10 px-4 text-[13px]", lg: "h-11 px-6 text-[14px]" };
/** Solid in the page body, ghost in the nav by default; `text` is the quiet secondary action. */
const look = (size: Size, variant: Variant | undefined, className?: string) =>
  cn(
    looks[variant ?? (size === "lg" ? "solid" : "ghost")],
    variant === "text" ? "h-11 px-1 text-[14px]" : sizes[size],
    className,
  );

type Size = "sm" | "lg";
type Variant = keyof typeof looks;
type EntryProps = { size: Size; variant?: Variant; className?: string; children?: ReactNode };

export function SupplierEntry({ size, variant, className, children = "Furnizor" }: EntryProps) {
  return (
    <Link {...SUPPLIER_ENTRY} className={look(size, variant, className)}>
      {children}
    </Link>
  );
}

/** Prosumer entry: a quick account picker, since every demo account tells a different story. */
export function ProsumerEntry({ size, variant, className, children = "Prosumator" }: EntryProps) {
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
      <PopoverTrigger className={look(size, variant, className)}>{children}</PopoverTrigger>
      <PopoverContent
        align={size === "sm" ? "end" : "start"}
        aria-label="Conturi demonstrative de prosumator"
        className="w-[min(320px,calc(100vw-32px))] border-iron bg-slate p-0"
      >
        <div className="border-b border-iron px-4 py-3 text-[13px] font-medium text-bone">
          Cont demonstrativ
        </div>
        <ul className="divide-y divide-iron">
          {PROSUMER_ACCOUNTS.map(([id, story]) => (
            <li key={id}>
              <button
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/prosumator", search: { household: id } });
                }}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-iron"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-bone">{story}</span>
                  <span className="block truncate text-[12px] text-fog">{who(id)}</span>
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
