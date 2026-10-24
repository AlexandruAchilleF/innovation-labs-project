import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Slider } from "@/components/ui/slider";
import { extrapolate } from "@/lib/sim";
import { useQuery } from "@tanstack/react-query";
import { Activity, Network, Sun, UserRound } from "lucide-react";
import { useApiMode } from "@/lib/api";
import { fmt } from "@/lib/format";
import { portfolioQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

const views = [
  { to: "/triaj" as const, search: { household: "RO-TM-001" }, label: "Triaj Portofoliu", icon: Activity },
  { to: "/retea" as const, search: { n: "NB-DUMBRAVITA" }, label: "Rețea JT & Cartiere", icon: Network },
  { to: "/prosumator" as const, search: { household: "RO-B-005" }, label: "Aplicația Prosumatorului", icon: UserRound },
];

export function AppHeader() {
  const mode = useApiMode();
  const p = useQuery(portfolioQuery());
  const m = p.data?.metrics;
  const [n, setN] = useState(25000);
  const ex = extrapolate(n);
  const ticker: [string, string, string?][] = m
    ? [
        ["Monitorizate", `${m.monitored_households_count}`],
        ["Defecte rețea OD", `${m.grid_fault_households_count}`, "text-critical"],
        ["Instalație locală", `${m.local_fault_households_count}`, "text-warning"],
        ["Baterii blocate", `${m.misconfigured_Batteries_count}`, "text-warning"],
        ["Erori facturare", `${m.invoice_issues_count}`, "text-critical"],
        ["Economii PZU", `${fmt(m.fleet_monthly_pzu_savings_ron, 1)} RON/lună`, "text-success"],
        ["Sesizări ANRE prevenite", `${m.fleet_anre_complaints_prevented}`, "text-sky"],
      ]
    : [];
  return (
    <header className="sticky top-0 z-30">
      <div className="border-b border-ink-line bg-ink text-ink-foreground">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-5 px-5">
          <Link to="/triaj" search={{ household: "RO-TM-001" }} className="flex items-center gap-2.5">
            <span className="glow-sun flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sun to-success text-ink">
              <Sun className="size-4.5" strokeWidth={2.5} />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">SunProof</span>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-muted">Grid Command Center</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-ink-line bg-ink-2 p-1">
            {views.map(({ to, search, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                search={search as never}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink-foreground"
                activeProps={{ className: "bg-ink-foreground !text-ink" }}
              >
                <Icon className="size-3.5" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[11px] text-ink-muted xl:inline">ANRE · Legea 160/2026</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                mode === "live" ? "border-success/40 bg-success/15 text-success" : "border-sun/40 bg-sun/10 text-sun",
              )}
            >
              <span className={cn("size-1.5 animate-pulse rounded-full", mode === "live" ? "bg-success" : "bg-sun")} />
              {mode === "live" ? "Live FastAPI Engine" : mode === "demo" ? "Demo Preview Mode" : "Se conectează…"}
            </span>
          </div>
        </div>
      </div>
      <div className="h-11 border-b border-ink-line bg-ink-2 text-ink-muted">
        <div className="mx-auto flex h-full max-w-[1800px] items-center gap-6 px-5 text-[12px]">
          <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-success" /> Flotă live
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden [mask-image:linear-gradient(90deg,black_90%,transparent)]">
            {ticker.map(([l, v, c]) => (
              <span key={l} className="flex shrink-0 items-baseline gap-1.5">
                {l}
                <span className={cn("num font-semibold text-ink-foreground", c)}>{v}</span>
              </span>
            ))}
          </div>
          <div className="ink-scope flex shrink-0 items-center gap-3 rounded-full border border-ink-line bg-ink px-3 py-1">
            <span className="num text-ink-foreground">{fmt(n)}</span>
            <span className="hidden text-ink-muted lg:inline">prosumatori</span>
            <Slider className="w-28" min={5000} max={50000} step={1000} value={[n]} onValueChange={(v) => setN(v[0] ?? 25000)} aria-label="Extrapolare prosumatori" />
            <span className="num font-semibold text-sun">→ {fmt(ex.annual_eur / 1_000_000, 2)} mil. EUR/an</span>
            <span className="num hidden text-ink-muted lg:inline">· {fmt(ex.mwh_year)} MWh/an</span>
          </div>
        </div>
      </div>
    </header>
  );
}
