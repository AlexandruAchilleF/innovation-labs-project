import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Map as MapIcon, Smartphone, Sun } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { API_BASE, useApiMode } from "@/lib/api";
import { fmt } from "@/lib/format";
import { portfolioQuery } from "@/lib/queries";
import { extrapolate } from "@/lib/sim";
import { cn } from "@/lib/utils";

const views = [
  {
    to: "/harta" as const,
    search: { household: "RO-TM-001" },
    label: "Hartă rețea & congestie",
    icon: MapIcon,
  },
  {
    to: "/triaj" as const,
    search: { household: "RO-TM-001" },
    label: "Diagnostic complet",
    icon: ClipboardList,
  },
  {
    to: "/prosumator" as const,
    search: { household: "RO-B-005" },
    label: "Aplicația prosumatorului",
    icon: Smartphone,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Rail />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Rail() {
  const mode = useApiMode();
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-obsidian py-3">
      <Link
        to="/harta"
        search={{ household: "RO-TM-001" }}
        className="mb-3 flex size-9 items-center justify-center rounded-[4px] border border-iron text-bone"
        aria-label="SunProof"
      >
        <Sun className="size-4" strokeWidth={1.5} />
      </Link>
      {views.map(({ to, search, label, icon: Icon }) => (
        <Tooltip key={to}>
          <TooltipTrigger asChild>
            <Link
              to={to}
              search={search as never}
              aria-label={label}
              className="flex size-9 items-center justify-center rounded-[4px] border border-transparent text-fog transition-colors hover:bg-slate hover:text-bone"
              activeProps={{ className: "!border-iron bg-slate !text-bone" }}
            >
              <Icon className="size-[18px]" strokeWidth={1.5} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ))}
      <div className="mt-auto flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={mode === "live" ? `${API_BASE}/docs` : undefined}
              target="_blank"
              rel="noreferrer"
              className="flex size-9 items-center justify-center"
              aria-label="Stare conexiune"
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  mode === "live" ? "bg-voltage" : "bg-smoke",
                  mode === "unknown" && "animate-pulse",
                )}
              />
            </a>
          </TooltipTrigger>
          <TooltipContent side="right">
            {mode === "live"
              ? `Conectat la FastAPI (${API_BASE}) · deschide /docs`
              : mode === "demo"
                ? "Mod demonstrativ: backend indisponibil, date deterministe locale"
                : "Se conectează…"}
          </TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
}

function TopBar() {
  const mode = useApiMode();
  const m = useQuery(portfolioQuery()).data?.metrics;
  const [n, setN] = useState(25000);
  const ex = extrapolate(n);
  const ticker: [string, string, string?][] = m
    ? [
        ["Monitorizate", `${m.monitored_households_count}`],
        ["Rețea OD", `${m.grid_fault_households_count}`, "text-critical"],
        ["Instalație locală", `${m.local_fault_households_count}`, "text-warning"],
        ["Baterii blocate", `${m.misconfigured_Batteries_count}`, "text-warning"],
        ["Erori factură", `${m.invoice_issues_count}`, "text-critical"],
        ["Economii PZU", `${fmt(m.fleet_monthly_pzu_savings_ron, 0)} RON/lună`],
      ]
    : [];
  return (
    <header className="flex h-11 shrink-0 items-center gap-5 border-b border-border bg-canvas px-4">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[16px] text-bone">SunProof</span>
        <span className="eyebrow hidden !text-[10px] lg:inline">Prosumer & Grid Intelligence</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-5 overflow-hidden text-[12px] text-fog [mask-image:linear-gradient(90deg,black_92%,transparent)]">
        {ticker.map(([l, v, c]) => (
          <span key={l} className="flex shrink-0 items-baseline gap-1.5">
            {l}
            <span className={cn("num text-bone", c)}>{v}</span>
          </span>
        ))}
      </div>
      <Popover>
        <PopoverTrigger className="num hidden shrink-0 items-center gap-2 rounded-[4px] border border-iron px-2.5 py-1 text-[12px] text-bone transition-colors hover:bg-slate md:flex">
          {fmt(n)} prosumatori <span className="text-fog">→</span>{" "}
          {fmt(ex.annual_eur / 1_000_000, 2)} mil. EUR/an
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-3 border-iron bg-slate">
          <div className="eyebrow">Extrapolare la nivel de furnizor</div>
          <div className="num flex justify-between text-[13px]">
            <span>{fmt(n)} prosumatori</span>
            <span>{fmt(ex.mwh_year)} MWh/an</span>
          </div>
          <Slider
            min={5000}
            max={50000}
            step={1000}
            value={[n]}
            onValueChange={(v) => setN(v[0] ?? 25000)}
            aria-label="Extrapolare prosumatori"
          />
          <p className="text-[12px] text-fog">
            Economii PZU anuale estimate pentru furnizor, scalate liniar din flota monitorizată.
          </p>
        </PopoverContent>
      </Popover>
      <span className="flex shrink-0 items-center gap-1.5 rounded-[4px] border border-iron px-2 py-1 text-[11px] font-medium uppercase tracking-[0.05em] text-fog">
        <span
          className={cn("size-1.5 rounded-full", mode === "live" ? "bg-voltage" : "bg-smoke")}
        />
        {mode === "live" ? "Live" : mode === "demo" ? "Demo" : "…"}
      </span>
    </header>
  );
}
