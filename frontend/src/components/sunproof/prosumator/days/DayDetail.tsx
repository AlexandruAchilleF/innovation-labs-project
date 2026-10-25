import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Cloud, CloudSun, Sun, Zap } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { dayTotals } from "@/lib/energy-day";
import { fmt } from "@/lib/format";
import { MONTH, WEEKDAYS_LONG, dayProfile, type DayStat } from "@/lib/month-days";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The selected day: weather, trips, the key numbers and its hourly production vs consumption. */
export function DayDetail({
  d,
  day,
  onStep,
  best,
}: {
  d: HouseholdDetail;
  day: DayStat;
  onStep: (k: number) => void;
  best: number;
}) {
  const ref = useMemo(() => dayTotals(d.timeseries.minutes), [d]);
  const profile = useMemo(() => dayProfile(d.timeseries.minutes, ref, day), [d, ref, day]);
  const Weather = day.sun > 0.8 ? Sun : day.sun > 0.5 ? CloudSun : Cloud;
  const direct = day.produced > 0 ? ((day.selfUsed + day.battery) / day.produced) * 100 : 0;
  const covered = day.consumed > 0 ? ((day.consumed - day.imported) / day.consumed) * 100 : 0;
  const cells: [string, string, string, (string | undefined)?][] = [
    ["Produs", fmt(day.produced, 1), "kWh", "text-sun"],
    ["Consum casă", fmt(day.consumed, 1), "kWh"],
    ["Trimis în rețea", fmt(day.exported, 1), "kWh"],
    ["Luat din rețea", fmt(day.imported, 1), "kWh"],
    ["Folosit de tine", fmt(direct), "%"],
    ["Casă acoperită", fmt(covered), "%"],
    ["Economisit", fmt(day.savedRon, 2), "RON", "text-success"],
    ["Vârf tensiune", fmt(day.peakV, 1), "V", day.tripMinutes > 0 ? "text-critical" : undefined],
  ];

  return (
    <section
      aria-label="Ziua aleasă"
      className="flex h-full flex-col rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Weather className="size-5 text-sun" strokeWidth={1.5} aria-hidden />
          <h2 className="font-display text-[20px] text-bone first-letter:uppercase">
            {WEEKDAYS_LONG[day.weekday]}, {day.day} august
          </h2>
          {day.day === best && <span className="eyebrow text-sun">cea mai bună zi</span>}
        </div>
        <div className="flex gap-1">
          {[
            [-1, ChevronLeft, "Ziua anterioară"],
            [1, ChevronRight, "Ziua următoare"],
          ].map(([k, Icon, l]) => {
            const I = Icon as typeof ChevronLeft;
            const disabled = (k === -1 && day.day === 1) || (k === 1 && day.day === MONTH.days);
            return (
              <button
                key={l as string}
                aria-label={l as string}
                disabled={disabled}
                onClick={() => onStep(k as number)}
                className="grid size-8 place-items-center rounded-[4px] border border-iron text-fog transition-colors hover:bg-slate hover:text-bone disabled:opacity-40"
              >
                <I className="size-4" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </div>

      {day.tripMinutes > 0 && (
        <p className="mt-4 flex items-center gap-2 rounded-[4px] border border-critical-border px-3 py-2 text-[12.5px] text-critical">
          <Zap className="size-3.5" strokeWidth={1.5} aria-hidden />
          Invertor oprit {fmt(day.tripMinutes)} min · {fmt(day.lostKwh, 1)} kWh pierduți
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {cells.map(([k, v, u, tone]) => (
          <div key={k}>
            <dt className="text-[11.5px] text-fog">{k}</dt>
            <dd className={cn("num mt-0.5 text-[16px] leading-none text-bone", tone)}>
              {v} <span className="text-[11px] text-fog">{u}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 h-[140px] border-t border-border pt-3 lg:h-auto lg:min-h-[140px] lg:flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={profile} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="h"
              ticks={[0, 6, 12, 18, 23]}
              tickFormatter={(h) => `${String(h).padStart(2, "0")}`}
              stroke="var(--smoke)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              animationDuration={80}
              cursor={{ stroke: "var(--pewter)" }}
              content={({ active, payload }) => {
                const r = payload?.[0]?.payload as (typeof profile)[number] | undefined;
                if (!active || !r) return null;
                return (
                  <div className="rounded-[4px] border border-iron bg-obsidian px-3 py-2 text-[12px]">
                    <div className="num text-fog">{String(r.h).padStart(2, "0")}:00</div>
                    <div className="flex justify-between gap-4">
                      <span className="text-fog">Producție</span>
                      <span className="num text-bone">{fmt(r.pv, 2)} kW</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-fog">Consum</span>
                      <span className="num text-bone">{fmt(r.load, 2)} kW</span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              dataKey="pv"
              type="monotone"
              stroke="var(--sun)"
              strokeWidth={1.5}
              fill="var(--sun)"
              fillOpacity={0.15}
              isAnimationActive={false}
            />
            <Area
              dataKey="load"
              type="monotone"
              stroke="var(--success)"
              strokeWidth={1.5}
              fill="none"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
