import { useState } from "react";
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
  const b = d.analysis.battery_verdict;
  const tabs: { id: TabId; label: string }[] = [
    { id: "grid", label: "Rețea sau instalație" },
    {
      id: "battery",
      label: `Baterie${b.battery_kwh ? ` ${b.configured_min_soc_pct}% → ${b.desired_min_soc_pct}%` : ""}`,
    },
    { id: "billing", label: "Factură și scut AI" },
    { id: "proof", label: "Acuratețe 81/81" },
  ];
  return (
    <div className="space-y-4">
      <div
        role="tablist"
        className="flex gap-6 overflow-x-auto border-b border-border [scrollbar-width:none]"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px shrink-0 border-b py-2.5 text-[13px] transition-colors",
              tab === t.id
                ? "border-bone text-bone"
                : "border-transparent text-fog hover:text-bone",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "grid" && (
        <div className="space-y-3">
          <EngineeringCharts d={d} />
          <VerdictCards d={d} only="grid" />
          <OmTicketLifecycleCard d={d} />
        </div>
      )}
      {tab === "proof" && <ProofBenchmarkPanel />}
      {tab === "battery" && (
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <BatterySimulator d={d} />
          <VerdictCards d={d} only="battery" />
        </div>
      )}
      {tab === "billing" && (
        <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
          <VerdictCards d={d} only="billing" />
          <GuardrailPanel d={d} />
        </div>
      )}
    </div>
  );
}
