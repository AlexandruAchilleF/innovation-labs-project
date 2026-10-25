"""Curated demo stories: hand-checked monthly totals and invoices for the 5 classic households."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from sunproof.models import (
    MonthlyEnergySummary,
    ProsumerInvoice,
    SettlementRegime,
)
from sunproof.data.opcom_and_physics import (
    DAYS_IN_MONTH,
    MONTH_LABEL,
)


@dataclass(frozen=True)
class _StoryBilling:
    badge_ro: str
    monthly: MonthlyEnergySummary
    invoice: ProsumerInvoice


def _story_billing() -> Dict[str, _StoryBilling]:
    return {
        # Grid overvoltage on PT-04 Str. Soarelui + Huawei LUNA2000 locked at 80% reserve
        "RO-TM-001": _StoryBilling(
            badge_ro="Rețea (>253V cu echipamentele) + Baterie blocată 80%",
            monthly=MonthlyEnergySummary(
                month_label=MONTH_LABEL, days_in_month=DAYS_IN_MONTH,
                pvgis_expected_production_kwh=1140.0,
                inverter_total_production_kwh=915.0,  # Lost ~225 kWh due to midday grid trips
                inverter_direct_self_consumption_kwh=372.0,
                inverter_battery_charged_kwh=62.0,
                inverter_battery_discharged_kwh=58.0,  # Only ~1.9 kWh/day because 80% is locked!
                inverter_reported_export_kwh=543.0,
                inverter_reported_import_kwh=295.0,
                meter_verified_export_kwh=540.0,
                meter_verified_import_kwh=298.0,
                meter_previous_export_index=4120.0, meter_current_export_index=4660.0,
                meter_previous_import_index=2890.0, meter_current_import_index=3188.0,
            ),
            invoice=ProsumerInvoice(
                invoice_number="SP-2026-884120", issue_date="2026-09-02", billing_period="01.08.2026 – 31.08.2026",
                settlement_regime=SettlementRegime.QUANTITY_COMPENSATION_UNDER_200KW,
                billed_import_kwh=298.0, billed_export_kwh=540.0,
                is_export_index_missing_on_bill=False, is_import_estimated=False,
                compensated_Active_energy_kwh=298.0, net_billed_active_energy_kwh=0.0,
                carried_forward_export_credit_kwh=242.0,
                active_energy_supply_price_ron_kwh=0.68, grid_tariffs_and_taxes_ron_kwh=0.62,
                total_retail_import_price_ron_kwh=1.30,
                total_payable_ron=184.76,  # 298 kWh imported in the evening * 0.62 RON/kWh non-compensable grid taxes
                customer_question_ro="De ce mi se oprește invertorul în fiecare zi în orele de vârf ale producției solare și de ce mai plătesc 185 RON seara dacă am baterie de 10 kWh?",
            ),
        ),
        # Local fault in Corbeanca: 245V threshold + 2.5 mm² / 38 m AC cable, healthy street
        "RO-IF-002": _StoryBilling(
            badge_ro="Instalație Locală (Prag 245V + Cablu subțire)",
            monthly=MonthlyEnergySummary(
                month_label=MONTH_LABEL, days_in_month=DAYS_IN_MONTH,
                pvgis_expected_production_kwh=855.0,
                inverter_total_production_kwh=675.0,  # 180 kWh lost due to local trip
                inverter_direct_self_consumption_kwh=225.0,
                inverter_battery_charged_kwh=0.0, inverter_battery_discharged_kwh=0.0,
                inverter_reported_export_kwh=450.0, inverter_reported_import_kwh=260.0,
                meter_verified_export_kwh=448.0, meter_verified_import_kwh=262.0,
                meter_previous_export_index=1850.0, meter_current_export_index=2298.0,
                meter_previous_import_index=1420.0, meter_current_import_index=1682.0,
            ),
            invoice=ProsumerInvoice(
                invoice_number="SP-2026-889041", issue_date="2026-09-02", billing_period="01.08.2026 – 31.08.2026",
                settlement_regime=SettlementRegime.QUANTITY_COMPENSATION_UNDER_200KW,
                billed_import_kwh=262.0, billed_export_kwh=448.0,
                is_export_index_missing_on_bill=False, is_import_estimated=False,
                compensated_Active_energy_kwh=262.0, net_billed_active_energy_kwh=0.0,
                carried_forward_export_credit_kwh=186.0,
                active_energy_supply_price_ron_kwh=0.68, grid_tariffs_and_taxes_ron_kwh=0.62,
                total_retail_import_price_ron_kwh=1.30, total_payable_ron=162.44,
                customer_question_ro="Invertorul se oprește zilnic în orele de vârf ale producției solare cu eroare de supratensiune. Trimiteți distribuitorul să repare rețeaua!",
            ),
        ),
        # Cluj: BYD 15 kWh left in BACKUP_RESERVE at 85%
        "RO-CJ-003": _StoryBilling(
            badge_ro="Baterie 15 kWh în mod Backup (Pierdere PZU Seara)",
            monthly=MonthlyEnergySummary(
                month_label=MONTH_LABEL, days_in_month=DAYS_IN_MONTH,
                pvgis_expected_production_kwh=1420.0,
                inverter_total_production_kwh=1405.0,
                inverter_direct_self_consumption_kwh=433.0,
                inverter_battery_charged_kwh=18.0,   # Barely cycles because it sits at 85-100% in Backup mode
                inverter_battery_discharged_kwh=0.0,  # 0 kWh discharged in the evening!
                inverter_reported_export_kwh=972.0, inverter_reported_import_kwh=385.0,
                meter_verified_export_kwh=970.0, meter_verified_import_kwh=388.0,
                meter_previous_export_index=6100.0, meter_current_export_index=7070.0,
                meter_previous_import_index=3200.0, meter_current_import_index=3588.0,
            ),
            invoice=ProsumerInvoice(
                invoice_number="SP-2026-891205", issue_date="2026-09-02", billing_period="01.08.2026 – 31.08.2026",
                settlement_regime=SettlementRegime.QUANTITY_COMPENSATION_UNDER_200KW,
                billed_import_kwh=388.0, billed_export_kwh=970.0,
                is_export_index_missing_on_bill=False, is_import_estimated=False,
                compensated_Active_energy_kwh=388.0, net_billed_active_energy_kwh=0.0,
                carried_forward_export_credit_kwh=582.0,
                active_energy_supply_price_ron_kwh=0.68, grid_tariffs_and_taxes_ron_kwh=0.62,
                total_retail_import_price_ron_kwh=1.30,
                total_payable_ron=240.56,  # 388 kWh evening/night import * 0.62 RON/kWh non-compensable tariffs
                customer_question_ro="Am baterie de 15 kWh, de ce am importat 388 kWh din rețea și de ce nu am primit bonusul de stocare promis de furnizor?",
            ),
        ),
        # Brașov: distributor's 2.8.0 export index missing at billing time
        "RO-BV-004": _StoryBilling(
            badge_ro="Factură Greșită (Lipsește Indexul de Export 640 kWh)",
            monthly=MonthlyEnergySummary(
                month_label=MONTH_LABEL, days_in_month=DAYS_IN_MONTH,
                pvgis_expected_production_kwh=1340.0,
                inverter_total_production_kwh=1320.0,
                inverter_direct_self_consumption_kwh=675.0,
                inverter_battery_charged_kwh=225.0, inverter_battery_discharged_kwh=165.0,
                inverter_reported_export_kwh=645.0, inverter_reported_import_kwh=456.0,
                meter_verified_export_kwh=640.0,  # Contorul la 15 min confirmă 640 kWh export!
                meter_verified_import_kwh=460.0,
                meter_previous_export_index=8200.0, meter_current_export_index=8840.0,
                meter_previous_import_index=5100.0, meter_current_import_index=5560.0,
            ),
            invoice=ProsumerInvoice(
                invoice_number="SP-2026-895410", issue_date="2026-09-02", billing_period="01.08.2026 – 31.08.2026",
                settlement_regime=SettlementRegime.QUANTITY_COMPENSATION_UNDER_200KW,
                billed_import_kwh=460.0,
                billed_export_kwh=0.0,  # BUG PE FACTURĂ: Indexul de export 2.8.0 (640 kWh) lipsește!
                is_export_index_missing_on_bill=True, is_import_estimated=False,
                compensated_Active_energy_kwh=0.0, net_billed_active_energy_kwh=460.0,
                carried_forward_export_credit_kwh=0.0,
                active_energy_supply_price_ron_kwh=0.68, grid_tariffs_and_taxes_ron_kwh=0.62,
                total_retail_import_price_ron_kwh=1.30,
                total_payable_ron=598.00,  # 460 * 1.30 RON instead of 460 * 0.62 = 285.20 RON!
                customer_question_ro="Panourile mele au produs 1.320 kWh în august, dar mi-ați emis factură de 598 RON cu 0 kWh energie injectată! Fac reclamație la ANRE!",
            ),
        ),
        # București: invoice is right, customer confuses PV production with grid export
        "RO-B-005": _StoryBilling(
            badge_ro="Factură Corectă Explicată (Autoconsum 60% + Sistem Optim)",
            monthly=MonthlyEnergySummary(
                month_label=MONTH_LABEL, days_in_month=DAYS_IN_MONTH,
                pvgis_expected_production_kwh=795.0,
                inverter_total_production_kwh=780.0,
                inverter_direct_self_consumption_kwh=470.0,  # 60.3% consumed inside the house + via battery!
                inverter_battery_charged_kwh=175.0, inverter_battery_discharged_kwh=162.0,
                inverter_reported_export_kwh=310.0, inverter_reported_import_kwh=338.0,
                meter_verified_export_kwh=310.0, meter_verified_import_kwh=340.0,
                meter_previous_export_index=2400.0, meter_current_export_index=2710.0,
                meter_previous_import_index=1900.0, meter_current_import_index=2240.0,
            ),
            # Active energy: 340 imported - 310 exported = 30 kWh * 0.68 = 20.40 RON
            # Regulated grid tariffs & taxes on 340 kWh imported = 340 * 0.56 = 190.40 RON -> Total = 210.80 RON
            invoice=ProsumerInvoice(
                invoice_number="SP-2026-897003", issue_date="2026-09-02", billing_period="01.08.2026 – 31.08.2026",
                settlement_regime=SettlementRegime.QUANTITY_COMPENSATION_UNDER_200KW,
                billed_import_kwh=340.0, billed_export_kwh=310.0,
                is_export_index_missing_on_bill=False, is_import_estimated=False,
                compensated_Active_energy_kwh=310.0, net_billed_active_energy_kwh=30.0,
                carried_forward_export_credit_kwh=0.0,
                active_energy_supply_price_ron_kwh=0.68, grid_tariffs_and_taxes_ron_kwh=0.56,
                total_retail_import_price_ron_kwh=1.24, total_payable_ron=210.80,
                customer_question_ro="Aplicația panourilor zice că am produs 780 kWh, dar pe factură scrie doar 310 kWh injectați în rețea și îmi cereți 210,80 RON! Unde sunt restul de 470 kWh?",
            ),
        ),
    }


STORY_HOUSEHOLD_IDS = ["RO-TM-001", "RO-IF-002", "RO-CJ-003", "RO-BV-004", "RO-B-005"]
