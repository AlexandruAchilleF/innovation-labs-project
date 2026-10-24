import { Check, TriangleAlert } from "lucide-react";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";

/** The month at a glance: where the solar energy went, and whether the invoice matches the meter. */
export function MonthCard({ d }: { d: HouseholdDetail }) {
  const f = d.analysis.billing_verdict;
  const loss = d.analysis.total_customer_monthly_benefit_ron;
  const parts = [
    { k: "Folosit în casă", v: f.self_consumed_kwh, c: "var(--success)" },
    { k: "Prin baterie", v: f.battery_cycled_kwh, c: "var(--info)" },
    { k: "Trimis în rețea", v: f.meter_export_kwh, c: "var(--sky)" },
  ].filter((p) => p.v > 0);
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  const billOk = f.status === "OK" || Math.abs(f.meter_export_kwh - f.billed_export_kwh) < 0.5;
  const maxExport = Math.max(f.meter_export_kwh, f.billed_export_kwh, 1);

  return (
    <section
      aria-label="Luna aceasta"
      className="flex h-full flex-col gap-6 rounded-lg border border-border bg-card p-5"
    >
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] text-fog">Produs luna aceasta</h2>
          <span className="num text-[13px] text-success">
            +{fmt(f.self_consumption_savings_ron)} RON
          </span>
        </div>
        <p className="num mt-1 text-[30px] leading-none text-bone">
          {fmt(f.produced_kwh)} <span className="text-[14px] text-fog">kWh</span>
        </p>
        <div
          className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
          role="img"
          aria-label="Unde a mers energia produsă"
        >
          {parts.map((p) => (
            <span key={p.k} style={{ flexGrow: p.v / total, background: p.c }} />
          ))}
        </div>
        <ul className="mt-3 space-y-1.5 text-[12.5px]">
          {parts.map((p) => (
            <li key={p.k} className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: p.c }} />
              <span className="text-fog">{p.k}</span>
              <span className="num ml-auto text-bone">{fmt(p.v)} kWh</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] text-fog">Factura vs. contorul</h2>
          {billOk ? (
            <span className="flex items-center gap-1 text-[12px] text-success">
              <Check className="size-3.5" /> corectă
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[12px] text-critical">
              <TriangleAlert className="size-3.5" /> {fmt(Math.abs(f.delta_ron), 2)} RON lipsă
            </span>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {[
            ["Contor", f.meter_export_kwh, "var(--sky)"],
            ["Factură", f.billed_export_kwh, billOk ? "var(--sky)" : "var(--critical)"],
          ].map(([k, v, c]) => (
            <div
              key={k as string}
              className="grid grid-cols-[52px_1fr_64px] items-center gap-2 text-[12px]"
            >
              <span className="text-fog">{k}</span>
              <span className="h-2 rounded-full bg-slate">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${((v as number) / maxExport) * 100}%`,
                    background: c as string,
                  }}
                />
              </span>
              <span className="num text-right text-bone">{fmt(v as number)} kWh</span>
            </div>
          ))}
        </div>
      </div>

      {loss > 0 && (
        <div className="mt-auto flex items-baseline justify-between rounded-[4px] border border-warning-border px-3 py-2.5">
          <span className="text-[12.5px] text-fog">Pierzi acum</span>
          <span className="num text-[18px] text-warning">{fmt(loss)} RON/lună</span>
        </div>
      )}
    </section>
  );
}
