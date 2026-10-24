import { describe, expect, it } from "vitest";
import {
  deriveScenarioCode,
  normalizeGridState,
  normalizeGuardrail,
  normalizeHouseholdDetail,
  normalizeHouseholdSummary,
  normalizeNeighborhood,
  normalizeWhatIfBattery,
} from "@/lib/adapters";
import { mockHouseholdDetail, mockPortfolio } from "@/lib/mock/households";
import { neighborhoods } from "@/lib/mock/neighborhoods";
import { mockWhatIfBattery } from "@/lib/api";

describe("backend -> frontend adapters", () => {
  it("is idempotent on mock-shaped data", () => {
    const d = mockHouseholdDetail("RO-BV-004");
    expect(normalizeHouseholdDetail(d, "RO-BV-004")).toEqual(d);
    const h = mockPortfolio().households[0]!;
    expect(normalizeHouseholdSummary(h)).toEqual(h);
    expect(normalizeNeighborhood(neighborhoods[0]!)).toEqual(neighborhoods[0]);
    const w = mockWhatIfBattery("RO-CJ-003", 10);
    expect(normalizeWhatIfBattery(w)).toEqual(w);
  });

  it("derives scenario code and impact for a backend summary", () => {
    expect(deriveScenarioCode({ grid_cause: "LOCAL_CABLE_IMPEDANCE" })).toBe(
      "LOCAL_OVERVOLTAGE_SENSITIVITY",
    );
    expect(
      deriveScenarioCode({ billing_status: "INVOICE_VALID_EXPLAINED", overall_severity: "OK" }),
    ).toBe("HEALTHY");
    const s = normalizeHouseholdSummary({
      household_id: "RO-CJ-003",
      battery_status: "MISCONFIGURED_SOC_RESERVE",
      total_supplier_monthly_benefit_ron: 100.005,
      total_customer_monthly_benefit_ron: 50,
    });
    expect(s.scenario_code).toBe("MISCONFIGURED_MODE");
    expect(s.monthly_impact_ron).toBe(150.01);
    expect(s.is_flagship).toBe(true);
  });

  it("maps backend household detail enums and field names", () => {
    const d = normalizeHouseholdDetail(
      {
        scenario: { connection_phase: "L2", internal_ac_cable_length_m: 20 },
        analysis: {
          primary_responsible_party: "DISTRIBUTOR",
          grid_verdict: {
            cause: "GRID_OVERVOLTAGE",
            severity: "CRITICAL",
            configured_trip_threshold_v: 253,
          },
          battery_verdict: {
            status: "MISCONFIGURED_SOC_RESERVE",
            severity: "WARNING",
            supplier_monthly_pzu_loss_ron: 12,
          },
          billing_verdict: {
            status: "MISSING_EXPORT_INDEX",
            severity: "INFO",
            correct_payable_ron: 5,
          },
          invoice_explanation_text: { text_ro: "salut" },
        },
        timeseries: {
          minutes: [
            { minute_of_day: 5, status: "TRIPPED_OVERVOLTAGE" },
            { status: "STANDBY_NIGHT" },
          ],
          pzu: [{ zone: "SOLAR_DIP" }],
        },
      },
      "RO-TM-001",
    );
    expect(d.scenario.code).toBe("GRID_OVERVOLTAGE");
    expect(d.analysis.primary_responsible_party).toBe("DISTRIBUTION_OPERATOR");
    expect(d.analysis.phase).toBe("L2");
    expect(d.analysis.grid_verdict.status).toBe("CRITICAL");
    expect(d.analysis.grid_verdict.cable_length_m).toBe(20);
    expect(d.analysis.battery_verdict.status).toBe("WARNING");
    expect(d.analysis.battery_verdict.monthly_pzu_loss_ron).toBe(12);
    expect(d.analysis.billing_verdict.status).toBe("INFO");
    expect(d.analysis.billing_verdict.verified_ron).toBe(5);
    expect(d.analysis.invoice_explanation_text).toBe("salut");
    expect(d.timeseries.minutes.map((m) => m.status)).toEqual(["TRIP", "OK"]);
    expect(d.timeseries.minutes[1]!.ac_voltage_v).toBe(230);
    expect(d.timeseries.pzu[0]!.zone).toBe("MIDDAY");
  });

  it("converts backend battery what-if analyses to KPIs", () => {
    const bv = (soc: number, kwh: number, sup: number, cust: number) => ({
      battery_verdict: {
        configured_min_soc_pct: soc,
        evening_battery_discharge_kwh_today: kwh,
        supplier_monthly_pzu_loss_ron: sup,
        customer_monthly_grid_tax_loss_ron: cust,
      },
    });
    const r = normalizeWhatIfBattery({
      before: bv(85, 0, 300, 200),
      after: bv(10, 9, 50, 20),
      timeseries: { before: [], after: [{ time: "01:00" }] },
    });
    expect(r.after.supplier_pzu_savings_month_ron).toBe(250);
    expect(r.delta.min_soc_pct).toBe(-75);
    expect(r.delta.customer_grid_tax_savings_month_ron).toBe(180);
    expect(r.timeseries.after[0]!.status).toBe("OK");
  });

  it("maps neighborhood detail, grid state and guardrail source", () => {
    const n = normalizeNeighborhood({
      neighborhood_id: "x",
      name_ro: "Zona",
      rated_kva: 250,
      headline_ro: "h",
      max_voltage_v: 258,
      houses: [
        {
          house_id: "PT04-F1-H01",
          household_id: null,
          feeder_id: "PT04-F2",
          phase: "THREE_PHASE",
          installed_pv_kw: 10,
          max_pcc_voltage_v: 240,
        },
      ],
    });
    expect(n).toMatchObject({
      name: "Zona",
      transformer_kva: 250,
      peak_voltage_v: 258,
      base_rise_v: 28,
    });
    expect(n.houses[0]).toMatchObject({
      house_id: "PT04-F1-H01",
      feeder: 2,
      phase: "3P",
      pv_kw: 10,
      voltage_v: 240,
    });
    const g = normalizeGridState({
      max_voltage_v: 255,
      houses_tripped: 2,
      lost_energy_kwh: 9,
      houses: [{ derating_minutes: 3 }, { derating_minutes: 0 }],
    });
    expect(g).toMatchObject({ peak_voltage_v: 255, houses_derating: 1, curtailed_kwh_day: 9 });
    expect(normalizeGuardrail({ result: { source: "llm" } }).result.source).toBe("LLM");
    expect(normalizeGuardrail({ result: { source: "template_fallback" } }).result.source).toBe(
      "DETERMINISTIC_TEMPLATE",
    );
  });
});
