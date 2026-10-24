"""Ground-truth battery status and generated (non-curated) HouseholdScenario builders."""

from __future__ import annotations

import hashlib
from typing import List, Tuple

from sunproof.grid import (
    HouseTrace,
    NeighborhoodSimulation,
    truth_grid_cause,
)
from sunproof.models import (
    BatteryMode,
    BatteryVerdictStatus,
    BillingVerdictStatus,
    GridFaultCause,
    GridHouse,
    GridPhase,
    HouseholdScenario,
    InstallationFault,
    MonthlyEnergySummary,
    NeighborNode,
    Neighborhood,
    OpcomHourlyPrice,
    ProsumerInvoice,
    SettlementRegime,
)
from sunproof.data.archetypes import (
    _story_billing,
)
from sunproof.data.opcom_and_physics import (
    DATE_ANALYZED,
    DAYS_IN_MONTH,
    GRID_TARIFFS_RON_KWH,
    MONTH_IMPORT_FACTOR,
    MONTH_LABEL,
    MONTH_PV_FACTOR,
    SUPPLY_PRICE_RON_KWH,
    _inverter_samples,
    _meter_intervals,
    _neighbor_node,
    build_opcom_pzu_august_curve,
)


def _truth_battery_status(house: GridHouse) -> BatteryVerdictStatus:
    cfg = house.battery_config
    intent = house.client.battery_intent if house.client else None
    if not cfg.has_battery or intent is None:
        return BatteryVerdictStatus.NO_BATTERY
    if cfg.configured_mode == BatteryMode.BACKUP_RESERVE and intent.desired_mode != BatteryMode.BACKUP_RESERVE:
        return BatteryVerdictStatus.MISCONFIGURED_MODE
    if cfg.configured_min_soc_pct > intent.desired_min_soc_pct + 10.0:
        return BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE
    return BatteryVerdictStatus.OPTIMAL

def _stable_int(text: str, lo: int, hi: int) -> int:
    digest = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:12], 16)
    return lo + digest % (hi - lo + 1)


def _generated_monthly_and_invoice(
    trace: HouseTrace,
    county_code: str,
) -> Tuple[MonthlyEnergySummary, ProsumerInvoice]:
    """Monthly totals scaled from the simulated day, and the invoice the supplier issued (maybe wrongly)."""
    h = trace.house
    client = h.client
    dt = 1.0 / 60.0
    produced = sum(trace.pv_kw) * dt
    expected = sum(trace.expected_kw) * dt
    export = sum(trace.export_kw) * dt
    imported = sum(trace.import_kw) * dt
    charged = sum(b for b in trace.battery_kw if b > 0) * dt
    discharged = sum(-b for b in trace.battery_kw if b < 0) * dt

    inv_prod = round(produced * MONTH_PV_FACTOR)
    inv_export = min(inv_prod, round(export * MONTH_PV_FACTOR))
    inv_import = round(imported * MONTH_IMPORT_FACTOR)
    meter_export = round(inv_export * 0.996)
    meter_import = round(inv_import * 1.006) + 1
    prev_exp = float(_stable_int(f"exp-{client.household_id}", 900, 9000))
    prev_imp = float(_stable_int(f"imp-{client.household_id}", 1200, 9000))

    monthly = MonthlyEnergySummary(
        month_label=MONTH_LABEL,
        days_in_month=DAYS_IN_MONTH,
        pvgis_expected_production_kwh=float(round(expected * MONTH_PV_FACTOR)),
        inverter_total_production_kwh=float(inv_prod),
        inverter_direct_self_consumption_kwh=float(inv_prod - inv_export),
        inverter_battery_charged_kwh=float(round(charged * MONTH_PV_FACTOR)),
        inverter_battery_discharged_kwh=float(round(discharged * MONTH_PV_FACTOR)),
        inverter_reported_export_kwh=float(inv_export),
        inverter_reported_import_kwh=float(inv_import),
        meter_verified_export_kwh=float(meter_export),
        meter_verified_import_kwh=float(meter_import),
        meter_previous_export_index=prev_exp,
        meter_current_export_index=prev_exp + meter_export,
        meter_previous_import_index=prev_imp,
        meter_current_import_index=prev_imp + meter_import,
    )

    grid_tariff = GRID_TARIFFS_RON_KWH.get(county_code, 0.60)
    anomaly = client.billing_anomaly
    billed_import = float(meter_import)
    billed_export = float(meter_export)
    missing_export = anomaly == BillingVerdictStatus.MISSING_EXPORT_INDEX
    estimated = anomaly == BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE
    if missing_export:
        billed_export = 0.0
    if estimated:
        billed_import = float(round(meter_import * 1.42))
    compensated = min(billed_import, billed_export)
    net_billed = max(0.0, billed_import - billed_export)
    carried = max(0.0, billed_export - billed_import)
    total = round(net_billed * SUPPLY_PRICE_RON_KWH + billed_import * grid_tariff, 2)

    invoice = ProsumerInvoice(
        invoice_number=f"SP-2026-{_stable_int('inv-' + client.household_id, 880000, 899999)}",
        issue_date="2026-09-02",
        billing_period="01.08.2026 – 31.08.2026",
        settlement_regime=SettlementRegime.QUANTITY_COMPENSATION_UNDER_200KW,
        billed_import_kwh=billed_import,
        billed_export_kwh=billed_export,
        is_export_index_missing_on_bill=missing_export,
        is_import_estimated=estimated,
        compensated_Active_energy_kwh=compensated,
        net_billed_active_energy_kwh=net_billed,
        carried_forward_export_credit_kwh=carried,
        active_energy_supply_price_ron_kwh=SUPPLY_PRICE_RON_KWH,
        grid_tariffs_and_taxes_ron_kwh=grid_tariff,
        total_retail_import_price_ron_kwh=round(SUPPLY_PRICE_RON_KWH + grid_tariff, 2),
        total_payable_ron=total,
        customer_question_ro=_customer_question(trace, total, billed_export),
    )
    return monthly, invoice


