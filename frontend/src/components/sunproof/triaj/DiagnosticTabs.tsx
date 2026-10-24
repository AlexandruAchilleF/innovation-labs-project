import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { BatteryCharging, ReceiptText, Zap } from "lucide-react";
import { fmt } from "@/lib/format";
import { severityLabel } from "@/lib/i18n";
import type { HouseholdDetail, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sevText } from "../workspace/SeverityTag";
import { BatterySimulator } from "./BatterySimulator";
import { BillingPanel } from "./BillingPanel";
import { GuardrailPanel } from "./GuardrailPanel";
import { DisclosureChevron } from "../primitives";
import { OmTicketLifecycleCard, ProofBenchmarkPanel } from "./OmLifecycleAndProof";
import { ProductionChart } from "./ProductionChart";
import { VoltageChart } from "./VoltageChart";

type TabId = "grid" | "battery" | "billing";

interface Tile {
  id: TabId;
  icon: ReactNode;
  label: string;
  s: Severity;
  value: string;
  caption: string;
}

const dot: Record<Severity, string> = {
  CRITICAL: "bg-critical",
  WARNING: "bg-warning",
  OK: "bg-success",
  INFO: "bg-info",
};

/** The three checks as tiles that double as tabs: status, the deciding number, one caption. */
export function DiagnosticTabs({ d }: { d: HouseholdDetail }) {
  const party = d.analysis.primary_responsible_party;
  const [tab, setTab] = useState<TabId>(
    party === "CUSTOMER_SETTING" ? "battery" : party === "SUPPLIER_BILLING" ? "billing" : "grid",
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { grid_verdict: g, battery_verdict: b, billing_verdict: f } = d.analysis;
  const misset = b.battery_kwh > 0 && b.configured_min_soc_pct !== b.desired_min_soc_pct;
  const tiles: Tile[] = [
    {
      id: "grid",
      icon: <Zap />,
      label: "Rețea sau instalație",
      s: g.status,
      value:
        g.trip_minutes > 0 ? `${g.trip_minutes} min oprit` : `${fmt(g.max_meter_voltage_v, 1)} V`,
      caption:
        g.trip_minutes > 0
          ? `${g.neighbors_affected_simultaneously} din ${g.neighbors_total} vecini cad simultan`
          : "fără opriri azi",
    },
    {
      id: "battery",
      icon: <BatteryCharging />,
      label: "Baterie seara",
      s: b.battery_kwh > 0 ? b.status : "OK",
      value: !b.battery_kwh
        ? "—"
        : misset
          ? `${b.configured_min_soc_pct}% → ${b.desired_min_soc_pct}%`
          : "corectă",
      caption: !b.battery_kwh
        ? "fără baterie instalată"
        : misset
          ? `${fmt(b.locked_kwh, 1)} kWh/zi blocați`
          : `${fmt(b.battery_kwh, 1)} kWh · rezervă ${b.configured_min_soc_pct}%`,
    },
    {
      id: "billing",
      icon: <ReceiptText />,
      label: "Factură",
      s: f.status,
      value: Math.abs(f.delta_ron) >= 0.01 ? `${fmt(Math.abs(f.delta_ron), 2)} RON` : "corectă",
      caption: Math.abs(f.delta_ron) >= 0.01 ? "diferență față de contor" : "export compensat 1:1",
    },
  ];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const n = tiles.length;
    const next =
      e.key === "ArrowRight"
        ? (idx + 1) % n
        : e.key === "ArrowLeft"
          ? (idx - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(tiles[next]!.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Verificări" className="grid gap-2 sm:grid-cols-3">
        {tiles.map((t, idx) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              id={`diag-tab-${t.id}`}
              role="tab"
              aria-selected={active}
              aria-controls={`diag-panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onKeyDown(e, idx)}
              className={cn(
                "rounded-lg border p-3.5 text-left transition-colors",
                active ? "border-voltage bg-graphite" : "border-border bg-card hover:bg-graphite",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[12.5px] text-fog [&_svg]:size-3.5">
                  {t.icon}
                  {t.label}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-fog">
                  <span className={cn("size-1.5 rounded-full", dot[t.s])} />
                  {severityLabel[t.s]}
                </span>
              </span>
              <span
                className={cn(
                  "mt-2 block text-[22px] leading-none",
                  /\d/.test(t.value) && "num",
                  t.s === "OK" ? "text-bone" : sevText[t.s],
                )}
              >
                {t.value}
              </span>
              <span className="mt-1.5 block truncate text-[12px] text-fog">{t.caption}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`diag-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`diag-tab-${tab}`}
        className="space-y-3"
      >
        {tab === "grid" && (
          <>
            <VoltageChart d={d} />
            <ProductionChart d={d} />
            <Fold title="Ciclul de viață al tichetului O&M">
              <OmTicketLifecycleCard d={d} />
            </Fold>
          </>
        )}
        {tab === "battery" && <BatterySimulator d={d} />}
        {tab === "billing" && (
          <>
            <BillingPanel d={d} />
            <Fold title="Textele generate și verificarea lor numerică">
              <GuardrailPanel d={d} />
            </Fold>
          </>
        )}
      </div>

      <Fold
        title="Acuratețea motoarelor pe toate scenariile"
        className="border-t border-border pt-3"
      >
        <ProofBenchmarkPanel />
      </Fold>
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
