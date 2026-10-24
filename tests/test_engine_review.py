"""Review regressions use public scenarios as fixtures; all mutations are local."""
import pytest

from sunproof.engine import analyze_household, compute_portfolio_metrics
from sunproof.engine.battery import analyze_battery
from sunproof.engine.billing import reconcile_billing
from sunproof.engine.grid_fault import analyze_grid_fault
from sunproof.models import BatteryMode, InverterStatus, SettlementRegime
from sunproof.scenarios import get_scenario_by_id


@pytest.fixture(scope="module")
def base():
    return get_scenario_by_id("RO-B-005")


def copy(obj, **changes):
    return type(obj).model_validate({**obj.model_dump(), **changes})


def day(base, cadence=1, trips=(), derating=False):
    samples = []
    for m in range(0, 1440, cadence):
        light = 360 <= m < 1080
        trip = m in trips
        samples.append(copy(base.inverter_telemetry[m], timestamp=f"{m//60:02d}:{m%60:02d}",
            ac_voltage_v=245 if trip else 230, pv_power_kw=0 if trip or not light else (0.5 if derating else 1),
            pvgis_expected_kw=1 if light else 0, house_load_kw=1 if light else 0,
            grid_import_kw=1 if trip else 0, grid_export_kw=0, battery_power_kw=0,
            status=InverterStatus.TRIPPED_OVERVOLTAGE if trip else (
                InverterStatus.DERATING if derating and light else InverterStatus.NORMAL)))
    return copy(base, inverter_telemetry=samples, neighbors=[], configured_overvoltage_trip_v=240,
                smart_meter_15m=[copy(t, meter_voltage_avg_v=230) for t in base.smart_meter_15m])


@pytest.mark.parametrize("field,delta", [("total_payable_ron", 1000), ("total_payable_ron", -100),
    ("compensated_Active_energy_kwh", -10), ("net_billed_active_energy_kwh", 10),
    ("carried_forward_export_credit_kwh", 10), ("billed_export_kwh", 10), ("billed_import_kwh", -10)])
def test_invoice_amount_and_lines(base, field, delta):
    inv = copy(base.invoice, **{field: getattr(base.invoice, field) + delta})
    v = reconcile_billing(copy(base, invoice=inv))
    assert v.status.value == "AMOUNT_MISMATCH"
    assert v.responsible_party.value == "SUPPLIER_BILLING"
    assert "Factura este corectă" not in v.customer_explanation_ro


@pytest.mark.parametrize("regime", list(SettlementRegime)[1:])
def test_unsupported_regime_fails_closed(base, regime):
    v = reconcile_billing(copy(base, invoice=copy(base.invoice, settlement_regime=regime)))
    assert v.status.value == "UNSUPPORTED_SETTLEMENT"
    assert not v.reconciliation_supported
    assert v.correct_payable_ron is None and v.financial_discrepancy_ron is None
    assert analyze_household(copy(base, invoice=copy(base.invoice, settlement_regime=regime))).one_line_triage_ro


def test_unrelated_daily_voltage_is_not_event_evidence(base):
    s = day(base, trips=(600,))
    s.smart_meter_15m[60] = copy(s.smart_meter_15m[60], meter_voltage_avg_v=252)
    v = analyze_grid_fault(s)
    assert v.cause.value == "LOCAL_OVERVOLTAGE_SENSITIVITY"
    assert v.max_meter_voltage_v == 252
    assert v.events[0].peak_meter_voltage_v == 230


def test_strongest_simultaneous_neighbors_not_union(base):
    s = day(base, trips=(600, 900))
    s.neighbors = [copy(n, telemetry=[copy(t, ac_voltage_v=251 if t.minute_of_day == 600+i*300 else 230,
        status=InverterStatus.NORMAL) for t in n.telemetry]) for i,n in enumerate(base.neighbors[:4])]
    v = analyze_grid_fault(s)
    assert v.neighbors_affected_simultaneously == 1
    assert v.simultaneity_ratio == .25
    assert v.cause.value == "LOCAL_OVERVOLTAGE_SENSITIVITY"


