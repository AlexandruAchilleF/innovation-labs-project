/** Three self-labelled mini figures, one per question the engines answer. Shapes only, no data. */

const NEIGHBORS = [0, 1, 2, 3, 4];

/** (a) Every feeder on the transformer climbs to 253 V and trips in the same minute. */
export function GridFigure() {
  return (
    <svg
      role="img"
      aria-label="Vecinii ating 253 V și se opresc în același minut"
      viewBox="0 0 320 120"
      className="h-[120px] w-full overflow-visible"
    >
      <line x1="0" x2="320" y1="20" y2="20" stroke="var(--fog)" strokeDasharray="2 5" />
      <text x="0" y="12" fill="var(--fog)" fontSize="11" className="num">
        253 V
      </text>
      {NEIGHBORS.map((i) => {
        const y0 = 108 - i * 9;
        const yp = 22 + i * 3;
        return (
          <path
            key={i}
            d={`M0 ${y0} C110 ${y0} 150 ${yp} 200 ${yp} L203 112 L320 112`}
            fill="none"
            stroke={i === 0 ? "var(--bone)" : "var(--smoke)"}
            strokeWidth={1}
          />
        );
      })}
      {NEIGHBORS.map((i) => (
        <circle key={i} cx="200" cy={22 + i * 3} r="2.5" fill="var(--bone)" />
      ))}
      <text x="210" y="50" fill="var(--fog)" fontSize="11">
        același minut
      </text>
    </svg>
  );
}

/** (b) Most of the battery is held as emergency reserve, so the evening peak gets the rest. */
export function BatteryFigure() {
  return (
    <div
      role="img"
      aria-label="Bateria păstrează 80% rezervă de avarie; seara se descarcă doar 20%"
      className="flex h-[120px] flex-col justify-center gap-2 text-[11px] text-fog"
    >
      <div className="flex">
        <span className="w-1/5">seara</span>
        <span className="num w-4/5 text-right">rezervă 80%</span>
      </div>
      <div className="flex h-10 overflow-hidden rounded-[4px] border border-pewter">
        <div className="w-1/5 bg-bone/80" />
        <div className="hatch w-4/5 border-l border-pewter" />
      </div>
    </div>
  );
}

/** (c) The smart-meter export index (2.8.0) against what the invoice compensated. */
export function BillingFigure() {
  return (
    <div
      role="img"
      aria-label="Indexul de export 2.8.0 al contorului este mai mare decât energia de pe factură"
      className="grid h-[120px] grid-cols-[72px_1fr] content-center items-center gap-x-3 gap-y-3 text-[11px] text-fog"
    >
      <span className="num">2.8.0</span>
      <div className="h-3 rounded-[2px] bg-fog/70" />
      <span>factură</span>
      <div className="flex h-3 gap-px">
        <div className="w-[68%] rounded-l-[2px] bg-fog/70" />
        <div className="w-[32%] rounded-r-[2px] bg-critical" />
      </div>
      <span />
      <span className="text-right text-critical">diferență</span>
    </div>
  );
}