def _customer_question(trace: HouseTrace, total_ron: float, billed_export: float) -> str:
    h = trace.house
    anomaly = h.client.billing_anomaly
    battery = _truth_battery_status(h)
    if anomaly == BillingVerdictStatus.MISSING_EXPORT_INDEX:
        return (f"Pe factură scrie 0 kWh energie injectată și am de plată {total_ron:.2f} RON, deși panourile au "
                "produs toată luna. E o greșeală?")
    if anomaly == BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE:
        return "Mi-ați facturat mai mult import decât arată contorul. De unde vine diferența?"
    if h.fault == InstallationFault.INVERTER_DEVICE_FAULT:
        return "Aplicația invertorului nu mai arată producție de câteva zile și factura a crescut. Ce s-a întâmplat?"
    if trace.trip_events > 0:
        return "De ce se oprește invertorul în fiecare zi la prânz? Pierd producție exact când e soare."
    if battery in (BatteryVerdictStatus.MISCONFIGURED_MODE, BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE):
        return "Am baterie, dar tot iau mult curent din rețea seara. De ce nu mă ajută bateria?"
    if h.fault in (InstallationFault.STRING_FAULT, InstallationFault.SOILING_DEGRADATION):
        return "Am impresia că panourile produc mai puțin decât la montaj. E normal?"
    return "Vreau să înțeleg factura: cât am produs, cât am consumat și de ce mai am ceva de plată?"


def _generated_badge(trace: HouseTrace) -> str:
    h = trace.house
    cause = truth_grid_cause(trace)
    parts: List[str] = []
    if cause == GridFaultCause.GRID_OVERVOLTAGE:
        parts.append(f"Rețea: supratensiune {max(trace.pcc_voltage_v):.0f}V ({trace.trip_events} opriri)")
    elif cause == GridFaultCause.LOCAL_OVERVOLTAGE_SENSITIVITY:
        parts.append("Instalație: prag de protecție greșit")
    elif cause == GridFaultCause.LOCAL_CABLE_IMPEDANCE:
        parts.append("Instalație: cablu AC subdimensionat")
    elif h.fault == InstallationFault.INVERTER_DEVICE_FAULT:
        parts.append("Invertor oprit în defect")
    elif h.fault == InstallationFault.STRING_FAULT:
        parts.append("Producție -50% (string întrerupt)")
    elif h.fault == InstallationFault.SOILING_DEGRADATION:
        parts.append("Producție -18% (murdărie / degradare)")
    battery = _truth_battery_status(h)
    if battery == BatteryVerdictStatus.MISCONFIGURED_MODE:
        parts.append("Baterie în mod Backup")
    elif battery == BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE:
        parts.append(f"Baterie blocată {h.battery_config.configured_min_soc_pct:.0f}%")
    anomaly = h.client.billing_anomaly
    if anomaly == BillingVerdictStatus.MISSING_EXPORT_INDEX:
        parts.append("Factură fără index de export")
    elif anomaly == BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE:
        parts.append("Factură pe index estimat")
    return " + ".join(parts) if parts else "Sistem în parametri"


