import { useRef, useState, type KeyboardEvent } from "react";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EngineeringCharts, VerdictCards } from "./Diagnostic";
import { BatterySimulator } from "./BatterySimulator";
import { GuardrailPanel } from "./GuardrailPanel";

import { OmTicketLifecycleCard, ProofBenchmarkPanel } from "./OmLifecycleAndProof";

type TabId = "grid" | "battery" | "billing" | "proof";

export function DiagnosticTabs({ d }: { d: HouseholdDetail }) {
  const party = d.analysis.primary_responsible_party;
  const [tab, setTab] = useState<TabId>(
    party === "CUSTOMER_SETTING" ? "battery" : party === "SUPPLIER_BILLING" ? "billing" : "grid",
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const b = d.analysis.battery_verdict;
  const tabs: { id: TabId; label: string }[] = [
    { id: "grid", label: "Rețea sau instalație" },
    {
      id: "battery",
      label: `Baterie${b.battery_kwh ? ` ${b.configured_min_soc_pct}% → ${b.desired_min_soc_pct}%` : ""}`,
    },
    { id: "billing", label: "Factură și verificare text" },
    { id: "proof", label: "Acuratețe 81/81" },
  ];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx = -1;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = tabs.length - 1;
    if (nextIdx >= 0) {
      e.preventDefault();
      const nextTab = tabs[nextIdx]!;
      setTab(nextTab.id);
      tabRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Secțiuni diagnostic"
        className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border"
      >
        {tabs.map((t, idx) => {
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
                "-mb-px shrink-0 border-b py-2.5 text-[13px] transition-colors",
                active ? "border-bone text-bone" : "border-transparent text-fog hover:text-bone",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "grid" && (
        <div
          id="diag-panel-grid"
          role="tabpanel"
          aria-labelledby="diag-tab-grid"
          className="space-y-3"
        >
          <EngineeringCharts d={d} />
          <VerdictCards d={d} only="grid" />
          <OmTicketLifecycleCard d={d} />
        </div>
      )}
      {tab === "proof" && (
        <div id="diag-panel-proof" role="tabpanel" aria-labelledby="diag-tab-proof">
          <ProofBenchmarkPanel />
        </div>
      )}
      {tab === "battery" && (
        <div
          id="diag-panel-battery"
          role="tabpanel"
          aria-labelledby="diag-tab-battery"
          className="grid gap-3 lg:grid-cols-[1.4fr_1fr]"
        >
          <BatterySimulator d={d} />
          <VerdictCards d={d} only="battery" />
        </div>
      )}
      {tab === "billing" && (
        <div
          id="diag-panel-billing"
          role="tabpanel"
          aria-labelledby="diag-tab-billing"
          className="grid gap-3 lg:grid-cols-[1fr_1.4fr]"
        >
          <VerdictCards d={d} only="billing" />
          <GuardrailPanel d={d} />
        </div>
      )}
    </div>
  );
}
