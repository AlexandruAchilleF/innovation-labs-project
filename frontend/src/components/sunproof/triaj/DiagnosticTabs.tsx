import { useRef, type ReactNode } from "react";
import { BatteryCharging, ReceiptText, Zap } from "lucide-react";
import { fmt } from "@/lib/format";
import { severityLabel } from "@/lib/i18n";
import type { HouseholdDetail, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sevText } from "../workspace/SeverityTag";
import { BatterySimulator } from "./BatterySimulator";
import { BillingPanel } from "./BillingPanel";
import { DisclosureChevron } from "../primitives";
import { OmTicketLifecycleCard } from "./OmLifecycleAndProof";
import { ProductionChart } from "./ProductionChart";
import { VoltageChart } from "./VoltageChart";
import { Spark } from "../spark";

type TabId = "grid" | "battery" | "billing";

interface Tile {
  id: TabId;
  icon: ReactNode;
  label: string;
  s: Severity;
  value: string;
  visual: ReactNode;
}

const dot: Record<Severity, string> = {
  CRITICAL: "bg-critical",
  WARNING: "bg-warning",
  OK: "bg-success",
  INFO: "bg-info",
};

/**
 * The three checks summarised as tiles (status dot, deciding number, mini chart), then every
 * check's evidence stacked in one scroll, main finding first. A tile scrolls to its evidence.
 */
export function DiagnosticTabs({ d }: { d: HouseholdDetail }) {
  const party = d.analysis.primary_responsible_party;
  const { grid_verdict: g, battery_verdict: b, billing_verdict: f } = d.analysis;
  const misset = b.battery_kwh > 0 && b.configured_min_soc_pct !== b.desired_min_soc_pct;
  const day = d.timeseries.minutes.filter((m) => m.minute_of_day % 20 === 0);
  const midday = day.filter((m) => m.minute_of_day >= 360 && m.minute_of_day <= 1200);
  const volts = midday.map((m) => m.ac_voltage_v);
  const tiles: Tile[] = [
    {
      id: "grid",
      icon: <Zap />,
      label: "Tensiune & declanșări",
      s: g.status,
      value:
        g.trip_minutes > 0
          ? `${g.trip_minutes} min deconectat`
          : `${fmt(g.max_meter_voltage_v, 1)} V`,
      visual: (
        <Spark
          values={volts}
          limit={g.legal_limit_v}
          min={Math.min(225, ...volts)}
          max={Math.max(g.legal_limit_v + 3, ...volts)}
          tone={g.trip_minutes > 0 ? "critical" : "fog"}
        />
      ),
    },
    {
      id: "battery",
      icon: <BatteryCharging />,
      label: "Stocare & arbitraj PZU",
      s: b.battery_kwh > 0 ? b.status : "OK",
      value: !b.battery_kwh
        ? "—"
        : misset
          ? `${b.configured_min_soc_pct}% → ${b.desired_min_soc_pct}%`
          : "conformă",
      visual: b.battery_kwh ? (
        <Spark
          values={day.map((m) => m.battery_soc_pct)}
          limit={b.configured_min_soc_pct}
          min={0}
          max={100}
          tone={misset ? "warning" : "fog"}
        />
      ) : null,
    },
    {
      id: "billing",
      icon: <ReceiptText />,
      label: "Decontare prosumator",
      s: f.status,
      value: Math.abs(f.delta_ron) >= 0.01 ? `${fmt(Math.abs(f.delta_ron), 2)} RON` : "conformă",
      visual: <MiniPair a={f.meter_export_kwh} b={f.billed_export_kwh} />,
    },
  ];

  const main: TabId =
    party === "CUSTOMER_SETTING" ? "battery" : party === "SUPPLIER_BILLING" ? "billing" : "grid";
  const order = [main, ...(["grid", "battery", "billing"] as TabId[]).filter((id) => id !== main)];
  const sections = useRef<Partial<Record<TabId, HTMLElement | null>>>({});
  const body: Record<TabId, ReactNode> = {
    grid: (
      <>
        <VoltageChart d={d} />
        <ProductionChart d={d} />
        <Fold title="Ciclul de viață al tichetului O&M">
          <OmTicketLifecycleCard d={d} />
        </Fold>
      </>
    ),
    battery: <BatterySimulator d={d} />,
    billing: <BillingPanel d={d} />,
  };

  return (
    <div className="space-y-4">
      <nav aria-label="Sinteza verificărilor" className="grid gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() =>
              sections.current[t.id]?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:bg-graphite"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[12.5px] text-fog [&_svg]:size-3.5">
                {t.icon}
                {t.label}
              </span>
              <span
                className={cn("size-1.5 rounded-full", dot[t.s])}
                aria-label={severityLabel[t.s]}
              />
            </span>
            <span className="mt-3 flex items-end justify-between gap-3">
              <span
                className={cn(
                  "text-[22px] leading-none",
                  /\d/.test(t.value) && "num",
                  t.s === "OK" ? "text-bone" : sevText[t.s],
                )}
              >
                {t.value}
              </span>
              {t.visual}
            </span>
          </button>
        ))}
      </nav>

      {order.map((id, i) => (
        <section
          key={id}
          ref={(el) => {
            sections.current[id] = el;
          }}
          aria-label={tiles.find((t) => t.id === id)!.label}
          className={cn(
            "scroll-mt-4 space-y-3",
            i > 0 && "scroll-reveal border-t border-border pt-6",
          )}
        >
          {body[id]}
        </section>
      ))}

    </div>
  );
}

function Fold({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group", className)}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[12.5px] text-fog hover:text-bone">
        {title}
        <DisclosureChevron />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

/** Meter export vs billed export as two stacked hairline bars: a short lower bar is missing kWh. */
function MiniPair({ a, b }: { a: number; b: number }) {
  const top = Math.max(a, b, 1);
  return (
    <span className="flex w-20 flex-col gap-1" aria-hidden>
      <span className="h-1.5 rounded-[1px] bg-bone" style={{ width: `${(a / top) * 100}%` }} />
      <span
        className={cn("h-1.5 rounded-[1px]", b < a - 0.5 ? "bg-critical" : "bg-success")}
        style={{ width: `${(b / top) * 100}%` }}
      />
    </span>
  );
}