def _household_scenario(
    nb: Neighborhood,
    sim: NeighborhoodSimulation,
    trace: HouseTrace,
    neighbors: List[NeighborNode],
    opcom_prices: List[OpcomHourlyPrice],
) -> HouseholdScenario:
    h = trace.house
    client = h.client
    feeder = next(f for f in nb.feeders if f.feeder_id == h.feeder_id)
    story = _story_billing().get(client.household_id)
    if story is not None:
        badge, monthly, invoice = story.badge_ro, story.monthly, story.invoice
    else:
        monthly, invoice = _generated_monthly_and_invoice(trace, nb.county_code)
        badge = _generated_badge(trace)

    return HouseholdScenario(
        household_id=client.household_id,
        scenario_badge_ro=badge,
        customer_name=client.customer_name,
        city=nb.city,
        county=nb.county,
        street_address=client.street_address,
        pod_code=client.pod_code,
        distribution_operator=nb.transformer.distribution_operator,
        transformer_id=f"{nb.transformer.name} · plecarea {h.feeder_id.split('-')[-1]} ({feeder.street_name})",
        distance_from_transformer_m=h.distance_from_transformer_m,
        connection_phase="3P (Trifazat 400V)" if h.phase == GridPhase.THREE_PHASE else f"{h.phase.value} (Monofazat 230V)",
        neighborhood_id=nb.neighborhood_id,
        feeder_id=h.feeder_id,
        inverter_brand=h.inverter_brand,
        inverter_model=h.inverter_model,
        installed_pv_kw=h.installed_pv_kw,
        configured_overvoltage_trip_v=h.trip_threshold_v,
        internal_ac_cable_section_mm2=h.internal_ac_cable_section_mm2,
        internal_ac_cable_length_m=h.internal_ac_cable_length_m,
        date_analyzed=DATE_ANALYZED,
        battery_intent=client.battery_intent,
        battery_config=h.battery_config,
        monthly_summary=monthly,
        invoice=invoice,
        inverter_telemetry=_inverter_samples(trace),
        neighbors=neighbors,
        smart_meter_15m=_meter_intervals(trace),
        opcom_pzu_hourly=opcom_prices,
    )


def _scenarios_for_neighborhood(nb: Neighborhood, sim: NeighborhoodSimulation) -> List[HouseholdScenario]:
    opcom_prices = build_opcom_pzu_august_curve()
    street_by_feeder = {f.feeder_id: f.street_name for f in nb.feeders}
    pt_code = nb.transformer.transformer_id.replace("-", "")
    monitored = [h for h in nb.houses if h.monitored]
    shared_consent = [h for h in monitored if h.client.consent_anonymized_neighbor_sharing]
    neighbor_nodes = {
        h.house_id: _neighbor_node(sim.traces[h.house_id], f"{pt_code}-N{k + 1:02d}", street_by_feeder)
        for k, h in enumerate(sorted(shared_consent, key=lambda x: (x.feeder_id, x.distance_from_transformer_m)))
    }

    scenarios = []
    for h in monitored:
        own_feeder = [n for hid, n in neighbor_nodes.items() if hid != h.house_id and n.feeder_id == h.feeder_id]
        other = [n for hid, n in neighbor_nodes.items() if hid != h.house_id and n.feeder_id != h.feeder_id]
        own_feeder.sort(key=lambda n: abs(n.distance_from_transformer_m - h.distance_from_transformer_m))
        other.sort(key=lambda n: n.distance_from_transformer_m)
        scenarios.append(_household_scenario(nb, sim, sim.traces[h.house_id], own_feeder + other, opcom_prices))
    return scenarios