def test_common_cloud_is_not_local_fault(base):
    s = copy(base, inverter_telemetry=[copy(t, pv_power_kw=t.pv_power_kw*.5) for t in base.inverter_telemetry],
        neighbors=[copy(n, telemetry=[copy(t, pv_power_kw=t.pv_power_kw*.5) for t in n.telemetry]) for n in base.neighbors])
    assert analyze_grid_fault(s).cause.value == "NONE"


@pytest.mark.parametrize("kind", ["empty", "night", "sparse", "unordered", "duplicate", "gap"])
def test_incomplete_or_invalid_data_is_not_healthy(base, kind):
    s = day(base)
    tele = s.inverter_telemetry
    if kind == "empty": tele = []
    elif kind == "night": tele = tele[:60]
    elif kind == "sparse": tele = tele[::60]
    elif kind == "unordered": tele = tele[::-1]
    elif kind == "duplicate": tele = tele[:600]+[tele[599]]+tele[600:]
    else: tele = tele[:600]+tele[650:]
    v = analyze_grid_fault(s.model_copy(update={"inverter_telemetry":tele}) if kind == "empty"
                           else copy(s, inverter_telemetry=tele))
    assert v.cause.value == "INSUFFICIENT_DATA"
    assert v.severity.value == "INFO"
    assert not v.requires_technician_telegram_alert


def test_offline_alone_is_monitoring_uncertainty(base):
    s = day(base)
    s = copy(s, inverter_telemetry=[copy(t, status=InverterStatus.OFFLINE, pv_power_kw=0) for t in s.inverter_telemetry])
    assert analyze_grid_fault(s).cause.value == "MONITORING_UNCERTAIN"


@pytest.mark.parametrize("cadence", [1, 5])
def test_duration_energy_and_protective_derating(base, cadence):
    s = day(base, cadence=cadence, derating=True)
    v = analyze_grid_fault(s)
    assert v.actual_produced_today_kwh == 6
    assert v.lost_production_today_kwh == 6
    assert v.total_derating_minutes_today == 720
    assert sum(e.duration_minutes for e in v.events) == 720
    assert v.cause.value == "NONE"
    assert sum(e.lost_energy_kwh for e in v.events) == 6


@pytest.mark.parametrize("mode", list(BatteryMode))
def test_every_incompatible_battery_mode(mode):
    s = get_scenario_by_id("RO-TM-001")
    if mode == s.battery_intent.desired_mode: return
    v = analyze_battery(copy(s, battery_config=copy(s.battery_config, configured_mode=mode)))
    assert v.status.value == "MISCONFIGURED_MODE"
    assert mode.value in v.explanation_ro


def test_low_reserve_and_discharge_policy():
    s = get_scenario_by_id("RO-TM-001")
    cfg = copy(s.battery_config, configured_min_soc_pct=10)
    assert analyze_battery(copy(s, battery_config=cfg)).status.value == "MISCONFIGURED_SOC_RESERVE"
    intent = copy(s.battery_intent, evening_discharge_allowed=False)
    v = analyze_battery(copy(s, battery_config=cfg, battery_intent=intent))
    assert v.status.value == "MISCONFIGURED_DISCHARGE_POLICY"
    assert v.shiftable_evening_energy_kwh_per_day == 0
    assert not v.eligible_for_supplier_bonus_now


def test_engine_independent_of_demo_id():
    s = get_scenario_by_id("RO-TM-001")
    a = analyze_household(copy(s, household_id="NEW-HOUSEHOLD"))
    v = a.battery_verdict
    assert 0 < v.shiftable_evening_energy_kwh_per_day <= min(v.locked_capacity_kwh,
        v.evening_peak_grid_import_kwh_today, v.midday_grid_export_kwh_today)


