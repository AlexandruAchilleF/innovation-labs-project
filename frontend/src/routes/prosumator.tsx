import { useMemo, useState } from "react";
import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DiagnosisCard } from "@/components/sunproof/prosumator/DiagnosisCard";
import { DayCharts } from "@/components/sunproof/prosumator/DayCharts";
import { MonthCard } from "@/components/sunproof/prosumator/MonthCard";
import { EnergyScene } from "@/components/sunproof/prosumator/scene/EnergyScene";
import { TimeScrub } from "@/components/sunproof/prosumator/scene/TimeScrub";
import { clock, dayTotals, keyMinute, pointAt } from "@/lib/energy-day";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DaysView } from "@/components/sunproof/prosumator/days/DaysView";
import type { ProsumerTab } from "@/components/sunproof/shell/ProsumerHeader";
import { TicketForm } from "@/components/sunproof/prosumator/TicketForm";
import { householdQuery } from "@/lib/queries";
import type { HouseholdDetail, MinutePoint } from "@/lib/types";

export const Route = createFileRoute("/prosumator")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { household: string; tab?: ProsumerTab | undefined } => ({
    household: typeof s["household"] === "string" ? (s["household"] as string) : "RO-B-005",
    ...(s["tab"] === "zile" ? { tab: "zile" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Aplicația Prosumatorului — SunProof" },
      {
        name: "description",
        content:
          "Explicații simple pentru prosumatori: cât produci, de ce se oprește invertorul, ce faci cu bateria și dacă factura e corectă.",
      },
      { property: "og:title", content: "Aplicația Prosumatorului — SunProof" },
      {
        property: "og:description",
        content:
          "Explicații simple pentru prosumatori: cât produci, de ce se oprește invertorul, ce faci cu bateria și dacă factura e corectă.",
      },
    ],
  }),
  component: ProsumatorPage,
});

function ProsumatorPage() {
  const { household, tab } = Route.useSearch();
  const d = useQuery(householdQuery(household));
  // the shared query cache can resolve before hydration; render data only on the client
  const hydrated = useHydrated();
  const detail = hydrated ? d.data : undefined;

  return (
    <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      {detail ? (
        tab === "zile" ? (
          <DaysView key={household} d={detail} />
        ) : (
          <Dashboard key={household} d={detail} />
        )
      ) : (
        <div className="space-y-6">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-[480px]" />
          <Skeleton className="h-[280px]" />
        </div>
      )}
    </main>
  );
}

function Dashboard({ d }: { d: HouseholdDetail }) {
  const a = d.analysis;
  // open on the moment that tells this household's story, not on the wall clock
  const [minute, setMinute] = useState(() =>
    keyMinute(
      d.timeseries.minutes,
      a.battery_verdict.status === "WARNING" || a.battery_verdict.status === "CRITICAL",
    ),
  );
  const p = pointAt(d.timeseries.minutes, minute) ?? d.timeseries.minutes[0]!;
  const day = useMemo(() => dayTotals(d.timeseries.minutes), [d]);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] leading-tight text-bone sm:text-[32px]">
            Bună ziua, {a.customer_name}
          </h1>
          <p className="mt-1 text-[13px] text-fog">{a.street_address}</p>
        </div>
        <dl className="flex gap-6 text-right">
          <DayFigure label="Produs azi" value={day.produced} tone="text-sun" />
          <DayFigure label="Trimis în rețea" value={day.exported} tone="text-sky" />
          <DayFigure label="Luat din rețea" value={day.imported} tone="text-bone" />
        </dl>
      </header>

      <section
        aria-label="Instalația ta, în timp real"
        className="overflow-hidden rounded-lg border border-border bg-card"
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-4">
          <p className="num text-[22px] text-bone">{clock(p.minute_of_day)}</p>
          <p className={cn("text-right text-[13px]", tone(p, a.battery_verdict.battery_kwh > 0))}>
            {caption(p, a.battery_verdict.battery_kwh > 0)}
          </p>
        </div>
        <EnergyScene d={d} p={p} />
        <div className="border-t border-border px-5 pb-4 pt-12">
          <TimeScrub minutes={d.timeseries.minutes} minute={minute} onChange={setMinute} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <DayCharts d={d} minute={minute} onMinute={setMinute} />
        </div>
        <div className="lg:col-span-4">
          <MonthCard d={d} />
        </div>
      </section>

      <DiagnosisCard d={d} />

      <TicketForm d={d} />
    </>
  );
}

function DayFigure({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <dt className="text-[11.5px] text-fog">{label}</dt>
      <dd className={`num mt-0.5 text-[18px] leading-none ${tone}`}>
        {fmt(value, 1)} <span className="text-[11px] text-fog">kWh</span>
      </dd>
    </div>
  );
}

function tone(p: MinutePoint, hasBatt: boolean) {
  if (p.status === "TRIP") return "text-critical";
  return caption(p, hasBatt).startsWith("Bateria stă") ? "text-warning" : "text-fog";
}

/** One plain sentence for the selected minute: what the energy is doing right now. */
function caption(p: MinutePoint, hasBatt: boolean): string {
  if (p.status === "TRIP") return "Invertorul s-a oprit: tensiunea rețelei e prea mare";
  if (
    hasBatt &&
    p.grid_import_kw > 0.05 &&
    Math.abs(p.battery_power_kw) < 0.05 &&
    p.battery_soc_pct > 30
  )
    return `Bateria stă la ${fmt(p.battery_soc_pct)}%, dar casa cumpără din rețea`;
  if (p.grid_export_kw > 0.05)
    return `Casa e acoperită, surplusul de ${fmt(p.grid_export_kw, 1)} kW pleacă în rețea`;
  if (hasBatt && p.battery_power_kw < -0.05) return "Bateria alimentează casa";
  if (p.pv_power_kw > 0.05) return "Panourile acoperă o parte din consum, restul vine din rețea";
  return "Casa folosește energie din rețea";
}
