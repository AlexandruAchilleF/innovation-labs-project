import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import type { HouseholdDetail } from "@/lib/types";

function useDebounced<T>(v: T, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

/**
 * The battery fix in one place: the step-by-step guide in the inverter app, then a single reserve
 * slider whose savings come from the battery what-if engine (not from a client-side estimate).
 */
export function BatteryFix({ d }: { d: HouseholdDetail }) {
  const s = d.scenario;
  const b = d.analysis.battery_verdict;
  const id = d.analysis.household_id;
  const [soc, setSoc] = useState(b.desired_min_soc_pct || 20);
  const dsoc = useDebounced(soc);
  const q = useQuery({
    queryKey: ["what-if-battery", id, dsoc],
    queryFn: () => api.whatIfBattery(id, dsoc),
    placeholderData: keepPreviousData,
  });
  const r = q.data;
  const gain = r ? Math.max(0, r.delta.customer_grid_tax_savings_month_ron) : null;
  return (
    <div className="grid gap-6 border-t border-border pt-6 md:grid-cols-2">
      <div>
        <h3 className="text-[14px] font-medium text-bone">Pașii în aplicația {s.app_name}</h3>
        <p className="num mt-1 text-[12px] text-fog">{s.app_setting_path_ro}</p>
        <ol className="mt-4 space-y-3">
          {s.app_steps_ro.map((step, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-snug text-bone">
              <span className="num flex size-6 shrink-0 items-center justify-center rounded-[4px] border border-iron text-[12px] text-fog">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="text-[14px] font-medium text-bone">Cât câștigi dacă schimbi rezerva</h3>
        <p className="mt-1 text-[12px] text-fog">
          Acum: <span className="num text-bone">{fmt(b.configured_min_soc_pct)}%</span> · tu ai
          cerut <span className="num text-bone">{fmt(b.desired_min_soc_pct)}%</span>
        </p>
        <div className="mt-5 flex items-baseline justify-between text-[13px]">
          <span className="text-fog">Rezervă minimă de avarie</span>
          <span className="num text-bone">{soc}%</span>
        </div>
        <Slider
          className="mt-3"
          min={5}
          max={100}
          step={5}
          value={[soc]}
          onValueChange={(v) => setSoc(v[0] ?? soc)}
          aria-label="Rezervă minimă baterie"
        />
        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg border border-border bg-obsidian p-4">
          <div>
            <dt className="text-[12px] text-fog">Economie în plus</dt>
            <dd className="num mt-1 text-[24px] leading-none text-bone">
              {gain === null ? "…" : `+${fmt(gain)} RON`}
            </dd>
            <dd className="mt-1 text-[11px] text-fog">
              pe lună, la {r?.after.min_soc_pct ?? dsoc}%
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-fog">Energie folosită seara</dt>
            <dd className="num mt-1 text-[24px] leading-none text-bone">
              {r ? `${fmt(r.after.evening_kwh_delivered_day, 1)} kWh` : "…"}
            </dd>
            <dd className="num mt-1 text-[11px] text-fog">
              {r ? `față de ${fmt(r.before.evening_kwh_delivered_day, 1)} kWh/zi acum` : ""}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
