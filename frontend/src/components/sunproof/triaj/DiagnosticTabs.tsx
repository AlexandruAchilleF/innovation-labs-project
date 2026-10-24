import { useState } from "react";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EngineeringCharts, VerdictCards } from "./Diagnostic";
import { BatterySimulator } from "./BatterySimulator";
import { GuardrailPanel } from "./GuardrailPanel";

type TabId = "grid" | "battery" | "billing";

export function DiagnosticTabs({ d }: { d: HouseholdDetail }) {
  const [tab, setTab] = useState<TabId>("grid");
  const b = d.analysis.battery_verdict;
  const tabs: { id: TabId; label: string }[] = [
    { id: "grid", label: "⚡ 1. Dovada Rețea vs. Instalație (253V)" },
    { id: "battery", label: `🔋 2. Simulator Baterie & PZU Seara${b.battery_kwh ? ` (${b.configured_min_soc_pct}% → ${b.desired_min_soc_pct}%)` : ""}` },
    { id: "billing", label: "🧾 3. Reconciliere Factură & Scut AI" },
  ];
  return (
    <div className="space-y-3">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-2 py-1.5 text-[12px] leading-tight font-semibold transition-colors",
              tab === t.id ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
        </div>
      )}
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
