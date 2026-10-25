import { useMemo, useState, type KeyboardEvent } from "react";
import { fmt } from "@/lib/format";
import { MONTH, WEEKDAYS, buildMonth, type DayStat } from "@/lib/month-days";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DailyChart } from "./DailyChart";
import { DayDetail } from "./DayDetail";

/** "Pe zile" tab: the billing month day by day — chart, calendar and the selected day's numbers. */
export function DaysView({ d }: { d: HouseholdDetail }) {
  const month = useMemo(() => buildMonth(d), [d]);
  const t = month.totals;
  const [selected, setSelected] = useState(
    month.days.find((x) => x.tripMinutes > 0)?.day ?? month.best.day,
  );
  const day = month.days[selected - 1]!;
  const pick = (n: number) => setSelected(Math.min(MONTH.days, Math.max(1, n)));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] leading-tight text-bone sm:text-[32px]">
            Luna ta, zi cu zi
          </h1>
          <p className="mt-1 text-[13px] text-fog">
            {MONTH.label} · {d.analysis.street_address}
          </p>
        </div>
        <dl className="flex flex-wrap gap-6 text-right">
          <Figure label="Produs" value={fmt(t.produced)} unit="kWh" tone="text-sun" />
          <Figure label="Economisit" value={fmt(t.savedRon)} unit="RON" tone="text-success" />
          {t.tripDays > 0 && (
            <Figure
              label="Zile cu opriri"
              value={fmt(t.tripDays)}
              unit={`/ ${MONTH.days}`}
              tone="text-critical"
            />
          )}
          {t.lostRon > 0 && (
            <Figure label="Pierdut" value={fmt(t.lostRon)} unit="RON" tone="text-warning" />
          )}
        </dl>
      </header>

      <DailyChart
        days={month.days}
        selected={selected}
        onSelect={pick}
        limitV={d.analysis.grid_verdict.legal_limit_v}
        hasBattery={d.analysis.battery_verdict.battery_kwh > 0}
      />

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Calendar days={month.days} selected={selected} onSelect={pick} />
        </div>
        <div className="lg:col-span-7">
          <DayDetail d={d} day={day} onStep={(k) => pick(selected + k)} best={month.best.day} />
        </div>
      </section>
    </>
  );
}

function Figure({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: string;
}) {
  return (
    <div>
      <dt className="text-[11.5px] text-fog">{label}</dt>
      <dd className={`num mt-0.5 text-[18px] leading-none ${tone}`}>
        {value} <span className="text-[11px] text-fog">{unit}</span>
      </dd>
    </div>
  );
}

/** Month grid: cell shade = how much the panels produced; red dot = inverter trips that day. */
function Calendar({
  days,
  selected,
  onSelect,
}: {
  days: DayStat[];
  selected: number;
  onSelect: (n: number) => void;
}) {
  const max = Math.max(...days.map((x) => x.produced), 1);
  const lead = days[0]!.weekday;
  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      onSelect(selected + step);
    }
  };
  return (
    <section
      aria-label="Calendarul lunii"
      className="h-full rounded-lg border border-border bg-card p-5"
    >
      <h2 className="text-[13px] text-fog capitalize">{MONTH.label}</h2>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-smoke">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div
        role="grid"
        tabIndex={0}
        onKeyDown={onKey}
        className="mt-1 grid grid-cols-7 gap-1 outline-none"
      >
        {Array.from({ length: lead }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {days.map((x) => (
          <button
            key={x.day}
            role="gridcell"
            tabIndex={-1}
            aria-selected={x.day === selected}
            aria-label={`${x.day} august: ${fmt(x.produced, 1)} kWh${x.tripMinutes ? `, ${x.tripMinutes} minute opriri` : ""}`}
            onClick={() => onSelect(x.day)}
            className={cn(
              "relative flex aspect-square flex-col items-center justify-center rounded-[4px] border text-[12px] transition-colors",
              x.day === selected
                ? "border-voltage text-bone"
                : "border-transparent text-fog hover:border-iron",
            )}
            style={{
              background: `color-mix(in oklab, var(--sun) ${Math.round((x.produced / max) * 38)}%, var(--graphite))`,
            }}
          >
            <span className="num">{x.day}</span>
            {x.tripMinutes > 0 && (
              <span
                className="absolute right-1 top-1 size-1.5 rounded-full bg-critical"
                aria-hidden
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
