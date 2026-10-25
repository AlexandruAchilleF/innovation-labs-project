import { describe, expect, it } from "vitest";
import { mockHouseholdDetail } from "@/lib/mock/households";
import { MONTH, buildMonth, sunPattern } from "@/lib/month-days";

const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(0.01);

describe("month-days", () => {
  it("is deterministic per household and stays within the clear-sky range", () => {
    const a = sunPattern("RO-B-005");
    expect(a).toEqual(sunPattern("RO-B-005"));
    expect(a).toHaveLength(MONTH.days);
    expect(a.every((s) => s >= 0.25 && s <= 1)).toBe(true);
  });

  it("spreads the month so the daily sums match the billing totals", () => {
    const d = mockHouseholdDetail("RO-B-005");
    const b = d.analysis.billing_verdict;
    const m = buildMonth(d);
    expect(m.days).toHaveLength(MONTH.days);
    close(m.totals.produced, b.produced_kwh);
    close(m.totals.savedRon, b.self_consumption_savings_ron);
    close(m.totals.lostRon, d.analysis.total_customer_monthly_benefit_ron);
    for (const x of m.days) {
      expect(x.selfUsed + x.battery + x.exported).toBeCloseTo(x.produced, 6);
      expect(x.imported).toBeGreaterThanOrEqual(0);
    }
    expect(m.days[0]!.weekday).toBe(5); // 1 august 2026 = sâmbătă
  });

  it("only trips on days above the inverter threshold", () => {
    const d = mockHouseholdDetail("RO-TM-001");
    const thr = d.analysis.grid_verdict.inverter_threshold_v;
    for (const x of buildMonth(d).days) {
      expect(x.tripMinutes > 0).toBe(x.peakV > thr);
    }
  });
});
