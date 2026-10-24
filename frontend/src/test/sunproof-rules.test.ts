import { describe, expect, it, beforeEach } from "vitest";
import { extrapolate, runGuardrail, HALLUCINATION_SUFFIX } from "@/lib/sim";
import { mockHouseholdDetail, mockPortfolio } from "@/lib/mock/households";
import { withFallback, __resetApiState } from "@/lib/api";

describe("SunProof rules", () => {
  it("extrapolates 25.000 prosumers to 5.667.168 EUR and 14.250 MWh", () => {
    expect(extrapolate(25000)).toEqual({ annual_eur: 5667168, mwh_year: 14250 });
    expect(extrapolate(50000).annual_eur).toBe(11334336);
  });

  it("guardrail catches the hallucinated 999 and falls back", () => {
    const verified = mockHouseholdDetail("RO-BV-004").analysis.invoice_explanation_text;
    const r = runGuardrail(verified + HALLUCINATION_SUFFIX, verified);
    expect(r.unverified_numbers_caught).toEqual([999]);
    expect(r.guardrail_passed).toBe(false);
    expect(r.text_ro).toBe(verified);
  });

  it("RO-BV-004 is overbilled by 312,80 RON", () => {
    expect(mockHouseholdDetail("RO-BV-004").analysis.billing_verdict.delta_ron).toBe(312.8);
  });

  it("portfolio has 81 households and 5 flagships", () => {
    const p = mockPortfolio();
    expect(p.households).toHaveLength(81);
    expect(p.households.filter((h) => h.is_flagship)).toHaveLength(5);
  });

  describe("api fallback", () => {
    beforeEach(() => __resetApiState());
    it("returns mock data when backend is unreachable", async () => {
      const failing = (() => Promise.reject(new Error("offline"))) as unknown as typeof fetch;
      const r = await withFallback("/api/portfolio", undefined, () => "mock", failing);
      expect(r).toBe("mock");
    });
  });
});

import { eveningBatterySavings } from "@/lib/sim";
describe("evening battery savings", () => {
  it("15 kWh at 20% min SoC is capped at 7 kWh/day → 273 RON/month", () => {
    expect(eveningBatterySavings(15, 20)).toEqual({ kwh_day: 7, ron_month: 273 });
  });
});