def test_one_off_values_are_not_recurring_or_annualized():
    s = get_scenario_by_id("RO-TM-001")
    a = analyze_household(s)
    assert a.total_supplier_monthly_benefit_ron == a.battery_verdict.supplier_monthly_pzu_loss_ron
    assert a.total_supplier_one_off_benefit_ron == 450
    p = compute_portfolio_metrics([a])
    assert p.extrapolated_annual_supplier_savings_eur == pytest.approx(
        a.total_supplier_monthly_benefit_ron*12*25000/5.1, abs=.01)
    invoice = analyze_household(get_scenario_by_id("RO-BV-004"))
    assert invoice.total_customer_one_off_benefit_ron == 312.8
    assert invoice.total_customer_monthly_benefit_ron == round(invoice.grid_verdict.lost_value_customer_month_ron +
        invoice.battery_verdict.customer_monthly_grid_tax_loss_ron, 2)


def test_different_peers_within_one_event_are_not_simultaneous(base):
    s = day(base, trips=tuple(range(600, 610)))
    s.neighbors = [copy(n, telemetry=[copy(t,
        ac_voltage_v=251 if 600+i*5 <= t.minute_of_day < 605+i*5 else 230,
        status=InverterStatus.NORMAL) for t in n.telemetry]) for i,n in enumerate(base.neighbors[:4])]
    v = analyze_grid_fault(s)
    assert v.neighbors_affected_simultaneously == 1
    assert v.events[0].neighbors_over_250v_count == 1
    assert v.cause.value == "LOCAL_OVERVOLTAGE_SENSITIVITY"


def test_trip_duration_is_elapsed_time_at_five_minutes(base):
    v = analyze_grid_fault(day(base, cadence=5, trips=(600, 605)))
    assert v.total_trip_minutes_today == 10
    assert v.events[0].duration_minutes == 10
    assert v.events[0].end_time == "10:10"


def test_battery_energy_integrates_supported_cadence():
    s = get_scenario_by_id("RO-TM-001")
    s = copy(s, inverter_telemetry=[copy(t, grid_export_kw=2 if 600 <= t.minute_of_day < 960 else 0,
        grid_import_kw=2 if 1080 <= t.minute_of_day < 1320 else 0,
        battery_power_kw=-1 if 1080 <= t.minute_of_day < 1320 else 0) for t in s.inverter_telemetry])
    v = analyze_battery(s)
    coarse = analyze_battery(copy(s, inverter_telemetry=s.inverter_telemetry[::5]))
    for field in ("midday_grid_export_kwh_today", "evening_peak_grid_import_kwh_today",
                  "evening_battery_discharge_kwh_today"):
        assert getattr(v,field) == getattr(coarse,field)


def test_shiftability_respects_midday_charging_power():
    s = get_scenario_by_id("RO-TM-001")
    tele = [copy(t, grid_export_kw=100 if t.minute_of_day == 600 else 0,
                 grid_import_kw=10 if 1080 <= t.minute_of_day < 1320 else 0,
                 house_load_kw=10, battery_power_kw=0) for t in s.inverter_telemetry]
    v = analyze_battery(copy(s, inverter_telemetry=tele,
        battery_config=copy(s.battery_config, max_charge_discharge_kw=1)))
    assert v.shiftable_evening_energy_kwh_per_day <= .02


def test_sparse_data_cannot_verify_battery_delivery():
    s = get_scenario_by_id("RO-B-005")
    v = analyze_battery(copy(s, inverter_telemetry=s.inverter_telemetry[:60]))
    assert v.status.value == "INSUFFICIENT_DATA"
    assert not v.eligible_for_supplier_bonus_now
    assert not v.evening_delivery_verified_today


def test_missing_end_of_day_is_incomplete(base):
    s = day(base)
    assert analyze_grid_fault(copy(s, inverter_telemetry=s.inverter_telemetry[:1400])).cause.value == "INSUFFICIENT_DATA"


def test_offline_battery_telemetry_does_not_verify_delivery(base):
    s = copy(base, inverter_telemetry=[copy(t, status=InverterStatus.OFFLINE) for t in base.inverter_telemetry])
    v = analyze_battery(s)
    assert v.status.value == "INSUFFICIENT_DATA"
    assert not v.evening_delivery_verified_today and not v.eligible_for_supplier_bonus_now
